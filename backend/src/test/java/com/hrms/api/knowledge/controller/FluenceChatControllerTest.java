package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.knowledge.dto.FluenceChatRequest;
import com.hrms.application.knowledge.service.FluenceChatService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FluenceChatController.class)
@ContextConfiguration(classes = {FluenceChatController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
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
                    "conversationId", "conv-123"
            );

            mockMvc.perform(post("/api/v1/fluence/chat")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

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
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(fluenceChatService).handleChatMessage(any(FluenceChatRequest.class));
        }
    }
}
