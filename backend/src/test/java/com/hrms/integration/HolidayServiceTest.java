package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.attendance.controller.HolidayController;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.attendance.Holiday;
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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for HolidayController.
 * Covers UC-ADMIN-002, UC-ADMIN-006 through UC-ADMIN-012.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Holiday Service Integration Tests")
class HolidayServiceTest {

    private static final String BASE_URL = "/api/v1/holidays";
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

    // ========================= UC-ADMIN-002: Create holiday =========================

    @Test
    @DisplayName("ucAdminB1_createHoliday_returns201")
    void ucAdminB1_createHoliday_returns201() throws Exception {
        HolidayController.HolidayRequest request = buildHolidayRequest(
                "Independence Day",
                LocalDate.of(2026, 8, 15),
                Holiday.HolidayType.NATIONAL
        );

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.holidayName").value("Independence Day"))
                .andExpect(jsonPath("$.holidayType").value("NATIONAL"));
    }

    @Test
    @DisplayName("ucAdminB2_createHolidayMissingName_returns400")
    void ucAdminB2_createHolidayMissingName_returns400() throws Exception {
        HolidayController.HolidayRequest request = new HolidayController.HolidayRequest();
        // missing holidayName — validation should fail
        request.setHolidayDate(LocalDate.of(2026, 10, 2));
        request.setHolidayType(Holiday.HolidayType.NATIONAL);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucAdminB3_getHolidaysByYear_returns200WithList")
    void ucAdminB3_getHolidaysByYear_returns200WithList() throws Exception {
        // Create a holiday for 2026 first
        HolidayController.HolidayRequest request = buildHolidayRequest(
                "Republic Day", LocalDate.of(2026, 1, 26), Holiday.HolidayType.NATIONAL
        );
        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(get(BASE_URL + "/year/{year}", 2026))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucAdminB4_getHolidayById_returns200")
    void ucAdminB4_getHolidayById_returns200() throws Exception {
        HolidayController.HolidayRequest request = buildHolidayRequest(
                "Gandhi Jayanti", LocalDate.of(2026, 10, 2), Holiday.HolidayType.NATIONAL
        );
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String holidayId = objectMapper.readTree(body).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/{id}", holidayId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(holidayId))
                .andExpect(jsonPath("$.holidayName").value("Gandhi Jayanti"));
    }

    @Test
    @DisplayName("ucAdminB5_updateHoliday_returns200")
    void ucAdminB5_updateHoliday_returns200() throws Exception {
        HolidayController.HolidayRequest createRequest = buildHolidayRequest(
                "Diwali Original", LocalDate.of(2026, 11, 1), Holiday.HolidayType.NATIONAL
        );
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String holidayId = objectMapper.readTree(body).get("id").asText();

        HolidayController.HolidayRequest updateRequest = buildHolidayRequest(
                "Diwali Updated", LocalDate.of(2026, 11, 1), Holiday.HolidayType.NATIONAL
        );
        updateRequest.setDescription("Festival of lights — updated description");

        mockMvc.perform(put(BASE_URL + "/{id}", holidayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holidayName").value("Diwali Updated"));
    }

    @Test
    @DisplayName("ucAdminB6_deleteHoliday_returns204")
    void ucAdminB6_deleteHoliday_returns204() throws Exception {
        HolidayController.HolidayRequest request = buildHolidayRequest(
                "Optional Holiday", LocalDate.of(2026, 6, 15), Holiday.HolidayType.OPTIONAL
        );
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String holidayId = objectMapper.readTree(body).get("id").asText();

        mockMvc.perform(delete(BASE_URL + "/{id}", holidayId))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("ucAdminB7_employeeRole_cannotCreateHoliday_returns403")
    void ucAdminB7_employeeRole_cannotCreateHoliday_returns403() throws Exception {
        // Switch to restricted employee
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.ATTENDANCE_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("EMPLOYEE"), restrictedPerms);

        HolidayController.HolidayRequest request = buildHolidayRequest(
                "Unauthorized Holiday", LocalDate.of(2026, 12, 25), Holiday.HolidayType.NATIONAL
        );

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ============================= Helpers =============================

    private HolidayController.HolidayRequest buildHolidayRequest(String name,
                                                                 LocalDate date,
                                                                 Holiday.HolidayType type) {
        HolidayController.HolidayRequest request = new HolidayController.HolidayRequest();
        request.setHolidayName(name);
        request.setHolidayDate(date);
        request.setHolidayType(type);
        request.setIsOptional(false);
        request.setIsRestricted(false);
        return request;
    }
}
