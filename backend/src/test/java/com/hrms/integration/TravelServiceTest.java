package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.travel.dto.CreateTravelRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.travel.TravelRequest.TravelType;
import com.hrms.domain.travel.TravelRequest.TransportMode;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for TravelController.
 * Covers UC-TRAVEL-001 through UC-TRAVEL-006.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Travel Service Integration Tests")
class TravelServiceTest {

    private static final String BASE_URL = "/api/v1/travel";
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
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ========================= UC-TRAVEL-001: Submit travel request =========================

    @Test
    @DisplayName("ucTravelA1_createRequest_returns200")
    void ucTravelA1_createRequest_returns200() throws Exception {
        CreateTravelRequest request = buildValidTravelRequest();

        mockMvc.perform(post(BASE_URL + "/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originCity").value("Mumbai"))
                .andExpect(jsonPath("$.destinationCity").value("Bangalore"));
    }

    @Test
    @DisplayName("ucTravelA2_createRequestMissingPurpose_returns400")
    void ucTravelA2_createRequestMissingPurpose_returns400() throws Exception {
        CreateTravelRequest request = CreateTravelRequest.builder()
                .travelType(TravelType.BUSINESS)
                // missing purpose
                .originCity("Mumbai")
                .destinationCity("Delhi")
                .departureDate(LocalDate.now().plusDays(5))
                .returnDate(LocalDate.now().plusDays(7))
                .build();

        mockMvc.perform(post(BASE_URL + "/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucTravelA3_getRequestById_returns200")
    void ucTravelA3_getRequestById_returns200() throws Exception {
        CreateTravelRequest request = buildValidTravelRequest();
        String responseBody = mockMvc.perform(post(BASE_URL + "/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String requestId = objectMapper.readTree(responseBody).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/requests/{id}", requestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId));
    }

    @Test
    @DisplayName("ucTravelA4_approveRequest_returns200WithApprovedStatus")
    void ucTravelA4_approveRequest_returns200WithApprovedStatus() throws Exception {
        // Create and submit the request
        CreateTravelRequest request = buildValidTravelRequest();
        String createBody = mockMvc.perform(post(BASE_URL + "/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String requestId = objectMapper.readTree(createBody).get("id").asText();

        // Submit for approval
        mockMvc.perform(post(BASE_URL + "/requests/{id}/submit", requestId))
                .andExpect(status().isOk());

        // Approve the request
        mockMvc.perform(post(BASE_URL + "/requests/{id}/approve", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("comments", "Approved for client visit"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("ucTravelA5_getMyRequests_returns200WithPage")
    void ucTravelA5_getMyRequests_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL + "/requests/my")
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucTravelA6_getAllRequests_returns200WithPage")
    void ucTravelA6_getAllRequests_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL + "/requests")
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ============================= Helpers =============================

    private CreateTravelRequest buildValidTravelRequest() {
        return CreateTravelRequest.builder()
                .travelType(TravelType.BUSINESS)
                .purpose("Client meeting at Infosys campus")
                .originCity("Mumbai")
                .destinationCity("Bangalore")
                .departureDate(LocalDate.now().plusDays(7))
                .returnDate(LocalDate.now().plusDays(9))
                .transportMode(TransportMode.FLIGHT)
                .accommodationRequired(true)
                .estimatedCost(new BigDecimal("15000.00"))
                .advanceRequired(new BigDecimal("10000.00"))
                .isInternational(false)
                .visaRequired(false)
                .build();
    }
}
