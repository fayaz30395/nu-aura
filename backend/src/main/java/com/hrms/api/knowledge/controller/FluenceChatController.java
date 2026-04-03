package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.FluenceChatRequest;
import com.hrms.application.knowledge.service.FluenceChatService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE streaming endpoint for the NU-Fluence AI Chat.
 * <p>
 * The client sends a POST with the user's question and conversation history.
 * The server streams back SSE events: token → sources → done.
 * <p>
 * Authentication is cookie-based (same as all other endpoints).
 * Tenant context is resolved from the X-Tenant-ID header by the filter chain.
 */
@RestController
@RequestMapping("/api/v1/fluence/chat")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fluence AI Chat", description = "AI-powered Q&A over NU-Fluence knowledge base")
public class FluenceChatController {

    private final FluenceChatService fluenceChatService;

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Send a chat message and receive a streaming AI response")
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public SseEmitter chat(
            @Valid @RequestBody FluenceChatRequest request,
            HttpServletResponse response
    ) {
        log.info("Fluence chat request: {} chars, conversationId={}",
                request.getMessage().length(),
                request.getConversationId());

        // SSE headers — prevent proxy/browser buffering so tokens stream in real-time
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no"); // Nginx
        response.setHeader("Connection", "keep-alive");

        return fluenceChatService.handleChatMessage(request);
    }
}
