package com.hrms.application.knowledge.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.knowledge.dto.FluenceChatRequest;
import com.hrms.api.knowledge.dto.FluenceChatSseEvent;
import com.hrms.application.ai.service.LlmStreamingService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.ai.ChatbotConversation;
import com.hrms.infrastructure.ai.repository.ChatbotConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Orchestrates the Fluence AI Chat RAG pipeline:
 * 1. Retrieve relevant content from wiki/blogs/templates
 * 2. Build a grounded prompt with context
 * 3. Stream the LLM response via SSE
 * 4. Send source citations
 * 5. Persist conversation for audit
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceChatService {

    private final FluenceContentRetriever contentRetriever;
    private final LlmStreamingService llmStreamingService;
    private final ChatbotConversationRepository conversationRepository;
    private final ObjectMapper objectMapper;

    private static final long SSE_TIMEOUT = 120_000L; // 2 minutes

    private static final String SYSTEM_PROMPT = """
            You are NU-Fluence AI — think of yourself as a helpful coworker who knows the company knowledge base really well.

            Personality:
            - Talk like a real person, not a robot. Be warm, casual, and natural.
            - Use short sentences. No corporate jargon. No bullet points unless truly needed.
            - Match the user's energy — if they're casual, be casual. If they ask a detailed question, give a thoughtful answer.
            - It's okay to use phrases like "hmm", "sure thing", "good question", "let me check" etc.
            - Use emojis sparingly (one per message max, only if it feels natural).

            How to respond:
            - Greetings → Chat back naturally. "Hey! What's up?" or "Hi there, how can I help?" Keep it short.
            - Small talk → Engage briefly, then gently steer toward how you can help.
            - Knowledge questions → Answer using the context provided below. Mention document titles when referencing them.
            - No relevant context → Be honest. "I don't have anything on that in the knowledge base yet. You might want to check with HR directly."
            - Follow-up questions → Remember the conversation. Build on previous answers naturally.

            LINKING TO DOCUMENTS — THIS IS CRITICAL:
            - Each document in the context below has a URL. ALWAYS include the link when you mention or reference a document.
            - Format links as markdown: [Document Title](url)
            - When the user asks for a link, provide it immediately from the context. You DO have the links.
            - Example: "Check out [Leave Policy](/fluence/wiki/abc123) for the details."
            - If a user asks "link?" or "link for the doc" — just give them the markdown link, no extra explanation needed.

            Important:
            - Never make up facts. If you don't know, say so simply.
            - Keep most responses to 1-4 sentences. Only go longer if the question genuinely needs it.
            - You're not a search engine — you're a colleague who happens to have read all the docs.
            """;

    /**
     * Handle a chat message: retrieve context, stream LLM response, send sources.
     * Returns an SseEmitter that the controller writes to the HTTP response.
     */
    public SseEmitter handleChatMessage(FluenceChatRequest request) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        // Run the pipeline in a background thread (SseEmitter is async)
        CompletableFuture.runAsync(() -> {
            try {
                executePipeline(emitter, request, tenantId, userId);
            } catch (Exception e) { // Intentional broad catch — AI/search integration error boundary
                log.error("Chat pipeline error for tenant {}: {}", tenantId, e.getMessage(), e);
                sendErrorEvent(emitter, "An unexpected error occurred. Please try again.");
            }
        });

        // Cleanup handlers
        emitter.onTimeout(() -> log.debug("SSE emitter timed out"));
        emitter.onCompletion(() -> log.debug("SSE emitter completed"));
        emitter.onError(ex -> log.warn("SSE emitter error: {}", ex.getMessage()));

        return emitter;
    }

    private void executePipeline(
            SseEmitter emitter,
            FluenceChatRequest request,
            UUID tenantId,
            UUID userId
    ) {
        try {
            // Set tenant context on this async thread (ThreadLocal doesn't propagate)
            TenantContext.setCurrentTenant(tenantId);

            // 1. Retrieve relevant content chunks (broad ILIKE search for high recall)
            List<FluenceContentRetriever.ContentChunk> chunks;
            try {
                chunks = contentRetriever.retrieveRelevantContent(request.getMessage());
            } catch (Exception e) { // Intentional broad catch — AI/search integration error boundary
                log.error("Content retrieval failed: {}", e.getMessage());
                chunks = Collections.emptyList();
            }

            log.info("RAG retrieved {} chunks for message: '{}'. Chunks: {}",
                    chunks.size(), request.getMessage(),
                    chunks.stream()
                            .map(c -> c.getTitle() + " (" + c.getType() + ")")
                            .collect(Collectors.joining(", ")));

            // 2. Build LLM messages with RAG context
            List<Map<String, String>> llmMessages = buildLlmMessages(request, chunks);

            // 3. Stream LLM response
            final List<FluenceContentRetriever.ContentChunk> finalChunks = chunks;
            StringBuilder fullResponse = new StringBuilder();

            llmStreamingService.streamChatCompletion(
                    llmMessages,
                    // onToken
                    token -> {
                        fullResponse.append(token);
                        sendTokenEvent(emitter, token);
                    },
                    // onError
                    error -> sendErrorEvent(emitter, error),
                    // onDone
                    () -> {
                        try {
                            // 4. Send source citations
                            sendSourcesEvent(emitter, finalChunks);

                            // 5. Persist conversation
                            UUID conversationId = persistConversation(
                                    request, fullResponse.toString(), tenantId, userId
                            );

                            // 6. Send done event
                            sendDoneEvent(emitter, conversationId);
                        } catch (Exception e) { // Intentional broad catch — AI/search integration error boundary
                            log.error("Error in post-stream processing: {}", e.getMessage());
                        } finally {
                            safeComplete(emitter);
                        }
                    }
            );
        } catch (Exception e) { // Intentional broad catch — AI/search integration error boundary
            log.error("Pipeline execution failed for tenant {}: {}", tenantId, e.getMessage(), e);
            sendErrorEvent(emitter, "An unexpected error occurred. Please try again.");
            safeComplete(emitter);
        } finally {
            TenantContext.clear();
        }
    }

    /** Safely complete the SSE emitter, ignoring errors if already completed/timed out */
    private void safeComplete(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (Exception e) { // Intentional broad catch — AI/search integration error boundary
            // Emitter may already be completed or timed out — this is expected on client disconnect
            log.debug("safeComplete: emitter completion suppressed (likely already closed): {}", e.getMessage());
        }
    }

    /**
     * Build the LLM message array with system prompt, RAG context, history, and user query.
     */
    private List<Map<String, String>> buildLlmMessages(
            FluenceChatRequest request,
            List<FluenceContentRetriever.ContentChunk> chunks
    ) {
        List<Map<String, String>> messages = new ArrayList<>();

        // System prompt
        String contextBlock = chunks.isEmpty()
                ? "No relevant content was found in the knowledge base."
                : chunks.stream()
                        .map(FluenceContentRetriever.ContentChunk::toPromptBlock)
                        .collect(Collectors.joining("\n---\n"));

        String systemMessage = SYSTEM_PROMPT + "\n\n## Knowledge Base Context:\n\n" + contextBlock;
        messages.add(Map.of("role", "system", "content", systemMessage));

        // Conversation history (if any)
        if (request.getHistory() != null) {
            for (FluenceChatRequest.ChatHistoryEntry entry : request.getHistory()) {
                // Only include the last few turns to stay within context window
                if ("user".equals(entry.getRole()) || "assistant".equals(entry.getRole())) {
                    messages.add(Map.of("role", entry.getRole(), "content", entry.getContent()));
                }
            }
        }

        // Current user message (last in history, but add explicitly for clarity)
        // Only add if not already the last history entry
        boolean lastHistoryIsCurrentMessage = request.getHistory() != null
                && !request.getHistory().isEmpty()
                && request.getMessage().equals(
                        request.getHistory().get(request.getHistory().size() - 1).getContent()
                );

        if (!lastHistoryIsCurrentMessage) {
            messages.add(Map.of("role", "user", "content", request.getMessage()));
        }

        return messages;
    }

    /**
     * Persist the conversation to the database for audit and history.
     * Note: Single save() call — JPA repository provides its own transaction.
     * Spring AOP cannot intercept private/self-invoked methods, so @Transactional was removed.
     */
    private UUID persistConversation(
            FluenceChatRequest request,
            String response,
            UUID tenantId,
            UUID userId
    ) {
        try {
            UUID conversationId = request.getConversationId() != null
                    ? request.getConversationId()
                    : UUID.randomUUID();

            // Build conversation history JSON
            List<Map<String, String>> history = new ArrayList<>();
            if (request.getHistory() != null) {
                for (FluenceChatRequest.ChatHistoryEntry entry : request.getHistory()) {
                    history.add(Map.of("role", entry.getRole(), "content", entry.getContent()));
                }
            }
            history.add(Map.of("role", "user", "content", request.getMessage()));
            history.add(Map.of("role", "assistant", "content", response));

            String historyJson = objectMapper.writeValueAsString(history);

            ChatbotConversation conversation = ChatbotConversation.builder()
                    .id(conversationId)
                    .tenantId(tenantId)
                    .userId(userId)
                    .sessionId(conversationId) // Use same ID as session for now
                    .conversationHistory(historyJson)
                    .intent("fluence_chat")
                    .status(ChatbotConversation.ConversationStatus.ACTIVE)
                    .resolved(false)
                    .wasEscalated(false)
                    .build();

            conversationRepository.save(conversation);
            log.debug("Persisted conversation {}", conversationId);
            return conversationId;

        } catch (Exception e) { // Intentional broad catch — AI/search integration error boundary
            log.error("Failed to persist conversation: {}", e.getMessage());
            return UUID.randomUUID();
        }
    }

    // ─── SSE event helpers ───────────────────────────────────────────────

    private void sendTokenEvent(SseEmitter emitter, String token) {
        try {
            FluenceChatSseEvent.Token event = FluenceChatSseEvent.Token.builder()
                    .content(token)
                    .build();
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(objectMapper.writeValueAsString(event)));
        } catch (IOException e) {
            log.trace("Failed to send token event (client may have disconnected)");
        }
    }

    private void sendSourcesEvent(SseEmitter emitter, List<FluenceContentRetriever.ContentChunk> chunks) {
        if (chunks.isEmpty()) return;
        try {
            List<FluenceChatSseEvent.SourceItem> sourceItems = chunks.stream()
                    .map(chunk -> FluenceChatSseEvent.SourceItem.builder()
                            .id(chunk.getId())
                            .type(chunk.getType())
                            .title(chunk.getTitle())
                            .url(chunk.getUrl())
                            .excerpt(chunk.getContent().length() > 100
                                    ? chunk.getContent().substring(0, 100) + "..."
                                    : chunk.getContent())
                            .build())
                    .toList();

            FluenceChatSseEvent.Sources event = FluenceChatSseEvent.Sources.builder()
                    .sources(sourceItems)
                    .build();
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(objectMapper.writeValueAsString(event)));
        } catch (IOException e) {
            log.trace("Failed to send sources event");
        }
    }

    private void sendDoneEvent(SseEmitter emitter, UUID conversationId) {
        try {
            FluenceChatSseEvent.Done event = FluenceChatSseEvent.Done.builder()
                    .conversationId(conversationId)
                    .build();
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(objectMapper.writeValueAsString(event)));
        } catch (IOException e) {
            log.trace("Failed to send done event");
        }
    }

    private void sendErrorEvent(SseEmitter emitter, String message) {
        try {
            FluenceChatSseEvent.Error event = FluenceChatSseEvent.Error.builder()
                    .message(message)
                    .build();
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(objectMapper.writeValueAsString(event)));
            emitter.complete();
        } catch (IOException e) {
            log.trace("Failed to send error event");
        }
    }
}
