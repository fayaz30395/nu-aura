package com.nulogic.api.export;

import com.nulogic.application.audit.service.AuditLogService;
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

        ExportController.ExportRequest request = new ExportController.ExportRequest(
                java.util.List.of("id", "name"),
                java.util.List.of(java.util.Map.of("id", "1", "name", "Alice")),
                java.util.List.of("id", "name"));

        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "CSV")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(auditLogService).logAction(eq("USER"), eq(USER_ID), eq(AuditAction.EXPORT),
                eq(null), eq(null), any(String.class));
    }
}
