package com.hrms.api.workflow.controller;

import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.*;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApprovalsController.class)
@ContextConfiguration(classes = {ApprovalsController.class, ApprovalsControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ApprovalsController Integration Tests")
class ApprovalsControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private WorkflowService workflowService;
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

    private WorkflowExecutionResponse executionResponse;

    @BeforeEach
    void setUp() {
        executionResponse = WorkflowExecutionResponse.builder()
                .id(UUID.randomUUID())
                .workflowDefinitionId(UUID.randomUUID())
                .workflowName("Leave Approval")
                .entityType(WorkflowDefinition.EntityType.LEAVE_REQUEST)
                .entityId(UUID.randomUUID())
                .referenceNumber("WF-2026-001")
                .requesterId(UUID.randomUUID())
                .requesterName("Jane Doe")
                .status(WorkflowExecution.ExecutionStatus.IN_PROGRESS)
                .currentStepOrder(1)
                .currentStepName("Manager Approval")
                .priority(WorkflowExecution.Priority.NORMAL)
                .title("Annual Leave - 3 days")
                .submittedAt(LocalDateTime.now().minusDays(1))
                .totalSteps(2)
                .completedSteps(0)
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get My Approval Tasks Tests")
    class GetMyTasksTests {

        @Test
        @DisplayName("Should get my pending approval tasks")
        void shouldGetMyPendingTasks() throws Exception {
            when(workflowService.getMyPendingApprovals())
                    .thenReturn(Collections.singletonList(executionResponse));

            mockMvc.perform(get("/api/v1/approvals/tasks"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].workflowName").value("Leave Approval"))
                    .andExpect(jsonPath("$[0].requesterName").value("Jane Doe"))
                    .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));

            verify(workflowService).getMyPendingApprovals();
        }

        @Test
        @DisplayName("Should get tasks with assignedTo=me parameter")
        void shouldGetTasksWithAssignedToMe() throws Exception {
            when(workflowService.getMyPendingApprovals())
                    .thenReturn(Collections.singletonList(executionResponse));

            mockMvc.perform(get("/api/v1/approvals/tasks")
                            .param("assignedTo", "me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(workflowService).getMyPendingApprovals();
        }

        @Test
        @DisplayName("Should return empty list when no pending tasks")
        void shouldReturnEmptyListWhenNoPendingTasks() throws Exception {
            when(workflowService.getMyPendingApprovals())
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/approvals/tasks"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(workflowService).getMyPendingApprovals();
        }

        @Test
        @DisplayName("Should return multiple pending tasks")
        void shouldReturnMultiplePendingTasks() throws Exception {
            WorkflowExecutionResponse secondTask = WorkflowExecutionResponse.builder()
                    .id(UUID.randomUUID())
                    .workflowName("Expense Approval")
                    .entityType(WorkflowDefinition.EntityType.EXPENSE_CLAIM)
                    .requesterName("John Smith")
                    .status(WorkflowExecution.ExecutionStatus.IN_PROGRESS)
                    .title("Travel Expenses - March")
                    .amount(new BigDecimal("15000.00"))
                    .build();

            when(workflowService.getMyPendingApprovals())
                    .thenReturn(Arrays.asList(executionResponse, secondTask));

            mockMvc.perform(get("/api/v1/approvals/tasks"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[1].workflowName").value("Expense Approval"));
        }
    }

    @Nested
    @DisplayName("Approval Inbox Tests")
    class InboxTests {

        @Test
        @DisplayName("Should get approval inbox with default parameters")
        void shouldGetInboxWithDefaults() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    Collections.singletonList(executionResponse), PageRequest.of(0, 20), 1);

            when(workflowService.getApprovalInbox(
                    eq("PENDING"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/approvals/inbox"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(workflowService).getApprovalInbox(
                    eq("PENDING"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter inbox by module")
        void shouldFilterByModule() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    Collections.singletonList(executionResponse), PageRequest.of(0, 20), 1);

            when(workflowService.getApprovalInbox(
                    eq("PENDING"), eq("LEAVE"), isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/approvals/inbox")
                            .param("module", "LEAVE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(workflowService).getApprovalInbox(
                    eq("PENDING"), eq("LEAVE"), isNull(), isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter inbox by date range")
        void shouldFilterByDateRange() throws Exception {
            LocalDate from = LocalDate.now().minusDays(7);
            LocalDate to = LocalDate.now();

            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    Collections.singletonList(executionResponse), PageRequest.of(0, 20), 1);

            when(workflowService.getApprovalInbox(
                    eq("PENDING"), isNull(), any(), any(), isNull(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/approvals/inbox")
                            .param("fromDate", from.toString())
                            .param("toDate", to.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));
        }

        @Test
        @DisplayName("Should search inbox by keyword")
        void shouldSearchInbox() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    Collections.singletonList(executionResponse), PageRequest.of(0, 20), 1);

            when(workflowService.getApprovalInbox(
                    eq("PENDING"), isNull(), isNull(), isNull(), eq("leave"), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/approvals/inbox")
                            .param("search", "leave"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));
        }

        @Test
        @DisplayName("Should handle pagination parameters")
        void shouldHandlePagination() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(2, 10), 25);

            when(workflowService.getApprovalInbox(
                    anyString(), any(), any(), any(), any(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/approvals/inbox")
                            .param("page", "2")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(25));
        }
    }
}
