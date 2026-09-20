package com.nulogic.api.report.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.report.dto.ReportTemplateDto;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.report.service.CustomReportService;
import com.nulogic.common.config.TestMeterRegistryConfig;
import com.nulogic.common.exception.GlobalExceptionHandler;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomReportController.class)
@ContextConfiguration(classes = {CustomReportController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("CustomReportController Unit Tests")
class CustomReportControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CustomReportService customReportService;

    @MockitoBean
    private TenantTimeService tenantTimeService;

    @MockitoBean
    private AuditLogService auditLogService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID currentUserId;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(UUID.randomUUID());
        currentUserId = UUID.randomUUID();
        SecurityContext.setCurrentUser(currentUserId, null, null, null);
        org.mockito.Mockito.lenient().when(tenantTimeService.today(any(UUID.class)))
                .thenReturn(LocalDate.now());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("export should log an EXPORT audit action with the current user id")
    void export_logsAuditActionWithCurrentUser() throws Exception {
        ReportTemplateDto query = ReportTemplateDto.builder()
                .module("EMPLOYEE")
                .build();

        when(customReportService.toCsv(any(ReportTemplateDto.class))).thenReturn("id,name\n1,John");

        mockMvc.perform(post("/api/v1/reports/custom/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(query)))
                .andExpect(status().isOk());

        verify(auditLogService).logAction(
                eq("USER"),
                eq(currentUserId),
                eq(AuditAction.EXPORT),
                isNull(),
                isNull(),
                org.mockito.ArgumentMatchers.contains("EMPLOYEE"));
    }
}
