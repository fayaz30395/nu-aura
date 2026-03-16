package com.hrms.api.knowledge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Request DTO for the Fluence AI Chat endpoint.
 * Carries the user's message and conversation context.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FluenceChatRequest {

    @NotBlank(message = "Message cannot be blank")
    @Size(max = 4000, message = "Message must be under 4000 characters")
    private String message;

    /** Optional conversation ID for multi-turn context */
    private UUID conversationId;

    /** Previous messages in the conversation (for multi-turn) */
    private List<ChatHistoryEntry> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatHistoryEntry {
        private String role;   // "user" or "assistant"
        private String content;
    }
}
