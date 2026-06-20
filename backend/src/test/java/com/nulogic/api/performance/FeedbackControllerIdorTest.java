package com.nulogic.api.performance;

import com.nulogic.application.performance.dto.FeedbackResponse;
import com.nulogic.application.performance.service.FeedbackService;
import com.nulogic.common.config.TestMeterRegistryConfig;
import com.nulogic.common.exception.GlobalExceptionHandler;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for the IDOR scope guards on FeedbackController.
 * Covers:
 *   Task 1 — /received/{employeeId} and /given/{employeeId} ownership guards
 *   RBAC-GF-5 — /{id} post-fetch ownership check for single-feedback reads
 */
@WebMvcTest(FeedbackController.class)
@ContextConfiguration(classes = {FeedbackController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FeedbackController — IDOR scope guard regression tests")
class FeedbackControllerIdorTest {

    private static final String BASE_URL = "/api/v1/feedback";

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private FeedbackService feedbackService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    // ==================== /received/{employeeId} ====================

    @Nested
    @DisplayName("GET /received/{employeeId}")
    class GetReceivedFeedbackIdorTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_received_feedback")
        void should_return_403_when_self_only_caller_requests_foreign_received_feedback() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);

                mockMvc.perform(get(BASE_URL + "/received/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isForbidden());

                verify(feedbackService, never()).getReceivedFeedback(any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_requests_own_received_feedback")
        void should_return_200_when_caller_requests_own_received_feedback() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                when(feedbackService.getReceivedFeedback(currentEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/received/{employeeId}", currentEmployeeId))
                        .andExpect(status().isOk());

                verify(feedbackService).getReceivedFeedback(currentEmployeeId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_hr_manager_views_any_employee_received_feedback")
        void should_return_200_when_hr_manager_views_any_employee_received_feedback() throws Exception {
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(true);
                when(feedbackService.getReceivedFeedback(foreignEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/received/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isOk());

                verify(feedbackService).getReceivedFeedback(foreignEmployeeId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_employee_view_all_holder_requests_any_received_feedback")
        void should_return_200_when_employee_view_all_holder_requests_any_received_feedback() throws Exception {
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(true);
                when(feedbackService.getReceivedFeedback(foreignEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/received/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isOk());

                verify(feedbackService).getReceivedFeedback(foreignEmployeeId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_team_manager_views_reportee_received_feedback")
        void should_return_200_when_team_manager_views_reportee_received_feedback() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID reporteeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(true);
                sc.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(reporteeId));
                when(feedbackService.getReceivedFeedback(reporteeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/received/{employeeId}", reporteeId))
                        .andExpect(status().isOk());

                verify(feedbackService).getReceivedFeedback(reporteeId);
            }
        }
    }

    // ==================== /given/{employeeId} ====================

    @Nested
    @DisplayName("GET /given/{employeeId}")
    class GetGivenFeedbackIdorTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_given_feedback")
        void should_return_403_when_self_only_caller_requests_foreign_given_feedback() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);

                mockMvc.perform(get(BASE_URL + "/given/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isForbidden());

                verify(feedbackService, never()).getGivenFeedback(any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_requests_own_given_feedback")
        void should_return_200_when_caller_requests_own_given_feedback() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                when(feedbackService.getGivenFeedback(currentEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/given/{employeeId}", currentEmployeeId))
                        .andExpect(status().isOk());

                verify(feedbackService).getGivenFeedback(currentEmployeeId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_hr_manager_views_any_employee_given_feedback")
        void should_return_200_when_hr_manager_views_any_employee_given_feedback() throws Exception {
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(true);
                when(feedbackService.getGivenFeedback(foreignEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/given/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isOk());

                verify(feedbackService).getGivenFeedback(foreignEmployeeId);
            }
        }
    }

    // ==================== RBAC-GF-5: /{id} ownership check ====================

    @Nested
    @DisplayName("GET /{id} — ownership check (RBAC-GF-5)")
    class GetFeedbackByIdOwnershipTests {

        @Test
        @DisplayName("should_return_403_when_unrelated_self_only_caller_requests_foreign_feedback")
        void should_return_403_when_unrelated_self_only_caller_requests_foreign_feedback() throws Exception {
            UUID self = UUID.randomUUID();
            UUID feedbackId = UUID.randomUUID();
            FeedbackResponse foreignFeedback = FeedbackResponse.builder()
                    .id(feedbackId)
                    .recipientId(UUID.randomUUID())   // different recipient
                    .giverId(UUID.randomUUID())        // different giver
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);
                when(feedbackService.getFeedbackById(feedbackId)).thenReturn(foreignFeedback);

                mockMvc.perform(get(BASE_URL + "/{id}", feedbackId))
                        .andExpect(status().isForbidden());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_is_recipient_of_feedback")
        void should_return_200_when_caller_is_recipient_of_feedback() throws Exception {
            UUID self = UUID.randomUUID();
            UUID feedbackId = UUID.randomUUID();
            FeedbackResponse ownFeedback = FeedbackResponse.builder()
                    .id(feedbackId)
                    .recipientId(self)               // caller is recipient
                    .giverId(UUID.randomUUID())
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                when(feedbackService.getFeedbackById(feedbackId)).thenReturn(ownFeedback);

                mockMvc.perform(get(BASE_URL + "/{id}", feedbackId))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_is_giver_of_feedback")
        void should_return_200_when_caller_is_giver_of_feedback() throws Exception {
            UUID self = UUID.randomUUID();
            UUID feedbackId = UUID.randomUUID();
            FeedbackResponse givenFeedback = FeedbackResponse.builder()
                    .id(feedbackId)
                    .recipientId(UUID.randomUUID())
                    .giverId(self)                   // caller is giver
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                when(feedbackService.getFeedbackById(feedbackId)).thenReturn(givenFeedback);

                mockMvc.perform(get(BASE_URL + "/{id}", feedbackId))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("should_return_200_when_hr_manager_requests_any_feedback")
        void should_return_200_when_hr_manager_requests_any_feedback() throws Exception {
            UUID feedbackId = UUID.randomUUID();
            FeedbackResponse anyFeedback = FeedbackResponse.builder()
                    .id(feedbackId)
                    .recipientId(UUID.randomUUID())
                    .giverId(UUID.randomUUID())
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(true);
                when(feedbackService.getFeedbackById(feedbackId)).thenReturn(anyFeedback);

                mockMvc.perform(get(BASE_URL + "/{id}", feedbackId))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("should_return_200_when_team_manager_requests_reportee_feedback")
        void should_return_200_when_team_manager_requests_reportee_feedback() throws Exception {
            UUID self = UUID.randomUUID();
            UUID reporteeId = UUID.randomUUID();
            UUID feedbackId = UUID.randomUUID();
            FeedbackResponse reporteeFeedback = FeedbackResponse.builder()
                    .id(feedbackId)
                    .recipientId(reporteeId)         // recipient is a reportee
                    .giverId(UUID.randomUUID())
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(true);
                sc.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(reporteeId));
                when(feedbackService.getFeedbackById(feedbackId)).thenReturn(reporteeFeedback);

                mockMvc.perform(get(BASE_URL + "/{id}", feedbackId))
                        .andExpect(status().isOk());
            }
        }
    }
}
