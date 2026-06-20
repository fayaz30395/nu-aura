package com.nulogic.api.helpdesk.controller;

import com.nulogic.api.helpdesk.dto.TicketResponse;
import com.nulogic.application.helpdesk.service.HelpdeskService;
import com.nulogic.common.config.TestMeterRegistryConfig;
import com.nulogic.common.exception.GlobalExceptionHandler;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.domain.helpdesk.Ticket;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for IDOR scope guards on HelpdeskController (Tasks 1 + RBAC-GF-5).
 * Covers:
 *   Task 1 — /tickets/employee/{id} and /tickets/assignee/{id} ownership guards
 *   RBAC-GF-5 — /tickets (scoped list), /tickets/{id} ownership, /tickets/number/{n} ownership,
 *               /tickets/status/{s} agent-only gate, /tickets/category/{id} agent-only gate
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
            UUID foreignEmployeeId = UUID.randomUUID();

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

    // ==================== RBAC-GF-5: getAllTickets (/tickets — scoped list) ====================

    @Nested
    @DisplayName("GET /tickets — scoped list (RBAC-GF-5)")
    class GetAllTicketsScopedTests {

        @Test
        @DisplayName("should_return_own_tickets_only_when_caller_is_self_only_employee")
        void should_return_own_tickets_only_when_caller_is_self_only_employee() throws Exception {
            UUID self = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                when(helpdeskService.getTicketsByCaller(self)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets"))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByCaller(self);
                verify(helpdeskService, never()).getAllTickets(any());
            }
        }

        @Test
        @DisplayName("should_return_tenant_wide_tickets_when_caller_has_helpdesk_manage")
        void should_return_tenant_wide_tickets_when_caller_has_helpdesk_manage() throws Exception {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(true);
                when(helpdeskService.getAllTickets(any())).thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

                mockMvc.perform(get(BASE_URL + "/tickets"))
                        .andExpect(status().isOk());

                verify(helpdeskService).getAllTickets(any());
                verify(helpdeskService, never()).getTicketsByCaller(any());
            }
        }

        @Test
        @DisplayName("should_return_tenant_wide_tickets_when_caller_has_employee_view_all")
        void should_return_tenant_wide_tickets_when_caller_has_employee_view_all() throws Exception {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(true);
                when(helpdeskService.getAllTickets(any())).thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

                mockMvc.perform(get(BASE_URL + "/tickets"))
                        .andExpect(status().isOk());

                verify(helpdeskService).getAllTickets(any());
                verify(helpdeskService, never()).getTicketsByCaller(any());
            }
        }
    }

    // ==================== RBAC-GF-5: getTicketById (/tickets/{id} ownership check) ====================

    @Nested
    @DisplayName("GET /tickets/{id} — ownership check (RBAC-GF-5)")
    class GetTicketByIdOwnershipTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_ticket")
        void should_return_403_when_self_only_caller_requests_foreign_ticket() throws Exception {
            UUID self = UUID.randomUUID();
            UUID ticketId = UUID.randomUUID();
            TicketResponse foreignTicket = TicketResponse.builder()
                    .id(ticketId)
                    .employeeId(UUID.randomUUID())   // different reporter
                    .assignedTo(UUID.randomUUID())   // different assignee
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);
                when(helpdeskService.getTicketById(ticketId)).thenReturn(foreignTicket);

                mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                        .andExpect(status().isForbidden());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_is_reporter_of_ticket")
        void should_return_200_when_caller_is_reporter_of_ticket() throws Exception {
            UUID self = UUID.randomUUID();
            UUID ticketId = UUID.randomUUID();
            TicketResponse ownTicket = TicketResponse.builder()
                    .id(ticketId)
                    .employeeId(self)               // caller is reporter
                    .assignedTo(UUID.randomUUID())
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                when(helpdeskService.getTicketById(ticketId)).thenReturn(ownTicket);

                mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_is_assignee_of_ticket")
        void should_return_200_when_caller_is_assignee_of_ticket() throws Exception {
            UUID self = UUID.randomUUID();
            UUID ticketId = UUID.randomUUID();
            TicketResponse assignedTicket = TicketResponse.builder()
                    .id(ticketId)
                    .employeeId(UUID.randomUUID())  // different reporter
                    .assignedTo(self)               // caller is assignee
                    .status(Ticket.TicketStatus.IN_PROGRESS)
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                when(helpdeskService.getTicketById(ticketId)).thenReturn(assignedTicket);

                mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_has_helpdesk_manage_permission")
        void should_return_200_when_caller_has_helpdesk_manage_permission() throws Exception {
            UUID ticketId = UUID.randomUUID();
            TicketResponse anyTicket = TicketResponse.builder()
                    .id(ticketId)
                    .employeeId(UUID.randomUUID())
                    .assignedTo(UUID.randomUUID())
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(true);
                when(helpdeskService.getTicketById(ticketId)).thenReturn(anyTicket);

                mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                        .andExpect(status().isOk());
            }
        }
    }

    // ==================== RBAC-GF-5: getTicketByNumber (/tickets/number/{n}) ====================

    @Nested
    @DisplayName("GET /tickets/number/{n} — ownership check (RBAC-GF-5)")
    class GetTicketByNumberOwnershipTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_ticket_by_number")
        void should_return_403_when_self_only_caller_requests_foreign_ticket_by_number() throws Exception {
            UUID self = UUID.randomUUID();
            TicketResponse foreignTicket = TicketResponse.builder()
                    .id(UUID.randomUUID())
                    .employeeId(UUID.randomUUID())
                    .assignedTo(UUID.randomUUID())
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);
                when(helpdeskService.getTicketByNumber("TKT-2026-00999")).thenReturn(foreignTicket);

                mockMvc.perform(get(BASE_URL + "/tickets/number/{n}", "TKT-2026-00999"))
                        .andExpect(status().isForbidden());
            }
        }

        @Test
        @DisplayName("should_return_200_when_caller_is_reporter_of_fetched_ticket_by_number")
        void should_return_200_when_caller_is_reporter_of_fetched_ticket_by_number() throws Exception {
            UUID self = UUID.randomUUID();
            TicketResponse ownTicket = TicketResponse.builder()
                    .id(UUID.randomUUID())
                    .employeeId(self)
                    .assignedTo(UUID.randomUUID())
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(self);
                when(helpdeskService.getTicketByNumber("TKT-2026-00001")).thenReturn(ownTicket);

                mockMvc.perform(get(BASE_URL + "/tickets/number/{n}", "TKT-2026-00001"))
                        .andExpect(status().isOk());
            }
        }
    }

    // ==================== RBAC-GF-5: getTicketsByStatus — agent-only gate ====================

    @Nested
    @DisplayName("GET /tickets/status/{s} — agent-only gate (RBAC-GF-5)")
    class GetTicketsByStatusAgentGateTests {

        @Test
        @DisplayName("should_return_403_when_self_only_employee_requests_by_status")
        void should_return_403_when_self_only_employee_requests_by_status() throws Exception {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);

                mockMvc.perform(get(BASE_URL + "/tickets/status/{s}", "OPEN"))
                        .andExpect(status().isForbidden());

                verify(helpdeskService, never()).getTicketsByStatus(any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_helpdesk_agent_requests_by_status")
        void should_return_200_when_helpdesk_agent_requests_by_status() throws Exception {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(true);
                when(helpdeskService.getTicketsByStatus(Ticket.TicketStatus.OPEN)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets/status/{s}", "OPEN"))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByStatus(Ticket.TicketStatus.OPEN);
            }
        }
    }

    // ==================== RBAC-GF-5: getTicketsByCategory — agent-only gate ====================

    @Nested
    @DisplayName("GET /tickets/category/{id} — agent-only gate (RBAC-GF-5)")
    class GetTicketsByCategoryAgentGateTests {

        @Test
        @DisplayName("should_return_403_when_self_only_employee_requests_by_category")
        void should_return_403_when_self_only_employee_requests_by_category() throws Exception {
            UUID categoryId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);

                mockMvc.perform(get(BASE_URL + "/tickets/category/{id}", categoryId))
                        .andExpect(status().isForbidden());

                verify(helpdeskService, never()).getTicketsByCategory(any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_tenant_admin_requests_by_category")
        void should_return_200_when_tenant_admin_requests_by_category() throws Exception {
            UUID categoryId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(true);
                when(helpdeskService.getTicketsByCategory(categoryId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get(BASE_URL + "/tickets/category/{id}", categoryId))
                        .andExpect(status().isOk());

                verify(helpdeskService).getTicketsByCategory(categoryId);
            }
        }
    }
}
