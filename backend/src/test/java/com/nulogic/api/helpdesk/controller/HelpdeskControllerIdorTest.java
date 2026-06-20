package com.nulogic.api.helpdesk.controller;

import com.nulogic.application.helpdesk.service.HelpdeskService;
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
 * Regression tests for the IDOR scope guards on HelpdeskController.
 * Covers: self-only caller blocked for foreign employeeId; self / VIEW_ALL holder allowed.
 */
@WebMvcTest(HelpdeskController.class)
@ContextConfiguration(classes = {HelpdeskController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("HelpdeskController — IDOR scope guard regression tests")
class HelpdeskControllerIdorTest {

    private static final String BASE_URL = "/api/v1/helpdesk";

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private HelpdeskService helpdeskService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    // ==================== getTicketsByEmployee (/tickets/employee/{employeeId}) ====================

    @Nested
    @DisplayName("GET /tickets/employee/{employeeId}")
    class GetTicketsByEmployeeIdorTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_employee_tickets")
        void should_return_403_when_self_only_caller_requests_foreign_employee_tickets() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID foreignEmployeeId = UUID.randomUUID(); // different — IDOR target

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);

                mockMvc.perform(get(BASE_URL + "/tickets/employee/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isForbidden());

                verify(helpdeskService, never()).getTicketsByEmployee(any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_requests_own_tickets")
        void should_return_200_when_caller_requests_own_tickets() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                when(helpdeskService.getTicketsByEmployee(currentEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets/employee/{employeeId}", currentEmployeeId))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByEmployee(currentEmployeeId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_helpdesk_manage_holder_requests_any_employee_tickets")
        void should_return_200_when_helpdesk_manage_holder_requests_any_employee_tickets() throws Exception {
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(true);
                when(helpdeskService.getTicketsByEmployee(foreignEmployeeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets/employee/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByEmployee(foreignEmployeeId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_team_manager_requests_reportee_tickets")
        void should_return_200_when_team_manager_requests_reportee_tickets() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID reporteeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(true);
                sc.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(reporteeId));
                when(helpdeskService.getTicketsByEmployee(reporteeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets/employee/{employeeId}", reporteeId))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByEmployee(reporteeId);
            }
        }
    }

    // ==================== getTicketsByAssignee (/tickets/assignee/{assigneeId}) ====================

    @Nested
    @DisplayName("GET /tickets/assignee/{assigneeId}")
    class GetTicketsByAssigneeIdorTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_assignee_tickets")
        void should_return_403_when_self_only_caller_requests_foreign_assignee_tickets() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID foreignAssigneeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);

                mockMvc.perform(get(BASE_URL + "/tickets/assignee/{assigneeId}", foreignAssigneeId))
                        .andExpect(status().isForbidden());

                verify(helpdeskService, never()).getTicketsByAssignee(any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_employee_view_all_holder_requests_any_assignee_tickets")
        void should_return_200_when_employee_view_all_holder_requests_any_assignee_tickets() throws Exception {
            UUID foreignAssigneeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(true);
                when(helpdeskService.getTicketsByAssignee(foreignAssigneeId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets/assignee/{assigneeId}", foreignAssigneeId))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByAssignee(foreignAssigneeId);
            }
        }
    }
}
