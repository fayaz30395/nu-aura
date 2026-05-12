package com.nulogic.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.knowledge.dto.FluenceChatRequest;
import com.nulogic.application.knowledge.service.FluenceChatService;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.TenantFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

@WebMvcTest(FluenceChatController.class)
@ContextConfiguration(classes = {FluenceChatController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@ActiveProfiles("test")
@DisplayName("FluenceChatController Unit Tests")
class FluenceChatControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private FluenceChatService fluenceChatService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @Nested
    @DisplayName("Chat Endpoint Tests")
    class ChatEndpointTests {

        @Test
        @DisplayName("Should initiate SSE chat stream")
        void shouldInitiateChatStream() throws Exception {
            SseEmitter emitter = new SseEmitter();
            when(fluenceChatService.handleChatMessage(any(FluenceChatRequest.class))).thenReturn(emitter);

            Map<String, Object> request = Map.of(
                    "message", "How do I set up a wiki space?",
                    "conversationId", java.util.UUID.randomUUID().toString()
            );

            mockMvc.perform(post("/api/v1/fluence/chat")
                            .accept(MediaType.TEXT_EVENT_STREAM)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(request().asyncStarted());

            verify(fluenceChatService).handleChatMessage(any(FluenceChatRequest.class));
        }

        @Test
        @DisplayName("Should handle chat request without conversation ID")
        void shouldHandleChatWithoutConversationId() throws Exception {
            SseEmitter emitter = new SseEmitter();
            when(fluenceChatService.handleChatMessage(any(FluenceChatRequest.class))).thenReturn(emitter);

            Map<String, Object> request = Map.of(
                    "message", "What is NU-Fluence?"
            );

            mockMvc.perform(post("/api/v1/fluence/chat")
                            .accept(MediaType.TEXT_EVENT_STREAM)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(request().asyncStarted());

            verify(fluenceChatService).handleChatMessage(any(FluenceChatRequest.class));
        }
    }
}
