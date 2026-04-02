package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.FluenceEditLockService;
import com.hrms.application.knowledge.service.FluenceEditLockService.EditLockInfo;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FluenceEditLockController.class)
@ContextConfiguration(classes = {FluenceEditLockController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FluenceEditLockController Unit Tests")
class FluenceEditLockControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FluenceEditLockService editLockService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID tenantId;
    private UUID userId;
    private UUID contentId;
    private EditLockInfo lockInfo;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        contentId = UUID.randomUUID();
        lockInfo = new EditLockInfo(userId.toString(), "John Doe", "2026-04-02T10:00:00");
    }

    @Nested
    @DisplayName("Acquire Lock Tests")
    class AcquireLockTests {

        @Test
        @DisplayName("Should acquire edit lock on content")
        void shouldAcquireLock() throws Exception {
            when(editLockService.acquireLock(any(), anyString(), any(), any(), anyString()))
                    .thenReturn(lockInfo);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(post("/api/v1/fluence/edit-lock/{contentType}/{contentId}", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(true))
                        .andExpect(jsonPath("$.lockedByUserName").value("John Doe"));
            }

            verify(editLockService).acquireLock(eq(tenantId), eq("wiki"), eq(contentId), eq(userId), anyString());
        }
    }

    @Nested
    @DisplayName("Release Lock Tests")
    class ReleaseLockTests {

        @Test
        @DisplayName("Should release edit lock when owned by current user")
        void shouldReleaseLock() throws Exception {
            when(editLockService.releaseLock(any(), anyString(), any(), any())).thenReturn(true);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(delete("/api/v1/fluence/edit-lock/{contentType}/{contentId}", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(false));
            }

            verify(editLockService).releaseLock(eq(tenantId), eq("wiki"), eq(contentId), eq(userId));
        }

        @Test
        @DisplayName("Should return current lock info when lock not owned by current user")
        void shouldReturnLockInfoWhenNotOwned() throws Exception {
            UUID otherUserId = UUID.randomUUID();
            EditLockInfo otherLock = new EditLockInfo(otherUserId.toString(), "Jane Smith", "2026-04-02T09:00:00");

            when(editLockService.releaseLock(any(), anyString(), any(), any())).thenReturn(false);
            when(editLockService.getLockInfo(any(), anyString(), any())).thenReturn(otherLock);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(delete("/api/v1/fluence/edit-lock/{contentType}/{contentId}", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(true))
                        .andExpect(jsonPath("$.lockedByUserName").value("Jane Smith"))
                        .andExpect(jsonPath("$.isOwnLock").value(false));
            }
        }
    }

    @Nested
    @DisplayName("Check Lock Tests")
    class CheckLockTests {

        @Test
        @DisplayName("Should return lock info when content is locked")
        void shouldReturnLockInfoWhenLocked() throws Exception {
            when(editLockService.getLockInfo(any(), anyString(), any())).thenReturn(lockInfo);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(get("/api/v1/fluence/edit-lock/{contentType}/{contentId}", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(true))
                        .andExpect(jsonPath("$.isOwnLock").value(true));
            }
        }

        @Test
        @DisplayName("Should return not locked when no lock exists")
        void shouldReturnNotLockedWhenNoLock() throws Exception {
            when(editLockService.getLockInfo(any(), anyString(), any())).thenReturn(null);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(get("/api/v1/fluence/edit-lock/{contentType}/{contentId}", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(false));
            }
        }
    }

    @Nested
    @DisplayName("Heartbeat Tests")
    class HeartbeatTests {

        @Test
        @DisplayName("Should refresh lock via heartbeat")
        void shouldRefreshLock() throws Exception {
            when(editLockService.refreshLock(any(), anyString(), any(), any())).thenReturn(true);
            when(editLockService.getLockInfo(any(), anyString(), any())).thenReturn(lockInfo);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(put("/api/v1/fluence/edit-lock/{contentType}/{contentId}/heartbeat", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(true))
                        .andExpect(jsonPath("$.isOwnLock").value(true));
            }

            verify(editLockService).refreshLock(eq(tenantId), eq("wiki"), eq(contentId), eq(userId));
        }

        @Test
        @DisplayName("Should return not locked when heartbeat fails")
        void shouldReturnNotLockedWhenHeartbeatFails() throws Exception {
            when(editLockService.refreshLock(any(), anyString(), any(), any())).thenReturn(false);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(put("/api/v1/fluence/edit-lock/{contentType}/{contentId}/heartbeat", "wiki", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locked").value(false));
            }
        }
    }
}
