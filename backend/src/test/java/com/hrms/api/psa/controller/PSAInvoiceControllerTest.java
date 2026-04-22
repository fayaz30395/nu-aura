package com.hrms.api.psa.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.psa.service.PSAService;
import com.hrms.common.security.*;
import com.hrms.domain.psa.PSAInvoice;
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

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PSAInvoiceController.class)
@ContextConfiguration(classes = {PSAInvoiceController.class, PSAInvoiceControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PSAInvoiceController Unit Tests")
class PSAInvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private PSAService psaService;
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

    private UUID invoiceId;
    private UUID projectId;
    private UUID clientId;
    private PSAInvoice invoice;

    @BeforeEach
    void setUp() {
        invoiceId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        clientId = UUID.randomUUID();

        invoice = new PSAInvoice();
        invoice.setId(invoiceId);
        invoice.setStatus(PSAInvoice.InvoiceStatus.DRAFT);
    }

    @Test
    @DisplayName("Should create invoice successfully")
    void shouldCreateInvoiceSuccessfully() throws Exception {
        when(psaService.createInvoice(org.mockito.ArgumentMatchers.any(PSAInvoice.class))).thenReturn(invoice);

        mockMvc.perform(post("/api/v1/psa/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invoice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(invoiceId.toString()))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(psaService).createInvoice(org.mockito.ArgumentMatchers.any(PSAInvoice.class));
    }

    @Test
    @DisplayName("Should get project invoices")
    void shouldGetProjectInvoices() throws Exception {
        when(psaService.getProjectInvoices(projectId))
                .thenReturn(Collections.singletonList(invoice));

        mockMvc.perform(get("/api/v1/psa/invoices/project/{projectId}", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(invoiceId.toString()));

        verify(psaService).getProjectInvoices(projectId);
    }

    @Test
    @DisplayName("Should get client invoices")
    void shouldGetClientInvoices() throws Exception {
        when(psaService.getClientInvoices(clientId))
                .thenReturn(Collections.singletonList(invoice));

        mockMvc.perform(get("/api/v1/psa/invoices/client/{clientId}", clientId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(psaService).getClientInvoices(clientId);
    }

    @Test
    @DisplayName("Should get invoices by status")
    void shouldGetInvoicesByStatus() throws Exception {
        when(psaService.getInvoicesByStatus(PSAInvoice.InvoiceStatus.DRAFT))
                .thenReturn(Collections.singletonList(invoice));

        mockMvc.perform(get("/api/v1/psa/invoices/status/{status}", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("DRAFT"));

        verify(psaService).getInvoicesByStatus(PSAInvoice.InvoiceStatus.DRAFT);
    }

    @Test
    @DisplayName("Should get invoice by ID")
    void shouldGetInvoiceById() throws Exception {
        when(psaService.getInvoice(invoiceId)).thenReturn(Optional.of(invoice));

        mockMvc.perform(get("/api/v1/psa/invoices/{id}", invoiceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(invoiceId.toString()));

        verify(psaService).getInvoice(invoiceId);
    }

    @Test
    @DisplayName("Should return 404 for non-existent invoice")
    void shouldReturn404ForNonExistentInvoice() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(psaService.getInvoice(nonExistentId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/psa/invoices/{id}", nonExistentId))
                .andExpect(status().isNotFound());

        verify(psaService).getInvoice(nonExistentId);
    }

    @Test
    @DisplayName("Should update invoice successfully")
    void shouldUpdateInvoiceSuccessfully() throws Exception {
        PSAInvoice updated = new PSAInvoice();
        updated.setId(invoiceId);
        updated.setStatus(PSAInvoice.InvoiceStatus.SENT);

        when(psaService.updateInvoice(eq(invoiceId), org.mockito.ArgumentMatchers.any(PSAInvoice.class)))
                .thenReturn(Optional.of(updated));

        mockMvc.perform(put("/api/v1/psa/invoices/{id}", invoiceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SENT"));

        verify(psaService).updateInvoice(eq(invoiceId), org.mockito.ArgumentMatchers.any(PSAInvoice.class));
    }

    @Test
    @DisplayName("Should approve invoice successfully")
    void shouldApproveInvoiceSuccessfully() throws Exception {
        PSAInvoice approved = new PSAInvoice();
        approved.setId(invoiceId);
        approved.setStatus(PSAInvoice.InvoiceStatus.PAID);

        when(psaService.approveInvoice(invoiceId)).thenReturn(Optional.of(approved));

        mockMvc.perform(post("/api/v1/psa/invoices/{id}/approve", invoiceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));

        verify(psaService).approveInvoice(invoiceId);
    }

    @Test
    @DisplayName("Should return 404 when approving non-existent invoice")
    void shouldReturn404WhenApprovingNonExistentInvoice() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(psaService.approveInvoice(nonExistentId)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/psa/invoices/{id}/approve", nonExistentId))
                .andExpect(status().isNotFound());

        verify(psaService).approveInvoice(nonExistentId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
