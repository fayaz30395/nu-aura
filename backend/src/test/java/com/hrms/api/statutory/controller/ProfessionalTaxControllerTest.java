package com.hrms.api.statutory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.*;
import com.hrms.domain.statutory.ProfessionalTaxSlab;
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

@WebMvcTest(ProfessionalTaxController.class)
@ContextConfiguration(classes = {ProfessionalTaxController.class, ProfessionalTaxControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ProfessionalTaxController Unit Tests")
class ProfessionalTaxControllerTest {

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

    private ProfessionalTaxSlab ptSlab;

    @BeforeEach
    void setUp() {
        ptSlab = new ProfessionalTaxSlab();
        ptSlab.setId(UUID.randomUUID());
        ptSlab.setTenantId(UUID.randomUUID());
        ptSlab.setStateCode("KA");
        ptSlab.setMinSalary(new BigDecimal("15000"));
        ptSlab.setMaxSalary(new BigDecimal("25000"));
        ptSlab.setTaxAmount(new BigDecimal("150"));
        ptSlab.setIsActive(true);
    }

    @Test
    @DisplayName("Should create professional tax slab successfully")
    void shouldCreatePTSlab() throws Exception {
        when(statutoryService.createPTSlab(any(ProfessionalTaxSlab.class))).thenReturn(ptSlab);

        mockMvc.perform(post("/api/v1/statutory/pt/slab")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ptSlab)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stateCode").value("KA"))
                .andExpect(jsonPath("$.taxAmount").value(150));

        verify(statutoryService).createPTSlab(any(ProfessionalTaxSlab.class));
    }

    @Test
    @DisplayName("Should return PT slabs by state code")
    void shouldReturnPTSlabsByState() throws Exception {
        when(statutoryService.getPTSlabsByState("KA")).thenReturn(List.of(ptSlab));

        mockMvc.perform(get("/api/v1/statutory/pt/slabs/{stateCode}", "KA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].stateCode").value("KA"));

        verify(statutoryService).getPTSlabsByState("KA");
    }

    @Test
    @DisplayName("Should return empty list for state with no slabs")
    void shouldReturnEmptyForUnknownState() throws Exception {
        when(statutoryService.getPTSlabsByState("XX")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/statutory/pt/slabs/{stateCode}", "XX"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(statutoryService).getPTSlabsByState("XX");
    }

    @Test
    @DisplayName("Should return multiple PT slabs for a state")
    void shouldReturnMultiplePTSlabs() throws Exception {
        ProfessionalTaxSlab slab2 = new ProfessionalTaxSlab();
        slab2.setId(UUID.randomUUID());
        slab2.setStateCode("KA");
        slab2.setMinSalary(new BigDecimal("25001"));
        slab2.setMaxSalary(new BigDecimal("50000"));
        slab2.setTaxAmount(new BigDecimal("200"));
        slab2.setIsActive(true);

        when(statutoryService.getPTSlabsByState("KA")).thenReturn(List.of(ptSlab, slab2));

        mockMvc.perform(get("/api/v1/statutory/pt/slabs/{stateCode}", "KA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].taxAmount").value(150))
                .andExpect(jsonPath("$[1].taxAmount").value(200));

        verify(statutoryService).getPTSlabsByState("KA");
    }

    @Test
    @DisplayName("Should handle different state codes correctly")
    void shouldHandleDifferentStateCodes() throws Exception {
        ProfessionalTaxSlab mhSlab = new ProfessionalTaxSlab();
        mhSlab.setId(UUID.randomUUID());
        mhSlab.setStateCode("MH");
        mhSlab.setTaxAmount(new BigDecimal("200"));
        mhSlab.setIsActive(true);

        when(statutoryService.getPTSlabsByState("MH")).thenReturn(List.of(mhSlab));

        mockMvc.perform(get("/api/v1/statutory/pt/slabs/{stateCode}", "MH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].stateCode").value("MH"));

        verify(statutoryService).getPTSlabsByState("MH");
    }

    @Test
    @DisplayName("Should propagate service exception on slab creation")
    void shouldPropagateExceptionOnCreation() throws Exception {
        when(statutoryService.createPTSlab(any(ProfessionalTaxSlab.class)))
                .thenThrow(new RuntimeException("Duplicate slab"));

        mockMvc.perform(post("/api/v1/statutory/pt/slab")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ptSlab)))
                .andExpect(status().isInternalServerError());

        verify(statutoryService).createPTSlab(any(ProfessionalTaxSlab.class));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
