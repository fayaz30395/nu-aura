package com.hrms.api.referral.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.referral.dto.*;
import com.hrms.application.referral.service.ReferralService;
import com.hrms.common.security.*;
import com.hrms.domain.referral.EmployeeReferral.ReferralStatus;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReferralController.class)
@ContextConfiguration(classes = {ReferralController.class, ReferralControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ReferralController Tests")
class ReferralControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ReferralService referralService;
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

    private UUID referralId;
    private UUID userId;
    private ReferralResponse referralResponse;

    @BeforeEach
    void setUp() {
        referralId = UUID.randomUUID();
        userId = UUID.randomUUID();
        referralResponse = ReferralResponse.builder()
                .id(referralId)
                .referrerId(userId)
                .candidateName("Jane Smith")
                .candidateEmail("jane@example.com")
                .status(ReferralStatus.SUBMITTED)
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should submit referral successfully")
    void shouldSubmitReferral() throws Exception {
        ReferralRequest request = ReferralRequest.builder()
                .candidateName("Jane Smith")
                .candidateEmail("jane@example.com")
                .jobTitle("Backend Developer")
                .build();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
            when(referralService.submitReferral(eq(userId), any(ReferralRequest.class)))
                    .thenReturn(referralResponse);

            mockMvc.perform(post("/api/v1/referrals")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.candidateName").value("Jane Smith"))
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));

            verify(referralService).submitReferral(eq(userId), any(ReferralRequest.class));
        }
    }

    @Test
    @DisplayName("Should get referral by ID")
    void shouldGetReferralById() throws Exception {
        when(referralService.getReferral(referralId)).thenReturn(referralResponse);

        mockMvc.perform(get("/api/v1/referrals/{id}", referralId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(referralId.toString()))
                .andExpect(jsonPath("$.candidateName").value("Jane Smith"));

        verify(referralService).getReferral(referralId);
    }

    @Test
    @DisplayName("Should get my referrals")
    void shouldGetMyReferrals() throws Exception {
        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
            when(referralService.getMyReferrals(userId)).thenReturn(List.of(referralResponse));

            mockMvc.perform(get("/api/v1/referrals/my-referrals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].referrerId").value(userId.toString()));

            verify(referralService).getMyReferrals(userId);
        }
    }

    @Test
    @DisplayName("Should get all referrals with pagination")
    void shouldGetAllReferrals() throws Exception {
        Page<ReferralResponse> page = new PageImpl<>(
                List.of(referralResponse), PageRequest.of(0, 20), 1);

        when(referralService.getAllReferrals(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/referrals")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(referralService).getAllReferrals(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get referrals by status")
    void shouldGetReferralsByStatus() throws Exception {
        when(referralService.getReferralsByStatus(ReferralStatus.SUBMITTED))
                .thenReturn(List.of(referralResponse));

        mockMvc.perform(get("/api/v1/referrals/status/{status}", "SUBMITTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("SUBMITTED"));

        verify(referralService).getReferralsByStatus(ReferralStatus.SUBMITTED);
    }

    @Test
    @DisplayName("Should update referral status")
    void shouldUpdateReferralStatus() throws Exception {
        referralResponse.setStatus(ReferralStatus.SCREENING);
        when(referralService.updateStatus(eq(referralId), eq(ReferralStatus.SCREENING), any()))
                .thenReturn(referralResponse);

        mockMvc.perform(put("/api/v1/referrals/{id}/status", referralId)
                        .param("status", "SCREENING")
                        .param("notes", "Moving to screening"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCREENING"));

        verify(referralService).updateStatus(eq(referralId), eq(ReferralStatus.SCREENING), any());
    }

    @Test
    @DisplayName("Should reject referral with reason")
    void shouldRejectReferral() throws Exception {
        referralResponse.setStatus(ReferralStatus.REJECTED);
        when(referralService.rejectReferral(eq(referralId), any(), any()))
                .thenReturn(referralResponse);

        mockMvc.perform(put("/api/v1/referrals/{id}/reject", referralId)
                        .param("reason", "Not a good fit")
                        .param("stage", "SCREENING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(referralService).rejectReferral(eq(referralId), any(), any());
    }

    @Test
    @DisplayName("Should process bonus for referral")
    void shouldProcessBonus() throws Exception {
        when(referralService.processBonus(referralId)).thenReturn(referralResponse);

        mockMvc.perform(post("/api/v1/referrals/{id}/process-bonus", referralId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(referralId.toString()));

        verify(referralService).processBonus(referralId);
    }

    @Test
    @DisplayName("Should get referral dashboard")
    void shouldGetDashboard() throws Exception {
        ReferralDashboard dashboard = ReferralDashboard.builder().build();
        when(referralService.getDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/referrals/dashboard"))
                .andExpect(status().isOk());

        verify(referralService).getDashboard();
    }
}
