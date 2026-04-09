package com.hrms.api.integration.controller;

import com.hrms.application.integration.service.SlackCommandService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SlackCommandController.class)
@ContextConfiguration(classes = {SlackCommandController.class, SlackCommandControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SlackCommandController Tests")
class SlackCommandControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private SlackCommandService slackCommandService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Slash Command Tests")
    class SlashCommandTests {

        @Test
        @DisplayName("Should handle /leave command successfully")
        void shouldHandleLeaveCommand() throws Exception {
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(true);
            when(slackCommandService.handleLeaveCommand(anyString(), anyString(), anyString()))
                    .thenReturn("{\"response_type\":\"ephemeral\",\"text\":\"Leave request submitted\"}");

            mockMvc.perform(post("/api/v1/integrations/slack/commands")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .param("command", "/leave")
                            .param("text", "2 days vacation")
                            .param("user_id", "U12345")
                            .param("user_name", "john.doe")
                            .param("team_id", "T12345"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("Leave request submitted")));

            verify(slackCommandService).handleLeaveCommand("2 days vacation", "U12345", "T12345");
        }

        @Test
        @DisplayName("Should handle /balance command successfully")
        void shouldHandleBalanceCommand() throws Exception {
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(true);
            when(slackCommandService.handleBalanceCommand(anyString(), anyString()))
                    .thenReturn("{\"response_type\":\"ephemeral\",\"text\":\"Your balance: 15 days\"}");

            mockMvc.perform(post("/api/v1/integrations/slack/commands")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .param("command", "/balance")
                            .param("text", "")
                            .param("user_id", "U12345")
                            .param("user_name", "john.doe")
                            .param("team_id", "T12345"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("Your balance")));

            verify(slackCommandService).handleBalanceCommand("U12345", "T12345");
        }

        @Test
        @DisplayName("Should return 401 for invalid Slack signature")
        void shouldReturn401ForInvalidSignature() throws Exception {
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(false);

            mockMvc.perform(post("/api/v1/integrations/slack/commands")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .param("command", "/leave")
                            .param("text", "")
                            .param("user_id", "U12345")
                            .param("user_name", "john.doe")
                            .param("team_id", "T12345"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("Authentication failed")));
        }

        @Test
        @DisplayName("Should handle unknown command gracefully")
        void shouldHandleUnknownCommand() throws Exception {
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(true);

            mockMvc.perform(post("/api/v1/integrations/slack/commands")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .param("command", "/unknown")
                            .param("text", "")
                            .param("user_id", "U12345")
                            .param("user_name", "john.doe")
                            .param("team_id", "T12345"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("Unknown command")));
        }
    }

    @Nested
    @DisplayName("Interaction Tests")
    class InteractionTests {

        @Test
        @DisplayName("Should handle interaction payload successfully")
        void shouldHandleInteraction() throws Exception {
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(true);
            when(slackCommandService.handleInteraction(anyString()))
                    .thenReturn("{\"text\":\"Action processed\"}");

            mockMvc.perform(post("/api/v1/integrations/slack/interactions")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .param("payload", "{\"type\":\"block_actions\",\"actions\":[]}"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("Action processed")));

            verify(slackCommandService).handleInteraction(anyString());
        }

        @Test
        @DisplayName("Should return 401 for invalid signature on interaction")
        void shouldReturn401ForInvalidInteractionSignature() throws Exception {
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(false);

            mockMvc.perform(post("/api/v1/integrations/slack/interactions")
                            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                            .param("payload", "{}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Event Tests")
    class EventTests {

        @Test
        @DisplayName("Should handle URL verification challenge")
        void shouldHandleUrlVerification() throws Exception {
            String body = "{\"type\":\"url_verification\",\"challenge\":\"abc123\"}";
            when(slackCommandService.handleUrlVerification(anyString()))
                    .thenReturn(ResponseEntity.ok("abc123"));

            mockMvc.perform(post("/api/v1/integrations/slack/events")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());

            verify(slackCommandService).handleUrlVerification(anyString());
        }

        @Test
        @DisplayName("Should process event with valid signature")
        void shouldProcessEvent() throws Exception {
            String body = "{\"type\":\"event_callback\",\"event\":{\"type\":\"message\"}}";
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(true);

            mockMvc.perform(post("/api/v1/integrations/slack/events")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());

            verify(slackCommandService).processEvent(anyString());
        }

        @Test
        @DisplayName("Should return 401 for event with invalid signature")
        void shouldReturn401ForInvalidEventSignature() throws Exception {
            String body = "{\"type\":\"event_callback\",\"event\":{\"type\":\"message\"}}";
            when(slackCommandService.verifySlackSignature(any(HttpServletRequest.class))).thenReturn(false);

            mockMvc.perform(post("/api/v1/integrations/slack/events")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized());
        }
    }
}
