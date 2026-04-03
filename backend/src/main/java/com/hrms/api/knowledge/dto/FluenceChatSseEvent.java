package com.hrms.api.knowledge.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * SSE event payloads for the Fluence AI Chat stream.
 * The frontend receives these as `data: {...}` lines.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FluenceChatSseEvent {

    private FluenceChatSseEvent() {
    } // static factory only

    // ─── Token event ─────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Token {
        @Builder.Default
        private String type = "token";
        private String content;
    }

    // ─── Sources event ───────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Sources {
        @Builder.Default
        private String type = "sources";
        private List<SourceItem> sources;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceItem {
        private String id;
        private String type;  // "wiki", "blog", "template"
        private String title;
        private String url;
        private String excerpt;
    }

    // ─── Done event ──────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Done {
        @Builder.Default
        private String type = "done";
        private UUID conversationId;
    }

    // ─── Error event ─────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Error {
        @Builder.Default
        private String type = "error";
        private String message;
    }
}
