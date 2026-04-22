package com.hrms.api.compliance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.compliance.dto.*;
import com.hrms.application.compliance.service.ComplianceService;
import com.hrms.common.security.*;
import com.hrms.domain.compliance.*;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ComplianceController.class)
@ContextConfiguration(classes = {ComplianceController.class, ComplianceControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ComplianceController Integration Tests")
class ComplianceControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ComplianceService complianceService;
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

    private UUID policyId;
    private UUID employeeId;
    private UUID alertId;
    private CompliancePolicy policy;
    private CompliancePolicyResponse policyResponse;

    @BeforeEach
    void setUp() {
        policyId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        alertId = UUID.randomUUID();

        policy = new CompliancePolicy();
        policy.setId(policyId);
        policy.setName("Anti-Harassment Policy");
        policy.setCode("POL-001");
        policy.setCategory(CompliancePolicy.PolicyCategory.ANTI_HARASSMENT);
        policy.setStatus(CompliancePolicy.PolicyStatus.DRAFT);
        policy.setEffectiveDate(LocalDate.now());
        policy.setPolicyVersion(1);
        policy.setRequiresAcknowledgment(true);

        policyResponse = CompliancePolicyResponse.from(policy);
    }

    @Test
    @DisplayName("Should create compliance policy successfully")
    void shouldCreatePolicySuccessfully() throws Exception {
        when(complianceService.createPolicy(any(CompliancePolicy.class))).thenReturn(policy);

        mockMvc.perform(post("/api/v1/compliance/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(policy)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Anti-Harassment Policy"))
                .andExpect(jsonPath("$.code").value("POL-001"));

        verify(complianceService).createPolicy(any(CompliancePolicy.class));
    }

    @Test
    @DisplayName("Should get all policies with pagination")
    void shouldGetAllPoliciesWithPagination() throws Exception {
        Page<CompliancePolicy> page = new PageImpl<>(
                Collections.singletonList(policy),
                PageRequest.of(0, 20),
                1
        );

        when(complianceService.getAllPolicies(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/compliance/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(complianceService).getAllPolicies(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get policy by ID")
    void shouldGetPolicyById() throws Exception {
        when(complianceService.getPolicy(policyId)).thenReturn(policy);

        mockMvc.perform(get("/api/v1/compliance/policies/{id}", policyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Anti-Harassment Policy"));

        verify(complianceService).getPolicy(policyId);
    }

    @Test
    @DisplayName("Should publish a draft policy")
    void shouldPublishPolicy() throws Exception {
        CompliancePolicy published = new CompliancePolicy();
        published.setId(policyId);
        published.setName("Anti-Harassment Policy");
        published.setStatus(CompliancePolicy.PolicyStatus.PUBLISHED);

        when(complianceService.publishPolicy(policyId)).thenReturn(published);

        mockMvc.perform(post("/api/v1/compliance/policies/{id}/publish", policyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        verify(complianceService).publishPolicy(policyId);
    }

    @Test
    @DisplayName("Should archive a policy")
    void shouldArchivePolicy() throws Exception {
        CompliancePolicy archived = new CompliancePolicy();
        archived.setId(policyId);
        archived.setStatus(CompliancePolicy.PolicyStatus.ARCHIVED);

        when(complianceService.archivePolicy(policyId)).thenReturn(archived);

        mockMvc.perform(post("/api/v1/compliance/policies/{id}/archive", policyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"));

        verify(complianceService).archivePolicy(policyId);
    }

    @Test
    @DisplayName("Should get policies by category")
    void shouldGetPoliciesByCategory() throws Exception {
        Page<CompliancePolicy> page = new PageImpl<>(
                Collections.singletonList(policy),
                PageRequest.of(0, 20),
                1
        );

        when(complianceService.getPoliciesByCategory(
                eq(CompliancePolicy.PolicyCategory.ANTI_HARASSMENT), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/compliance/policies/category/{category}", "ANTI_HARASSMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(complianceService).getPoliciesByCategory(
                eq(CompliancePolicy.PolicyCategory.ANTI_HARASSMENT), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get audit logs with pagination")
    void shouldGetAuditLogs() throws Exception {
        Page<AuditLog> page = new PageImpl<>(
                Collections.emptyList(),
                PageRequest.of(0, 20),
                0
        );

        when(complianceService.getAuditLogs(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/compliance/audit-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(complianceService).getAuditLogs(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get all alerts with pagination")
    void shouldGetAllAlerts() throws Exception {
        Page<ComplianceAlert> page = new PageImpl<>(
                Collections.emptyList(),
                PageRequest.of(0, 20),
                0
        );

        when(complianceService.getAllAlerts(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/compliance/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(complianceService).getAllAlerts(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get compliance dashboard")
    void shouldGetComplianceDashboard() throws Exception {
        Map<String, Object> dashboard = Map.of(
                "totalPolicies", 25,
                "activeAlerts", 5,
                "pendingAcknowledgments", 12
        );

        when(complianceService.getComplianceDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/compliance/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPolicies").value(25))
                .andExpect(jsonPath("$.activeAlerts").value(5));

        verify(complianceService).getComplianceDashboard();
    }

    @Test
    @DisplayName("Should escalate an alert")
    void shouldEscalateAlert() throws Exception {
        ComplianceAlert alert = new ComplianceAlert();
        alert.setId(alertId);
        alert.setTitle("Compliance Breach");

        when(complianceService.escalateAlert(alertId)).thenReturn(alert);

        mockMvc.perform(post("/api/v1/compliance/alerts/{id}/escalate", alertId))
                .andExpect(status().isOk());

        verify(complianceService).escalateAlert(alertId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
