package com.hrms.api.audit.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.audit.dto.AuditLogResponse;
import com.hrms.api.audit.dto.AuditStatisticsResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.user.RoleScope;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AuditLogController.
 * Tests all query endpoints, security-events (revalidate=true), statistics, and @RequiresPermission annotations.
 */
@WebMvcTest(AuditLogController.class)
@ContextConfiguration(classes = {AuditLogController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AuditLogController Unit Tests")
class AuditLogControllerTest {

    private static final String BASE_URL = "/api/v1/audit";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID ACTOR_ID = UUID.randomUUID();
    private static final UUID ENTITY_ID = UUID.randomUUID();

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    @MockBean
    private MeterRegistry meterRegistry;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private AuditLogResponse sampleLog;
    private Page<AuditLogResponse> singleItemPage;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.AUDIT_VIEW, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);

        sampleLog = AuditLogResponse.builder()
                .id(UUID.randomUUID())
                .entityType("EMPLOYEE")
                .entityId(ENTITY_ID)
                .action(AuditLog.AuditAction.CREATE)
                .actorId(ACTOR_ID)
                .actorEmail("admin@example.com")
                .createdAt(LocalDateTime.now())
                .build();

        singleItemPage = new PageImpl<>(List.of(sampleLog), PageRequest.of(0, 20), 1);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ==================== @RequiresPermission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getAllAuditLogs should require AUDIT_VIEW permission")
        void getAllAuditLogs_shouldRequireAuditViewPermission() throws NoSuchMethodException {
            Method method = AuditLogController.class.getMethod("getAllAuditLogs", Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.AUDIT_VIEW);
        }

        @Test
        @DisplayName("searchAuditLogs should require AUDIT_VIEW permission")
        void searchAuditLogs_shouldRequireAuditViewPermission() throws NoSuchMethodException {
            Method method = AuditLogController.class.getMethod("searchAuditLogs",
                    String.class, AuditLog.AuditAction.class, UUID.class,
                    LocalDateTime.class, LocalDateTime.class, Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.AUDIT_VIEW);
        }

        @Test
        @DisplayName("getSecurityEvents should require AUDIT_VIEW with revalidate=true")
        void getSecurityEvents_shouldRequireAuditViewWithRevalidation() throws NoSuchMethodException {
            Method method = AuditLogController.class.getMethod("getSecurityEvents",
                    LocalDateTime.class, LocalDateTime.class, Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.AUDIT_VIEW);
            // Security-critical endpoint — must have fresh permission revalidation
            assertThat(annotation.revalidate()).isTrue();
        }

        @Test
        @DisplayName("getAuditStatistics should require AUDIT_VIEW permission")
        void getAuditStatistics_shouldRequireAuditViewPermission() throws NoSuchMethodException {
            Method method = AuditLogController.class.getMethod("getAuditStatistics",
                    LocalDateTime.class, LocalDateTime.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.AUDIT_VIEW);
        }

        @Test
        @DisplayName("getAuditLogsByActor should require AUDIT_VIEW permission")
        void getAuditLogsByActor_shouldRequireAuditViewPermission() throws NoSuchMethodException {
            Method method = AuditLogController.class.getMethod("getAuditLogsByActor",
                    UUID.class, Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.AUDIT_VIEW);
        }

        @Test
        @DisplayName("Regular audit endpoints should NOT have revalidate=true")
        void regularAuditEndpoints_shouldNotHaveRevalidation() throws NoSuchMethodException {
            Method getAllMethod = AuditLogController.class.getMethod("getAllAuditLogs", Pageable.class);
            assertThat(getAllMethod.getAnnotation(RequiresPermission.class).revalidate()).isFalse();

            Method searchMethod = AuditLogController.class.getMethod("searchAuditLogs",
                    String.class, AuditLog.AuditAction.class, UUID.class,
                    LocalDateTime.class, LocalDateTime.class, Pageable.class);
            assertThat(searchMethod.getAnnotation(RequiresPermission.class).revalidate()).isFalse();
        }

        @Test
        @DisplayName("AUDIT_VIEW permission constant should have expected value")
        void auditViewPermissionConstant_shouldHaveExpectedValue() {
            assertThat(Permission.AUDIT_VIEW).isEqualTo("AUDIT:VIEW");
        }
    }

    // ==================== GET /api/v1/audit ====================

    @Nested
    @DisplayName("GET /api/v1/audit — List All Audit Logs")
    class GetAllAuditLogsTests {

        @Test
        @DisplayName("Should return paginated audit logs with HTTP 200")
        void getAllAuditLogs_returnsPaginatedLogs() throws Exception {
            when(auditLogService.getAllAuditLogs(any(Pageable.class))).thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "20")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(auditLogService).getAllAuditLogs(any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no audit logs exist")
        void getAllAuditLogs_returnsEmptyPage() throws Exception {
            Page<AuditLogResponse> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(auditLogService.getAllAuditLogs(any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(0))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }
    }

    // ==================== GET /api/v1/audit/search ====================

    @Nested
    @DisplayName("GET /api/v1/audit/search — Search Audit Logs")
    class SearchAuditLogsTests {

        @Test
        @DisplayName("Should search with entity type filter")
        void searchAuditLogs_withEntityTypeFilter() throws Exception {
            when(auditLogService.searchAuditLogs(
                    eq("EMPLOYEE"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL + "/search")
                            .param("entityType", "EMPLOYEE")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(auditLogService).searchAuditLogs(
                    eq("EMPLOYEE"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should search with actor ID filter")
        void searchAuditLogs_withActorIdFilter() throws Exception {
            when(auditLogService.searchAuditLogs(
                    isNull(), isNull(), eq(ACTOR_ID), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL + "/search")
                            .param("actorId", ACTOR_ID.toString())
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(auditLogService).searchAuditLogs(
                    isNull(), isNull(), eq(ACTOR_ID), isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should search with no filters (returns all)")
        void searchAuditLogs_withNoFilters() throws Exception {
            when(auditLogService.searchAuditLogs(
                    isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL + "/search").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    // ==================== GET /api/v1/audit/security-events ====================

    @Nested
    @DisplayName("GET /api/v1/audit/security-events — Security Events (revalidate=true)")
    class GetSecurityEventsTests {

        private static final String START_DATE = "2026-01-01T00:00:00";
        private static final String END_DATE = "2026-03-31T23:59:59";

        @Test
        @DisplayName("Should return security events with HTTP 200")
        void getSecurityEvents_returnsSecurityEvents() throws Exception {
            when(auditLogService.getSecurityEvents(
                    any(LocalDateTime.class), any(LocalDateTime.class), any(Pageable.class)))
                    .thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL + "/security-events")
                            .param("startDate", START_DATE)
                            .param("endDate", END_DATE)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());

            verify(auditLogService).getSecurityEvents(
                    any(LocalDateTime.class), any(LocalDateTime.class), any(Pageable.class));
        }

        @Test
        @DisplayName("Should return 400 when startDate is missing")
        void getSecurityEvents_returns400_whenStartDateMissing() throws Exception {
            mockMvc.perform(get(BASE_URL + "/security-events")
                            .param("endDate", END_DATE)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when endDate is missing")
        void getSecurityEvents_returns400_whenEndDateMissing() throws Exception {
            mockMvc.perform(get(BASE_URL + "/security-events")
                            .param("startDate", START_DATE)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Security events endpoint must have revalidate=true — verified via annotation")
        void securityEvents_annotationHasRevalidateTrue() throws NoSuchMethodException {
            Method method = AuditLogController.class.getMethod("getSecurityEvents",
                    LocalDateTime.class, LocalDateTime.class, Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            // This is the critical assertion — revalidate=true forces fresh DB permission lookup
            assertThat(annotation.revalidate()).isTrue();
        }
    }

    // ==================== GET /api/v1/audit/entity-type/{entityType} ====================

    @Nested
    @DisplayName("GET /api/v1/audit/entity-type/{entityType} — Get By Entity Type")
    class GetByEntityTypeTests {

        @Test
        @DisplayName("Should return audit logs for given entity type")
        void getByEntityType_returnsLogs() throws Exception {
            when(auditLogService.getAuditLogsByEntityType(eq("EMPLOYEE"), any(Pageable.class)))
                    .thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL + "/entity-type/EMPLOYEE").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(auditLogService).getAuditLogsByEntityType(eq("EMPLOYEE"), any(Pageable.class));
        }
    }

    // ==================== GET /api/v1/audit/actor/{actorId} ====================

    @Nested
    @DisplayName("GET /api/v1/audit/actor/{actorId} — Get By Actor")
    class GetByActorTests {

        @Test
        @DisplayName("Should return audit logs for given actor ID")
        void getByActor_returnsLogs() throws Exception {
            when(auditLogService.getAuditLogsByActor(eq(ACTOR_ID), any(Pageable.class)))
                    .thenReturn(singleItemPage);

            mockMvc.perform(get(BASE_URL + "/actor/" + ACTOR_ID).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());

            verify(auditLogService).getAuditLogsByActor(eq(ACTOR_ID), any(Pageable.class));
        }
    }

    // ==================== GET /api/v1/audit/statistics ====================

    @Nested
    @DisplayName("GET /api/v1/audit/statistics — Audit Statistics")
    class GetAuditStatisticsTests {

        @Test
        @DisplayName("Should return statistics for given date range")
        void getAuditStatistics_returnsStatistics() throws Exception {
            AuditStatisticsResponse stats = new AuditStatisticsResponse();
            when(auditLogService.getAuditStatistics(any(LocalDateTime.class), any(LocalDateTime.class)))
                    .thenReturn(stats);

            mockMvc.perform(get(BASE_URL + "/statistics")
                            .param("startDate", "2026-01-01T00:00:00")
                            .param("endDate", "2026-03-31T23:59:59")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(auditLogService).getAuditStatistics(any(LocalDateTime.class), any(LocalDateTime.class));
        }

        @Test
        @DisplayName("Should return 400 when date parameters are missing")
        void getAuditStatistics_returns400_whenDatesMissing() throws Exception {
            mockMvc.perform(get(BASE_URL + "/statistics").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== GET /api/v1/audit/summary ====================

    @Nested
    @DisplayName("GET /api/v1/audit/summary — Audit Summary")
    class GetAuditSummaryTests {

        @Test
        @DisplayName("Should return summary counts map")
        void getAuditSummary_returnsSummaryMap() throws Exception {
            when(auditLogService.getAuditSummary())
                    .thenReturn(Map.of("CREATE", 42L, "UPDATE", 128L, "DELETE", 7L));

            mockMvc.perform(get(BASE_URL + "/summary").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.CREATE").value(42))
                    .andExpect(jsonPath("$.UPDATE").value(128));

            verify(auditLogService).getAuditSummary();
        }
    }

    // ==================== GET /api/v1/audit/entity-types ====================

    @Nested
    @DisplayName("GET /api/v1/audit/entity-types — Reference Data")
    class GetEntityTypesTests {

        @Test
        @DisplayName("Should return list of distinct entity types")
        void getEntityTypes_returnsEntityTypes() throws Exception {
            when(auditLogService.getDistinctEntityTypes())
                    .thenReturn(List.of("EMPLOYEE", "LEAVE_REQUEST", "PAYROLL", "ROLE"));

            mockMvc.perform(get(BASE_URL + "/entity-types").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(4));

            verify(auditLogService).getDistinctEntityTypes();
        }
    }

    // ==================== GET /api/v1/audit/actions ====================

    @Nested
    @DisplayName("GET /api/v1/audit/actions — Available Actions")
    class GetActionsTests {

        @Test
        @DisplayName("Should return all AuditAction enum values")
        void getActions_returnsAllActions() throws Exception {
            mockMvc.perform(get(BASE_URL + "/actions").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }
    }
}
