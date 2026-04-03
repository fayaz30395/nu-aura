package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.helpdesk.dto.TicketRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.helpdesk.Ticket;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for HelpdeskController.
 * Covers UC-HELP-001 through UC-HELP-007.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Helpdesk Controller Integration Tests")
class HelpdeskControllerTest {

    private static final String BASE_URL = "/api/v1/helpdesk";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-HELP-001: Create helpdesk ticket =========================

    @Test
    @DisplayName("ucHelpA1_createTicket_returns201WithOpenStatus")
    void ucHelpA1_createTicket_returns201WithOpenStatus() throws Exception {
        TicketRequest request = buildValidTicketRequest("Laptop not booting", "My laptop fails to start after update.");

        mockMvc.perform(post(BASE_URL + "/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subject").value("Laptop not booting"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @DisplayName("ucHelpA2_createTicketMissingSubject_returns400")
    void ucHelpA2_createTicketMissingSubject_returns400() throws Exception {
        TicketRequest request = TicketRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .priority(Ticket.TicketPriority.MEDIUM)
                // missing subject
                .description("This ticket has no subject")
                .build();

        mockMvc.perform(post(BASE_URL + "/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucHelpA3_getTicketById_returns200")
    void ucHelpA3_getTicketById_returns200() throws Exception {
        TicketRequest request = buildValidTicketRequest("VPN not working", "Cannot connect to VPN from home.");
        String responseBody = mockMvc.perform(post(BASE_URL + "/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String ticketId = objectMapper.readTree(responseBody).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ticketId));
    }

    @Test
    @DisplayName("ucHelpA4_resolveTicket_returns200WithResolvedStatus")
    void ucHelpA4_resolveTicket_returns200WithResolvedStatus() throws Exception {
        TicketRequest request = buildValidTicketRequest("Email issue", "Cannot send emails.");
        String responseBody = mockMvc.perform(post(BASE_URL + "/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String ticketId = objectMapper.readTree(responseBody).get("id").asText();

        mockMvc.perform(patch(BASE_URL + "/tickets/{id}/resolve", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

    @Test
    @DisplayName("ucHelpA5_getTicketsByEmployee_returns200")
    void ucHelpA5_getTicketsByEmployee_returns200() throws Exception {
        mockMvc.perform(get(BASE_URL + "/tickets/employee/{employeeId}", EMPLOYEE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucHelpA6_getTicketsByStatus_returns200")
    void ucHelpA6_getTicketsByStatus_returns200() throws Exception {
        mockMvc.perform(get(BASE_URL + "/tickets/status/{status}", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucHelpA7_employeeRole_cannotAccessAnotherEmployeeTicket_returns403")
    void ucHelpA7_employeeRole_cannotAccessAnotherEmployeeTicket_returns403() throws Exception {
        // Create ticket as super admin
        TicketRequest request = buildValidTicketRequest("Hardware issue", "Screen flickering.");
        String responseBody = mockMvc.perform(post(BASE_URL + "/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String ticketId = objectMapper.readTree(responseBody).get("id").asText();

        // Switch to a different employee with only self-view permission
        UUID otherEmployeeId = UUID.randomUUID();
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), otherEmployeeId, Set.of("EMPLOYEE"), restrictedPerms);

        // The service should throw 403 since the ticket belongs to a different employee
        // Note: if the service returns 200 regardless (admin endpoint returns all tickets),
        // mark as disabled with a known bug annotation.
        mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                .andExpect(status().isForbidden());
    }

    // ============================= Helpers =============================

    private TicketRequest buildValidTicketRequest(String subject, String description) {
        return TicketRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .subject(subject)
                .description(description)
                .priority(Ticket.TicketPriority.HIGH)
                .build();
    }
}
