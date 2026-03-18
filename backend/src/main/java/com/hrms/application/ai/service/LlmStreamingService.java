package com.hrms.application.ai.service;

import JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Low-level LLM streaming service.
 * Uses raw HttpURLConnection to stream tokens from the OpenAI-compatible API
 * without requiring Spring WebFlux / WebClient dependency.
 *
 * Supports any OpenAI-compatible endpoint (OpenAI, Azure OpenAI, Ollama, etc.)
 * by configuring ai.openai.base-url in application.yml.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlmStreamingService {

    private final ObjectMapper objectMapper;

    @Value("${ai.openai.api-key:}")
    private String apiKey;

    @Value("${ai.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String model;

    @Value("${ai.fluence-chat.max-tokens:2000}")
    private int maxTokens;

    @Value("${ai.fluence-chat.temperature:0.4}")
    private double temperature;

    /**
     * Stream a chat completion from the LLM.
     *
     * @param messages  OpenAI-format messages list: [{role, content}, ...]
     * @param onToken   Called with each streamed content token
     * @param onError   Called if an error occurs during streaming
     * @param onDone    Called when the stream is complete
     */
    public void streamChatCompletion(
            List<Map<String, String>> messages,
            Consumer<String> onToken,
            Consumer<String> onError,
            Runnable onDone
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("LLM API key not configured — returning mock response");
            streamMockResponse(onToken, onDone);
            return;
        }

        HttpURLConnection connection = null;
        try {
            // Build request body
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", messages,
                    "stream", true,
                    "temperature", temperature,
                    "max_tokens", maxTokens
            );
            String jsonBody = objectMapper.writeValueAsString(requestBody);

            // Open connection
            URI uri = URI.create(baseUrl + "/chat/completions");
            connection = (HttpURLConnection) uri.toURL().openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setRequestProperty("Accept", "text/event-stream");
            connection.setDoOutput(true);
            connection.setConnectTimeout(30_000);
            connection.setReadTimeout(120_000);

            // Send request
            try (OutputStream os = connection.getOutputStream()) {
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            if (status != 200) {
                String errorBody = new String(connection.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                log.error("LLM API returned {}: {}", status, errorBody);
                onError.accept("LLM API error: " + status);
                return;
            }

            // Read SSE stream
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isBlank()) continue;
                    if (!line.startsWith("data:")) continue;

                    String data = line.substring(5).trim();
                    if ("[DONE]".equals(data)) break;

                    try {
                        JsonNode node = objectMapper.readTree(data);
                        JsonNode delta = node.path("choices").path(0).path("delta").path("content");
                        if (!delta.isMissingNode() && !delta.isNull()) {
                            onToken.accept(delta.asText());
                        }
                    } catch (JsonProcessingException e) {
                        log.trace("Skipping malformed SSE line: {}", line);
                    }
                }
            }

            onDone.run();

        } catch (java.io.IOException | InterruptedException e) {
            // Intentional broad catch — LLM streaming involves network I/O and thread interruption
            log.error("Error streaming from LLM: {}", e.getMessage(), e);
            onError.accept("Streaming error: " + e.getMessage());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    /**
     * Mock streaming response when API key is not configured (dev mode).
     */
    private void streamMockResponse(Consumer<String> onToken, Runnable onDone) {
        String mockResponse = "I found some relevant information in your knowledge base. " +
                "Based on the wiki pages and articles I've reviewed, here's a summary of what I found. " +
                "Please note this is a mock response — configure your AI API key to enable real answers.";

        // Simulate token-by-token streaming
        for (String word : mockResponse.split("(?<=\\s)")) {
            onToken.accept(word);
            try {
                Thread.sleep(30);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        onDone.run();
    }
}
