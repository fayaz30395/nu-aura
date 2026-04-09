package com.hrms.api.statutory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.*;
import com.hrms.domain.statutory.EmployeeTDSDeclaration;
import com.hrms.domain.statutory.TDSSlab;
import com.hrms.domain.statutory.TDSSlab.TaxRegime;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TDSController.class)
@ContextConfiguration(classes = {TDSController.class, TDSControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TDSController Unit Tests")
class TDSControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private StatutoryService statutoryService;
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

    private UUID employeeId;
    private TDSSlab tdsSlab;
    private EmployeeTDSDeclaration tdsDeclaration;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();

        tdsSlab = TDSSlab.builder()
                .id(UUID.randomUUID())
                .tenantId(UUID.randomUUID())
                .assessmentYear("2026-27")
                .taxRegime(TaxRegime.NEW_REGIME)
                .minIncome(new BigDecimal("300000"))
                .maxIncome(new BigDecimal("700000"))
                .taxPercentage(new BigDecimal("5.00"))
                .isActive(true)
                .build();

        tdsDeclaration = new EmployeeTDSDeclaration();
        tdsDeclaration.setId(UUID.randomUUID());
        tdsDeclaration.setEmployeeId(employeeId);
        tdsDeclaration.setFinancialYear("2025-26");
        tdsDeclaration.setTenantId(UUID.randomUUID());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create TDS slab successfully")
    void shouldCreateTDSSlab() throws Exception {
        when(statutoryService.createTDSSlab(any(TDSSlab.class))).thenReturn(tdsSlab);

        mockMvc.perform(post("/api/v1/statutory/tds/slab")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tdsSlab)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assessmentYear").value("2026-27"))
                .andExpect(jsonPath("$.taxRegime").value("NEW_REGIME"))
                .andExpect(jsonPath("$.taxPercentage").value(5.00));

        verify(statutoryService).createTDSSlab(any(TDSSlab.class));
    }

    @Test
    @DisplayName("Should return TDS slabs by assessment year and regime")
    void shouldReturnTDSSlabsByYearAndRegime() throws Exception {
        when(statutoryService.getTDSSlabs("2026-27", TaxRegime.NEW_REGIME))
                .thenReturn(List.of(tdsSlab));

        mockMvc.perform(get("/api/v1/statutory/tds/slabs/{assessmentYear}/{regime}",
                        "2026-27", "NEW_REGIME"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].assessmentYear").value("2026-27"));

        verify(statutoryService).getTDSSlabs("2026-27", TaxRegime.NEW_REGIME);
    }

    @Test
    @DisplayName("Should submit TDS declaration")
    void shouldSubmitTDSDeclaration() throws Exception {
        when(statutoryService.submitTDSDeclaration(any(EmployeeTDSDeclaration.class)))
                .thenReturn(tdsDeclaration);

        mockMvc.perform(post("/api/v1/statutory/tds/declaration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tdsDeclaration)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$.financialYear").value("2025-26"));

        verify(statutoryService).submitTDSDeclaration(any(EmployeeTDSDeclaration.class));
    }

    @Test
    @DisplayName("Should return employee TDS declaration when found")
    void shouldReturnEmployeeTDSDeclaration() throws Exception {
        when(statutoryService.getTDSDeclaration(employeeId, "2025-26"))
                .thenReturn(Optional.of(tdsDeclaration));

        mockMvc.perform(get("/api/v1/statutory/tds/declaration/{employeeId}/{financialYear}",
                        employeeId, "2025-26"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.financialYear").value("2025-26"));

        verify(statutoryService).getTDSDeclaration(employeeId, "2025-26");
    }

    @Test
    @DisplayName("Should return 404 when TDS declaration not found")
    void shouldReturn404WhenTDSDeclarationNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        when(statutoryService.getTDSDeclaration(unknownId, "2025-26"))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/statutory/tds/declaration/{employeeId}/{financialYear}",
                        unknownId, "2025-26"))
                .andExpect(status().isNotFound());

        verify(statutoryService).getTDSDeclaration(unknownId, "2025-26");
    }

    @Test
    @DisplayName("Should approve TDS declaration")
    void shouldApproveTDSDeclaration() throws Exception {
        UUID declarationId = tdsDeclaration.getId();
        UUID approverId = UUID.randomUUID();

        EmployeeTDSDeclaration approved = new EmployeeTDSDeclaration();
        approved.setId(declarationId);
        approved.setEmployeeId(employeeId);
        approved.setFinancialYear("2025-26");

        when(statutoryService.approveTDSDeclaration(eq(declarationId), any(UUID.class)))
                .thenReturn(Optional.of(approved));

        mockMvc.perform(put("/api/v1/statutory/tds/declaration/{id}/approve", declarationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approverId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(declarationId.toString()));

        verify(statutoryService).approveTDSDeclaration(eq(declarationId), any(UUID.class));
    }

    @Test
    @DisplayName("Should return 404 when approving non-existent declaration")
    void shouldReturn404WhenApprovingNonExistentDeclaration() throws Exception {
        UUID unknownId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();

        when(statutoryService.approveTDSDeclaration(eq(unknownId), any(UUID.class)))
                .thenReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/statutory/tds/declaration/{id}/approve", unknownId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approverId)))
                .andExpect(status().isNotFound());

        verify(statutoryService).approveTDSDeclaration(eq(unknownId), any(UUID.class));
    }

    @Test
    @DisplayName("Should return TDS slabs for old regime")
    void shouldReturnTDSSlabsForOldRegime() throws Exception {
        TDSSlab oldRegimeSlab = TDSSlab.builder()
                .id(UUID.randomUUID())
                .assessmentYear("2026-27")
                .taxRegime(TaxRegime.OLD_REGIME)
                .minIncome(new BigDecimal("250000"))
                .maxIncome(new BigDecimal("500000"))
                .taxPercentage(new BigDecimal("5.00"))
                .isActive(true)
                .build();

        when(statutoryService.getTDSSlabs("2026-27", TaxRegime.OLD_REGIME))
                .thenReturn(List.of(oldRegimeSlab));

        mockMvc.perform(get("/api/v1/statutory/tds/slabs/{assessmentYear}/{regime}",
                        "2026-27", "OLD_REGIME"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].taxRegime").value("OLD_REGIME"));

        verify(statutoryService).getTDSSlabs("2026-27", TaxRegime.OLD_REGIME);
    }

    @Test
    @DisplayName("Should return empty list for year with no TDS slabs")
    void shouldReturnEmptyForYearWithNoSlabs() throws Exception {
        when(statutoryService.getTDSSlabs("2020-21", TaxRegime.NEW_REGIME))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/statutory/tds/slabs/{assessmentYear}/{regime}",
                        "2020-21", "NEW_REGIME"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(statutoryService).getTDSSlabs("2020-21", TaxRegime.NEW_REGIME);
    }
}
