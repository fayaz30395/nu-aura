package com.hrms.api.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.FeedbackRequest;
import com.hrms.application.performance.dto.FeedbackResponse;
import com.hrms.application.performance.service.FeedbackService;
import com.hrms.common.security.*;
import com.hrms.domain.performance.Feedback;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FeedbackController.class)
@ContextConfiguration(classes = {FeedbackController.class, FeedbackControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FeedbackController Tests")
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private FeedbackService feedbackService;
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

    private UUID feedbackId;
    private UUID recipientId;
    private UUID giverId;
    private FeedbackResponse feedbackResponse;

    @BeforeEach
    void setUp() {
        feedbackId = UUID.randomUUID();
        recipientId = UUID.randomUUID();
        giverId = UUID.randomUUID();
        feedbackResponse = FeedbackResponse.builder()
                .id(feedbackId)
                .recipientId(recipientId)
                .recipientName("John Doe")
                .giverId(giverId)
                .giverName("Jane Manager")
                .feedbackType(Feedback.FeedbackType.PRAISE)
                .feedbackText("Excellent work on the project")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should give feedback successfully")
    void shouldGiveFeedbackSuccessfully() throws Exception {
        FeedbackRequest request = FeedbackRequest.builder()
                .recipientId(recipientId)
                .giverId(giverId)
                .feedbackType(Feedback.FeedbackType.PRAISE)
                .feedbackText("Excellent work on the project")
                .build();

        when(feedbackService.giveFeedback(any(FeedbackRequest.class))).thenReturn(feedbackResponse);

        mockMvc.perform(post("/api/v1/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.feedbackType").value("PRAISE"))
                .andExpect(jsonPath("$.feedbackText").value("Excellent work on the project"));

        verify(feedbackService).giveFeedback(any(FeedbackRequest.class));
    }

    @Test
    @DisplayName("Should get feedback by ID")
    void shouldGetFeedbackById() throws Exception {
        when(feedbackService.getFeedbackById(feedbackId)).thenReturn(feedbackResponse);

        mockMvc.perform(get("/api/v1/feedback/{id}", feedbackId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(feedbackId.toString()))
                .andExpect(jsonPath("$.recipientName").value("John Doe"));

        verify(feedbackService).getFeedbackById(feedbackId);
    }

    @Test
    @DisplayName("Should get received feedback for employee")
    void shouldGetReceivedFeedback() throws Exception {
        when(feedbackService.getReceivedFeedback(recipientId))
                .thenReturn(List.of(feedbackResponse));

        mockMvc.perform(get("/api/v1/feedback/received/{employeeId}", recipientId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].recipientId").value(recipientId.toString()));

        verify(feedbackService).getReceivedFeedback(recipientId);
    }

    @Test
    @DisplayName("Should get given feedback for employee")
    void shouldGetGivenFeedback() throws Exception {
        when(feedbackService.getGivenFeedback(giverId))
                .thenReturn(List.of(feedbackResponse));

        mockMvc.perform(get("/api/v1/feedback/given/{employeeId}", giverId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].giverId").value(giverId.toString()));

        verify(feedbackService).getGivenFeedback(giverId);
    }

    @Test
    @DisplayName("Should update feedback successfully")
    void shouldUpdateFeedback() throws Exception {
        FeedbackRequest request = FeedbackRequest.builder()
                .recipientId(recipientId)
                .giverId(giverId)
                .feedbackType(Feedback.FeedbackType.CONSTRUCTIVE)
                .feedbackText("Updated feedback text")
                .build();

        FeedbackResponse updatedResponse = FeedbackResponse.builder()
                .id(feedbackId)
                .recipientId(recipientId)
                .giverId(giverId)
                .feedbackType(Feedback.FeedbackType.CONSTRUCTIVE)
                .feedbackText("Updated feedback text")
                .build();

        when(feedbackService.updateFeedback(eq(feedbackId), any(FeedbackRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/v1/feedback/{id}", feedbackId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feedbackType").value("CONSTRUCTIVE"))
                .andExpect(jsonPath("$.feedbackText").value("Updated feedback text"));

        verify(feedbackService).updateFeedback(eq(feedbackId), any(FeedbackRequest.class));
    }

    @Test
    @DisplayName("Should delete feedback successfully")
    void shouldDeleteFeedback() throws Exception {
        doNothing().when(feedbackService).deleteFeedback(feedbackId);

        mockMvc.perform(delete("/api/v1/feedback/{id}", feedbackId))
                .andExpect(status().isNoContent());

        verify(feedbackService).deleteFeedback(feedbackId);
    }

    @Test
    @DisplayName("Should return empty list when no received feedback")
    void shouldReturnEmptyListWhenNoReceivedFeedback() throws Exception {
        when(feedbackService.getReceivedFeedback(recipientId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/feedback/received/{employeeId}", recipientId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(feedbackService).getReceivedFeedback(recipientId);
    }

    @Test
    @DisplayName("Should give constructive feedback with category")
    void shouldGiveConstructiveFeedbackWithCategory() throws Exception {
        FeedbackRequest request = FeedbackRequest.builder()
                .recipientId(recipientId)
                .giverId(giverId)
                .feedbackType(Feedback.FeedbackType.CONSTRUCTIVE)
                .category("Communication")
                .feedbackText("Consider being more concise in status updates")
                .isAnonymous(true)
                .build();

        FeedbackResponse response = FeedbackResponse.builder()
                .id(UUID.randomUUID())
                .recipientId(recipientId)
                .giverId(giverId)
                .feedbackType(Feedback.FeedbackType.CONSTRUCTIVE)
                .category("Communication")
                .feedbackText("Consider being more concise in status updates")
                .isAnonymous(true)
                .build();

        when(feedbackService.giveFeedback(any(FeedbackRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.feedbackType").value("CONSTRUCTIVE"))
                .andExpect(jsonPath("$.category").value("Communication"))
                .andExpect(jsonPath("$.isAnonymous").value(true));

        verify(feedbackService).giveFeedback(any(FeedbackRequest.class));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
