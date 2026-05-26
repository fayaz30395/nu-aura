package com.nulogic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.contract.dto.CreateContractRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.contract.ContractType;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for ContractController.
 * Covers UC-CONTRACT-001 through UC-CONTRACT-006.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Contract Controller Integration Tests")
class ContractControllerTest extends AbstractPostgresIntegrationTest {

    private static final String BASE_URL = "/api/v1/contracts";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private UUID employeeId;

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;
    @Autowired
    UserRepository userRepository;
    @Autowired
    EmployeeRepository employeeRepository;

    @BeforeEach
    void setUpSuperAdminContext() {
        employeeId = createEmployee();
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, employeeId, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-CONTRACT-001: Create contract =========================

    @Test
    @DisplayName("ucContractA1_createContract_returns201")
    void ucContractA1_createContract_returns201() throws Exception {
        CreateContractRequest request = buildValidContractRequest("Employment Agreement - John Doe", ContractType.EMPLOYMENT);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Employment Agreement - John Doe"))
                .andExpect(jsonPath("$.type").value("EMPLOYMENT"));
    }

    @Test
    @DisplayName("ucContractA2_createContractMissingTitle_returns400")
    void ucContractA2_createContractMissingTitle_returns400() throws Exception {
        CreateContractRequest request = new CreateContractRequest();
        request.setType(ContractType.NDA);
        request.setStartDate(LocalDate.now());
        // missing title

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucContractA3_getContractById_returns200")
    void ucContractA3_getContractById_returns200() throws Exception {
        CreateContractRequest request = buildValidContractRequest("NDA Agreement", ContractType.NDA);
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String contractId = objectMapper.readTree(body).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/{contractId}", contractId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(contractId));
    }

    @Test
    @DisplayName("ucContractA4_getAllContracts_returns200WithPage")
    void ucContractA4_getAllContracts_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucContractA5_eSignFlow_createAndMarkPendingSignatures_returns200")
    void ucContractA5_eSignFlow_createAndMarkPendingSignatures_returns200() throws Exception {
        CreateContractRequest request = buildValidContractRequest("Vendor Service Agreement", ContractType.SLA);
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String contractId = objectMapper.readTree(body).get("id").asText();

        // Transition DRAFT → PENDING_REVIEW
        mockMvc.perform(patch(BASE_URL + "/{contractId}/mark-pending-review", contractId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_REVIEW"));

        // Transition PENDING_REVIEW → PENDING_SIGNATURES
        mockMvc.perform(patch(BASE_URL + "/{contractId}/mark-pending-signatures", contractId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_SIGNATURES"));
    }

    @Test
    @DisplayName("ucContractA6_employeeRole_cannotViewAnotherEmployeeContract_returns403")
    void ucContractA6_employeeRole_cannotViewAnotherEmployeeContract_returns403() throws Exception {
        // Create contract as super admin
        CreateContractRequest request = buildValidContractRequest("Confidential Agreement", ContractType.NDA);
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String contractId = objectMapper.readTree(body).get("id").asText();

        // Switch to restricted employee
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("EMPLOYEE"), restrictedPerms);

        mockMvc.perform(get(BASE_URL + "/{contractId}", contractId))
                .andExpect(status().isForbidden());
    }

    // ============================= Helpers =============================

    private CreateContractRequest buildValidContractRequest(String title, ContractType type) {
        CreateContractRequest request = new CreateContractRequest();
        request.setTitle(title);
        request.setType(type);
        request.setEmployeeId(employeeId);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusYears(1));
        request.setValue(new BigDecimal("100000.00"));
        request.setCurrency("INR");
        request.setDescription("Standard " + type.name() + " contract");
        return request;
    }

    private UUID createEmployee() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder()
                .email("contract-" + suffix + "@example.com")
                .firstName("Contract")
                .lastName("Employee")
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.save(user);

        Employee employee = Employee.builder()
                .employeeCode("CONTRACT-" + suffix)
                .firstName("Contract")
                .lastName("Employee")
                .personalEmail(savedUser.getEmail())
                .joiningDate(LocalDate.now().minusMonths(1))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(savedUser)
                .build();
        employee.setTenantId(TENANT_ID);
        return employeeRepository.save(employee).getId();
    }
}
