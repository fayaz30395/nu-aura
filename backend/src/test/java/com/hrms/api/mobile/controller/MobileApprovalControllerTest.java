package com.hrms.api.mobile.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.mobile.dto.MobileApprovalDto;
import com.hrms.application.mobile.service.MobileApprovalService;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MobileApprovalController.class)
@ContextConfiguration(classes = {MobileApprovalController.class, MobileApprovalControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MobileApprovalController Integration Tests")
class MobileApprovalControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MobileApprovalService mobileApprovalService;
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

    private UUID approvalId;

    @BeforeEach
    void setUp() {
        approvalId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get Pending Approvals Tests")
    class GetPendingApprovalsTests {

        @Test
        @DisplayName("Should return pending approvals successfully")
        void shouldReturnPendingApprovalsSuccessfully() throws Exception {
            MobileApprovalDto.PendingApprovalsResponse response =
                    MobileApprovalDto.PendingApprovalsResponse.builder()
                            .totalPendingCount(5)
                            .counts(MobileApprovalDto.PendingApprovalsResponse.ApprovalCounts.builder()
                                    .leaveRequestsCount(2)
                                    .expenseClaimsCount(1)
                                    .employmentChangesCount(1)
                                    .overtimeRequestsCount(0)
                                    .assetRequestsCount(1)
                                    .build())
                            .approvals(List.of(
                                    MobileApprovalDto.ApprovalItem.builder()
                                            .approvalId(approvalId)
                                            .approvalType("LEAVE_REQUEST")
                                            .requesterName("John Doe")
                                            .build()))
                            .build();

            when(mobileApprovalService.getPendingApprovals()).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/approvals/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalPendingCount").value(5))
                    .andExpect(jsonPath("$.counts.leaveRequestsCount").value(2))
                    .andExpect(jsonPath("$.approvals", hasSize(1)));

            verify(mobileApprovalService).getPendingApprovals();
        }

        @Test
        @DisplayName("Should return empty approvals when none pending")
        void shouldReturnEmptyApprovalsWhenNonePending() throws Exception {
            MobileApprovalDto.PendingApprovalsResponse response =
                    MobileApprovalDto.PendingApprovalsResponse.builder()
                            .totalPendingCount(0)
                            .approvals(Collections.emptyList())
                            .build();

            when(mobileApprovalService.getPendingApprovals()).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/approvals/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalPendingCount").value(0))
                    .andExpect(jsonPath("$.approvals", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("Approve Request Tests")
    class ApproveRequestTests {

        @Test
        @DisplayName("Should approve request successfully")
        void shouldApproveRequestSuccessfully() throws Exception {
            MobileApprovalDto.ApprovalActionRequest request =
                    MobileApprovalDto.ApprovalActionRequest.builder()
                            .approvalId(approvalId)
                            .action("APPROVE")
                            .notes("Looks good")
                            .build();

            MobileApprovalDto.ApprovalActionResponse response =
                    MobileApprovalDto.ApprovalActionResponse.builder()
                            .approvalId(approvalId)
                            .status("APPROVED")
                            .actionedAt(LocalDateTime.now())
                            .message("Request approved successfully")
                            .build();

            when(mobileApprovalService.actionApproval(any(MobileApprovalDto.ApprovalActionRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/approvals/{id}/approve", approvalId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.approvalId").value(approvalId.toString()))
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(mobileApprovalService).actionApproval(any(MobileApprovalDto.ApprovalActionRequest.class));
        }
    }

    @Nested
    @DisplayName("Reject Request Tests")
    class RejectRequestTests {

        @Test
        @DisplayName("Should reject request successfully")
        void shouldRejectRequestSuccessfully() throws Exception {
            MobileApprovalDto.ApprovalActionRequest request =
                    MobileApprovalDto.ApprovalActionRequest.builder()
                            .approvalId(approvalId)
                            .action("REJECT")
                            .rejectionReason("Insufficient documentation")
                            .build();

            MobileApprovalDto.ApprovalActionResponse response =
                    MobileApprovalDto.ApprovalActionResponse.builder()
                            .approvalId(approvalId)
                            .status("REJECTED")
                            .actionedAt(LocalDateTime.now())
                            .message("Request rejected")
                            .build();

            when(mobileApprovalService.actionApproval(any(MobileApprovalDto.ApprovalActionRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/approvals/{id}/reject", approvalId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(mobileApprovalService).actionApproval(any(MobileApprovalDto.ApprovalActionRequest.class));
        }
    }

    @Nested
    @DisplayName("Bulk Action Tests")
    class BulkActionTests {

        @Test
        @DisplayName("Should bulk approve successfully")
        void shouldBulkApproveSuccessfully() throws Exception {
            List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
            MobileApprovalDto.BulkApprovalRequest request =
                    MobileApprovalDto.BulkApprovalRequest.builder()
                            .approvalIds(ids)
                            .action("APPROVE")
                            .notes("Bulk approved")
                            .build();

            MobileApprovalDto.ApprovalActionResponse response =
                    MobileApprovalDto.ApprovalActionResponse.builder()
                            .status("APPROVED")
                            .actionedAt(LocalDateTime.now())
                            .message("3 requests approved")
                            .build();

            when(mobileApprovalService.bulkActionApprovals(any(MobileApprovalDto.BulkApprovalRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/approvals/bulk-action")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"))
                    .andExpect(jsonPath("$.message").value("3 requests approved"));

            verify(mobileApprovalService).bulkActionApprovals(any(MobileApprovalDto.BulkApprovalRequest.class));
        }

        @Test
        @DisplayName("Should bulk reject successfully")
        void shouldBulkRejectSuccessfully() throws Exception {
            MobileApprovalDto.BulkApprovalRequest request =
                    MobileApprovalDto.BulkApprovalRequest.builder()
                            .approvalIds(List.of(UUID.randomUUID()))
                            .action("REJECT")
                            .notes("Rejected due to policy violation")
                            .build();

            MobileApprovalDto.ApprovalActionResponse response =
                    MobileApprovalDto.ApprovalActionResponse.builder()
                            .status("REJECTED")
                            .actionedAt(LocalDateTime.now())
                            .message("1 request rejected")
                            .build();

            when(mobileApprovalService.bulkActionApprovals(any(MobileApprovalDto.BulkApprovalRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/approvals/bulk-action")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));
        }
    }

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("Should return 400 when bulk action has null approval IDs")
        void shouldReturn400WhenBulkActionHasNullIds() throws Exception {
            MobileApprovalDto.BulkApprovalRequest request =
                    MobileApprovalDto.BulkApprovalRequest.builder()
                            .approvalIds(null)
                            .action("APPROVE")
                            .build();

            mockMvc.perform(post("/api/v1/mobile/approvals/bulk-action")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when bulk action has null action")
        void shouldReturn400WhenBulkActionHasNullAction() throws Exception {
            MobileApprovalDto.BulkApprovalRequest request =
                    MobileApprovalDto.BulkApprovalRequest.builder()
                            .approvalIds(List.of(UUID.randomUUID()))
                            .action(null)
                            .build();

            mockMvc.perform(post("/api/v1/mobile/approvals/bulk-action")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
