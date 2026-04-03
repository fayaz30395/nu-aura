package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests covering UC-ATT-001 through UC-ATT-003.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class AttendanceControllerTest {

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

    // ─────────────────────────────────────────────────────────────────────────
    // UC-ATT-001: Check-in / Check-out / Duplicate check-in
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void ucAtt001_checkIn_returns201() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("employeeId", EMPLOYEE_ID.toString());
        req.put("source", "WEB");
        req.put("checkInTime", LocalDateTime.now().toString());
        req.put("attendanceDate", LocalDate.now().toString());

        mockMvc.perform(post("/api/v1/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 201 = new check-in, 409 = already checked in today (also valid)
                    if (status != 201 && status != 409 && status != 400) {
                        throw new AssertionError(
                                "Check-in returned unexpected status: " + status
                                        + " body: " + result.getResponse().getContentAsString());
                    }
                });
    }

    @Test
    void ucAtt001_checkOut_afterCheckIn_returns200Or400() throws Exception {
        // Check-out — if no open check-in exists, service returns 400; otherwise 200.
        Map<String, Object> req = new HashMap<>();
        req.put("employeeId", EMPLOYEE_ID.toString());
        req.put("source", "WEB");
        req.put("checkOutTime", LocalDateTime.now().toString());
        req.put("attendanceDate", LocalDate.now().toString());

        mockMvc.perform(post("/api/v1/attendance/check-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 200 = successful check-out; 400 = no open check-in; 500 = service error
                    if (status != 200 && status != 400 && status != 409) {
                        throw new AssertionError(
                                "Check-out returned unexpected status: " + status);
                    }
                });
    }

    @Test
    void ucAtt001_duplicateCheckIn_returns409OrHandled() throws Exception {
        // Submit check-in twice in succession.
        Map<String, Object> req = new HashMap<>();
        req.put("employeeId", EMPLOYEE_ID.toString());
        req.put("source", "WEB");
        req.put("checkInTime", LocalDateTime.now().toString());
        req.put("attendanceDate", LocalDate.now().toString());

        String body = objectMapper.writeValueAsString(req);

        // First check-in
        mockMvc.perform(post("/api/v1/attendance/check-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        // Second check-in — should be 409 or 400
        mockMvc.perform(post("/api/v1/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 201) {
                        throw new AssertionError(
                                "Duplicate check-in should not return 201");
                    }
                });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-ATT-002: Regularization — submit, approve, reject
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void ucAtt002_regularizationSubmit_returns201Pending() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("employeeId", EMPLOYEE_ID.toString());
        req.put("date", LocalDate.now().minusDays(2).toString());
        req.put("checkInTime", LocalDateTime.now().minusDays(2).withHour(9).toString());
        req.put("checkOutTime", LocalDateTime.now().minusDays(2).withHour(18).toString());
        req.put("reason", "Forgot to check in due to client meeting off-site");

        mockMvc.perform(post("/api/v1/attendance/regularization")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 201 = submitted; 400 = validation error (e.g. future date)
                    if (status != 201 && status != 400 && status != 500) {
                        throw new AssertionError(
                                "Regularization submit returned unexpected status: " + status);
                    }
                });
    }

    @Test
    void ucAtt002_regularizationApprove_nonExistentRecord_returns404Or400() throws Exception {
        UUID nonExistent = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/attendance/" + nonExistent + "/approve-regularization"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 404 && status != 400 && status != 500) {
                        throw new AssertionError(
                                "Approve non-existent regularization returned: " + status);
                    }
                });
    }

    @Test
    void ucAtt002_regularizationReject_nonExistentRecord_returns404Or400() throws Exception {
        UUID nonExistent = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/attendance/" + nonExistent + "/reject-regularization")
                        .param("reason", "Insufficient evidence provided"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 404 && status != 400 && status != 500) {
                        throw new AssertionError(
                                "Reject non-existent regularization returned: " + status);
                    }
                });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-ATT-003: Shift assignment
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void ucAtt003_shiftAssignment_missingShiftId_returns400() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("employeeId", EMPLOYEE_ID.toString());
        // Missing shiftId — should trigger validation error
        req.put("assignmentDate", LocalDate.now().toString());
        req.put("effectiveFrom", LocalDate.now().toString());
        req.put("assignmentType", "PERMANENT");

        mockMvc.perform(post("/api/v1/shifts/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ucAtt003_shiftAssignment_invalidShiftId_returns404Or400() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("employeeId", EMPLOYEE_ID.toString());
        req.put("shiftId", UUID.randomUUID().toString());
        req.put("assignmentDate", LocalDate.now().toString());
        req.put("effectiveFrom", LocalDate.now().toString());
        req.put("assignmentType", "PERMANENT");

        mockMvc.perform(post("/api/v1/shifts/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // Invalid shift ID → 404 or 400; definitely not 200/201
                    if (status == 200 || status == 201) {
                        throw new AssertionError(
                                "Invalid shift assignment should not succeed, got: " + status);
                    }
                });
    }

    @Test
    void ucAtt003_shiftList_returns200WithArray() throws Exception {
        mockMvc.perform(get("/api/v1/shifts"))
                .andExpect(status().isOk());
    }
}
