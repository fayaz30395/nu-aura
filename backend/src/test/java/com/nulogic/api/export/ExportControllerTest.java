package com.nulogic.api.export;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.employee.service.EmployeeService;
import com.nulogic.common.export.ExportFormat;
import com.nulogic.common.export.ExportService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import com.nulogic.api.employee.dto.EmployeeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.test.context.support.WithMockUser;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ExportController.class)
@ContextConfiguration(classes = {ExportController.class})
@DisplayName("ExportController audit logging")
class ExportControllerTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExportService exportService;
    @MockitoBean
    private TenantTimeService tenantTimeService;
    @MockitoBean
    private AuditLogService auditLogService;
    @MockitoBean
    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
        SecurityContext.setCurrentUser(USER_ID, USER_ID, Set.of("HR_ADMIN"), java.util.Map.of());
        when(tenantTimeService.now(TENANT_ID)).thenReturn(LocalDateTime.now());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("POST /api/v1/export/employees logs an EXPORT audit entry for the current user on success")
    @WithMockUser
    void exportEmployees_logsExportAudit() throws Exception {
        when(exportService.export(eq(ExportFormat.CSV), any(), any(), any(), any()))
                .thenReturn("id,name".getBytes());
        when(employeeService.getAllEmployees(any())).thenReturn(Page.empty());

        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "CSV")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeRequest(java.util.List.of("employeeCode", "fullName"),
                                java.util.List.of(java.util.Map.of("employeeCode", "FORGED"))))))
                .andExpect(status().isOk());

        verify(auditLogService).logAction(eq("USER"), eq(USER_ID), eq(AuditAction.EXPORT),
                eq(null), eq(null), any(String.class));
    }

    @Test
    @DisplayName("POST /api/v1/export/employees renders server rows and ignores client-supplied data")
    @WithMockUser
    void exportEmployees_usesServerRowsNotClientData() throws Exception {
        EmployeeResponse emp = new EmployeeResponse();
        emp.setEmployeeCode("E-1");
        emp.setFullName("Real Person");
        when(employeeService.getAllEmployees(any())).thenReturn(new PageImpl<>(java.util.List.of(emp)));
        when(exportService.export(eq(ExportFormat.CSV), any(), any(), any(), any())).thenReturn(new byte[]{1});

        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "CSV")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeRequest(java.util.List.of("employeeCode", "fullName"),
                                java.util.List.of(java.util.Map.of("employeeCode", "FORGED", "fullName", "Forged Row"))))))
                .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<java.util.List<java.util.Map<String, Object>>> rows = org.mockito.ArgumentCaptor.forClass(java.util.List.class);
        verify(exportService).export(eq(ExportFormat.CSV), any(), any(), rows.capture(), any());
        org.junit.jupiter.api.Assertions.assertEquals(1, rows.getValue().size());
        org.junit.jupiter.api.Assertions.assertEquals("E-1", rows.getValue().get(0).get("employeeCode"));
        org.junit.jupiter.api.Assertions.assertEquals("Real Person", rows.getValue().get(0).get("fullName"));
    }

    @Test
    @DisplayName("POST /api/v1/export/employees rejects sensitive columns and exports nothing")
    @WithMockUser
    void exportEmployees_rejectsSensitiveColumn() throws Exception {
        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "CSV")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeRequest(java.util.List.of("bankAccountNumber"), java.util.List.of()))))
                .andExpect(status().is4xxClientError());

        org.mockito.Mockito.verifyNoInteractions(exportService);
    }

    private static ExportController.ExportRequest employeeRequest(java.util.List<String> keys,
                                                                  java.util.List<java.util.Map<String, Object>> data) {
        return new ExportController.ExportRequest(keys, data, keys);
    }
}
