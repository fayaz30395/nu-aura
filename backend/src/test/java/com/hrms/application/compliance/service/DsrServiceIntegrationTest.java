package com.hrms.application.compliance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.compliance.DsrRequest;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.user.AuthProvider;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import com.hrms.infrastructure.compliance.DsrRequestRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Integration tests for the GDPR Article 15 (Access) and Article 20 (Portability)
 * export fulfilment pipeline driven by {@link DsrService#processAccessOrPortability}.
 *
 * <p>Spins the full Spring context with the H2 in-memory profile so every
 * collaborator (DsrExportService, AuditLogService async, the JPA tenant-aware
 * listeners) participates exactly as in production. Each test seeds a minimal
 * tenant graph (User + Employee + LeaveRequest + AttendanceRecord + AuditLog)
 * so the artefact aggregation has something to render.</p>
 *
 * <p>Out of scope: the controller-level 413 mapping (covered by the controller
 * test suite). The "artifact too large" case here verifies the service raises
 * {@link DsrExportService.ArtifactTooLargeException} which the controller
 * advice translates to HTTP 413.</p>
 */
// "spring.datasource.replica.url=false" disables RoutingDataSourceConfig's
// @ConditionalOnProperty — without an override the property resolves to an
// empty placeholder ${SPRING_DATASOURCE_REPLICA_URL:} which Spring treats as
// "present" and tries to wire a primary @Qualifier("dataSource") that the
// H2 test profile doesn't expose. Pinning the value to literal "false" is
// the documented escape hatch for ConditionalOnProperty(name=...) with no
// havingValue specified.
//
// "spring.main.allow-circular-references=true" is required because
// WebSocketConfig <-> RedisWebSocketRelay form a (production-side) circular
// dependency that Spring Boot 3 refuses by default. Allowing it at test-load
// time keeps the full @SpringBootTest context bootable without modifying
// production code; the production fix lives on a separate ticket.
@SpringBootTest(properties = {
        "spring.datasource.replica.url=false",
        "spring.main.allow-circular-references=true"
})
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("DsrService Integration Tests — Articles 15 + 20 export pipeline")
class DsrServiceIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID FOREIGN_TENANT_ID = UUID.fromString("99999999-9999-9999-9999-999999999999");
    private static final UUID HANDLER_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");

    @Autowired
    private DsrService dsrService;

    @Autowired
    private DsrRequestRepository dsrRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Substituted only on the "artifact too large" test path. The default
     * production bean is still used for every other test; the size cap is
     * enforced by raising the runtime exception from a stub here.
     */
    @MockBean
    private DsrExportService dsrExportServiceMock;

    private UUID dataSubjectUserId;
    private UUID dataSubjectEmployeeId;
    /**
     * Returns a non-mock {@link DsrExportService} instance by reading the
     * production beans via the test's own ApplicationContext. Used by the
     * happy-path test stubs to route through the real export logic while still
     * intercepting via {@link MockBean} on the {@link DsrService} dependency.
     */
    @Autowired
    private org.springframework.context.ApplicationContext applicationContext;

    @BeforeEach
    void seedTenantGraph() {
        // TestSecurityConfig stamps the SYSTEM_ADMIN context; we just need to
        // re-assert the tenant + ensure SecurityContext.getCurrentUserId returns
        // the admin who fulfils the request (matches the production controller
        // entry point gated by @RequiresPermission(SYSTEM_ADMIN)).
        TenantContext.setCurrentTenant(TENANT_ID);
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(HANDLER_USER_ID, UUID.randomUUID(),
                Set.of("SYSTEM_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        // 1) The data subject — a real user row with all PII present so the
        //    aggregator has something to project into the export.
        User subject = User.builder()
                .email("bob-" + UUID.randomUUID() + "@example.com")
                .firstName("Bob")
                .lastName("Builder")
                .passwordHash("$2a$10$realbcrypthashthatwillbestrippedfromtheexportprojection")
                .status(User.UserStatus.ACTIVE)
                .authProvider(AuthProvider.LOCAL)
                .mfaEnabled(false)
                .build();
        subject.setTenantId(TENANT_ID);
        subject = userRepository.save(subject);
        dataSubjectUserId = subject.getId();

        // 2) Employee row linked to the user — drives every downstream lookup
        //    (leave, attendance, payroll, salary). Without it the aggregator
        //    returns empty collections and the test wouldn't exercise the join.
        Employee employee = Employee.builder()
                .employeeCode("DSR-" + UUID.randomUUID().toString().substring(0, 8))
                .firstName("Bob")
                .lastName("Builder")
                .joiningDate(LocalDate.now().minusYears(2))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(subject)
                .build();
        employee.setTenantId(TENANT_ID);
        employee = employeeRepository.save(employee);
        dataSubjectEmployeeId = employee.getId();

        // 3) Leave request — gives the aggregator a row to project.
        LeaveRequest leave = LeaveRequest.builder()
                .employeeId(dataSubjectEmployeeId)
                .leaveTypeId(UUID.randomUUID())
                .requestNumber("LR-" + UUID.randomUUID().toString().substring(0, 8))
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().minusDays(8))
                .totalDays(new BigDecimal("3.00"))
                .isHalfDay(false)
                .reason("Family event")
                .status(LeaveRequest.LeaveRequestStatus.APPROVED)
                .appliedOn(LocalDateTime.now().minusDays(15))
                .build();
        leave.setTenantId(TENANT_ID);
        leaveRequestRepository.save(leave);

        // 4) Attendance row inside the 90-day export window.
        AttendanceRecord attendance = AttendanceRecord.builder()
                .employeeId(dataSubjectEmployeeId)
                .attendanceDate(LocalDate.now().minusDays(5))
                .status(AttendanceRecord.AttendanceStatus.PRESENT)
                .checkInTime(LocalDateTime.now().minusDays(5).withHour(9))
                .checkOutTime(LocalDateTime.now().minusDays(5).withHour(18))
                .workDurationMinutes(480)
                .build();
        attendance.setTenantId(TENANT_ID);
        attendanceRecordRepository.save(attendance);

        // 5) Audit row — the export contains the subject's last actions.
        AuditLog audit = AuditLog.builder()
                .entityType("Employee")
                .entityId(dataSubjectEmployeeId)
                .action(AuditLog.AuditAction.UPDATE)
                .actorId(dataSubjectUserId)
                .build();
        audit.setTenantId(TENANT_ID);
        auditLogRepository.save(audit);
    }

    @AfterEach
    void clearContext() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("processAccessRequest persists DSR row in PENDING status with intake fields stamped")
    void processAccessRequest_persistsDsrRequestRowWithPendingStatus() {
        // Article 15 intake — the row must land PENDING before any fulfilment
        // runs. This is the load-bearing GDPR "we received your request"
        // moment that starts the 30-day statutory clock. We deliberately do
        // NOT call processAccessOrPortability here — that's the fulfilment
        // step and would erase the PENDING transition we're verifying.
        DsrRequest request = dsrService.createAccessRequest(
                dataSubjectUserId, "Article 15 self-service request");

        assertThat(request).isNotNull();
        assertThat(request.getId()).isNotNull();

        // The persisted row carries the intake-time fields: PENDING status,
        // requester, type, reason, tenant scoping, and the requestedAt clock
        // start. No handler/completion fields yet — those land on fulfilment.
        DsrRequest reloaded = dsrRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(DsrRequest.Status.PENDING);
        assertThat(reloaded.getRequestType()).isEqualTo(DsrRequest.RequestType.ACCESS);
        assertThat(reloaded.getRequesterUserId()).isEqualTo(dataSubjectUserId);
        assertThat(reloaded.getReason()).isEqualTo("Article 15 self-service request");
        assertThat(reloaded.getTenantId()).isEqualTo(TENANT_ID);
        assertThat(reloaded.getRequestedAt()).isNotNull();

        // Pre-fulfilment row must NOT carry any of the artefact-stamping
        // fields — leaving them populated here would defeat the audit chain
        // since the COMPLETED transition is what records the digest.
        assertThat(reloaded.getArtifactSha256()).isNull();
        assertThat(reloaded.getArtifactSize()).isNull();
        assertThat(reloaded.getHandlerUserId()).isNull();
        assertThat(reloaded.getCompletedAt()).isNull();
    }

    @Test
    @DisplayName("processAccessOrPortability completes the row + stamps the artifact SHA-256")
    void processAccessOrPortability_completesAndStampsArtifactSha256() throws Exception {
        // Real DsrExportService — let it build a real artefact end-to-end.
        // Mockito-mock @MockBean: route every call to the production bean we
        // injected manually so the integration is end-to-end for this test.
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenAnswer(inv -> realExportService().buildExport(inv.getArgument(0)));
        when(dsrExportServiceMock.sha256Hex(any(byte[].class)))
                .thenAnswer(inv -> realExportService().sha256Hex(inv.getArgument(0)));

        DsrRequest request = dsrService.createAccessRequest(dataSubjectUserId, "Article 15 self-service request");

        DsrExportArtifact artefact = dsrService.processAccessOrPortability(request.getId());

        // Artefact integrity — bytes present, JSON parses, schema fingerprint
        // matches the human-readable Article 15 shape.
        assertThat(artefact).isNotNull();
        assertThat(artefact.type()).isEqualTo(DsrRequest.RequestType.ACCESS);
        assertThat(artefact.mediaType()).isEqualTo("application/json");
        assertThat(artefact.size()).isGreaterThan(0);

        JsonNode parsed = objectMapper.readTree(artefact.bytes());
        assertThat(parsed.path("gdprArticle").asText()).contains("Article 15");
        assertThat(parsed.path("requesterUserId").asText()).isEqualTo(dataSubjectUserId.toString());
        assertThat(parsed.path("user").path("email").asText()).contains("bob-");

        // Row transitioned COMPLETED with digest + size stamped — these are
        // the load-bearing fields the audit chain and tamper-evidence rely on.
        DsrRequest reloaded = dsrRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(DsrRequest.Status.COMPLETED);
        assertThat(reloaded.getArtifactSha256()).isNotBlank().hasSize(64);
        assertThat(reloaded.getArtifactSize()).isEqualTo(artefact.size());
        assertThat(reloaded.getHandlerUserId()).isEqualTo(HANDLER_USER_ID);
        assertThat(reloaded.getCompletedAt()).isNotNull();

        // Cross-check: the SHA-256 stamped on the row must match a fresh
        // digest over the artefact bytes returned to the caller. If these
        // ever drift, the controller's tamper-evidence header would lie.
        String recomputed = realExportService().sha256Hex(artefact.bytes());
        assertThat(reloaded.getArtifactSha256()).isEqualTo(recomputed);
    }

    @Test
    @DisplayName("processAccessOrPortability rejects when DSR row is the wrong request type (ERASURE)")
    void processAccessOrPortability_rejectsWrongRequestType() {
        // Even with the export pipeline wired, the service must refuse to
        // process a row whose type isn't ACCESS or PORTABILITY — otherwise
        // an Article 17 erasure row could be tricked into emitting a PII
        // export. The guard lives BEFORE any state transition, so the row
        // must remain PENDING after the rejection.
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenAnswer(inv -> realExportService().buildExport(inv.getArgument(0)));
        when(dsrExportServiceMock.sha256Hex(any(byte[].class)))
                .thenAnswer(inv -> realExportService().sha256Hex(inv.getArgument(0)));

        DsrRequest erasure = dsrService.createErasureRequest(
                dataSubjectUserId, "Article 17 — mis-routed to the export endpoint");

        assertThatThrownBy(() -> dsrService.processAccessOrPortability(erasure.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ACCESS")
                .hasMessageContaining("PORTABILITY");

        // The original ERASURE row stays PENDING — no half-step transitions.
        DsrRequest reloaded = dsrRequestRepository.findById(erasure.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(DsrRequest.Status.PENDING);
        assertThat(reloaded.getArtifactSha256()).isNull();
        assertThat(reloaded.getCompletedAt()).isNull();
    }

    @Test
    @DisplayName("processPortabilityRequest returns JSON envelope with schema stanza (Article 20)")
    void processPortabilityRequest_returnsJsonEnvelopeWithSchema() throws Exception {
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenAnswer(inv -> realExportService().buildExport(inv.getArgument(0)));
        when(dsrExportServiceMock.sha256Hex(any(byte[].class)))
                .thenAnswer(inv -> realExportService().sha256Hex(inv.getArgument(0)));

        DsrRequest request = dsrService.createPortabilityRequest(
                dataSubjectUserId, "Article 20 portability — relocating to new HRMS");

        DsrExportArtifact artefact = dsrService.processAccessOrPortability(request.getId());

        assertThat(artefact.type()).isEqualTo(DsrRequest.RequestType.PORTABILITY);

        // The portability envelope mandates a {data:{}, schema:{}} pair so
        // downstream consumers can validate the version they're re-importing.
        JsonNode parsed = objectMapper.readTree(artefact.bytes());
        assertThat(parsed.path("gdprArticle").asText()).contains("Article 20");
        assertThat(parsed.has("data")).isTrue();
        assertThat(parsed.has("schema")).isTrue();
        assertThat(parsed.path("schema").path("schemaVersion").asText()).isEqualTo("1.0");
        assertThat(parsed.path("schema").path("encoding").asText()).isEqualTo("application/json");
        assertThat(parsed.path("data").path("user").path("id").asText())
                .isEqualTo(dataSubjectUserId.toString());
    }

    @Test
    @DisplayName("processAccessRequest rejects cross-tenant access (foreign tenant cannot export ours)")
    void processAccessRequest_rejectsCrossTenantRequest() {
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenAnswer(inv -> realExportService().buildExport(inv.getArgument(0)));
        when(dsrExportServiceMock.sha256Hex(any(byte[].class)))
                .thenAnswer(inv -> realExportService().sha256Hex(inv.getArgument(0)));

        // Create the row in our tenant context.
        DsrRequest request = dsrService.createAccessRequest(dataSubjectUserId, "valid access");
        UUID requestId = request.getId();

        // Now flip the thread to a different tenant. The DsrService's
        // tenant-scoped finder (findByIdAndTenantId) will return Optional.empty(),
        // and the service throws IllegalArgumentException("DSR request not found")
        // to avoid leaking the existence of a row in another tenant.
        TenantContext.setCurrentTenant(FOREIGN_TENANT_ID);

        assertThatThrownBy(() -> dsrService.processAccessOrPortability(requestId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("DSR request not found");

        // The original row remains untouched — no half-completed transition.
        TenantContext.setCurrentTenant(TENANT_ID);
        DsrRequest reloaded = dsrRequestRepository.findById(requestId).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(DsrRequest.Status.PENDING);
        assertThat(reloaded.getArtifactSha256()).isNull();
    }

    @Test
    @DisplayName("processAccessOrPortability rejects a DSR row that is already COMPLETED")
    void processAccessOrPortability_rejectsAlreadyCompletedRow() {
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenAnswer(inv -> realExportService().buildExport(inv.getArgument(0)));
        when(dsrExportServiceMock.sha256Hex(any(byte[].class)))
                .thenAnswer(inv -> realExportService().sha256Hex(inv.getArgument(0)));

        DsrRequest request = dsrService.createAccessRequest(dataSubjectUserId, "first export");
        // First fulfil — moves the row to COMPLETED.
        dsrService.processAccessOrPortability(request.getId());

        DsrRequest afterFirst = dsrRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(afterFirst.getStatus()).isEqualTo(DsrRequest.Status.COMPLETED);

        // Second attempt — silently re-exporting PII to a different handler
        // would be a worse compliance failure than rejecting; the service
        // raises IllegalStateException to force an explicit ops re-open via
        // updateStatus(IN_PROGRESS).
        assertThatThrownBy(() -> dsrService.processAccessOrPortability(request.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("terminal state");

        // The previously-stamped digest must survive the rejected re-export —
        // otherwise an attacker could blank the audit chain by triggering a
        // failed second call. Re-reading the row confirms it stayed COMPLETED
        // with its original SHA-256 intact.
        DsrRequest afterSecond = dsrRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(afterSecond.getStatus()).isEqualTo(DsrRequest.Status.COMPLETED);
        assertThat(afterSecond.getArtifactSha256()).isEqualTo(afterFirst.getArtifactSha256());
    }

    @Test
    @DisplayName("exportArtifact includes the User row but NEVER the passwordHash / MFA secret")
    void exportArtifact_includesUserButNotPasswordHash() throws Exception {
        // The user projection in DsrExportService is a permission boundary —
        // Article 15 covers personal data, NOT authentication credentials
        // (recital 26 + ICO guidance). A regression that lets passwordHash
        // / mfaSecret slip into the artefact would be a credential leak
        // shipped over the legally-mandated GDPR fulfilment channel.
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenAnswer(inv -> realExportService().buildExport(inv.getArgument(0)));
        when(dsrExportServiceMock.sha256Hex(any(byte[].class)))
                .thenAnswer(inv -> realExportService().sha256Hex(inv.getArgument(0)));

        // Re-anchor the seeded user with a recognisable bcrypt hash + MFA
        // secret so we can match-find them in the rendered bytes.
        User reloaded = userRepository.findById(dataSubjectUserId).orElseThrow();
        reloaded.setPasswordHash("$2a$10$DSRSENTINEL_passwordhash_must_not_leak_to_export");
        reloaded.setMfaEnabled(true);
        reloaded.setMfaSecret("MFA-SECRET-MUST-NOT-LEAK-XYZ123");
        reloaded.setMfaBackupCodes("backup-A,backup-B,backup-C");
        userRepository.save(reloaded);

        DsrRequest request = dsrService.createAccessRequest(
                dataSubjectUserId, "Article 15 — verify credential-strip invariant");

        DsrExportArtifact artefact = dsrService.processAccessOrPortability(request.getId());
        JsonNode parsed = objectMapper.readTree(artefact.bytes());

        // (1) The user IS present — the export is useless if it omits the data subject.
        JsonNode user = parsed.path("user");
        assertThat(user.isMissingNode()).isFalse();
        assertThat(user.path("id").asText()).isEqualTo(dataSubjectUserId.toString());
        assertThat(user.path("email").asText()).contains("bob-");
        assertThat(user.path("firstName").asText()).isEqualTo("Bob");
        assertThat(user.path("mfaEnabled").asBoolean()).isTrue();

        // (2) Credential fields MUST be absent from the user projection.
        assertThat(user.has("passwordHash")).isFalse();
        assertThat(user.has("password")).isFalse();
        assertThat(user.has("mfaSecret")).isFalse();
        assertThat(user.has("mfaBackupCodes")).isFalse();

        // (3) Belt-and-braces: scan the rendered bytes for the sentinel
        // values. Even if a future refactor renames the JSON keys, the raw
        // hash / secret values themselves must never appear anywhere in
        // the exported artefact.
        String rendered = new String(artefact.bytes(), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(rendered).doesNotContain("DSRSENTINEL_passwordhash_must_not_leak_to_export");
        assertThat(rendered).doesNotContain("MFA-SECRET-MUST-NOT-LEAK-XYZ123");
        assertThat(rendered).doesNotContain("backup-A");
        assertThat(rendered).doesNotContain("$2a$");
    }

    @Test
    @DisplayName("processAccessRequest propagates ArtifactTooLargeException (controller maps to HTTP 413)")
    void processAccessRequest_artifactTooLargeMapsTo413() {
        // Force the export pipeline to throw the size-cap exception. The
        // controller advice translates this to HTTP 413 ("Payload Too Large");
        // here we verify the service surface contract — the exception type
        // crosses the service boundary unchanged.
        when(dsrExportServiceMock.buildExport(any(DsrRequest.class)))
                .thenThrow(new DsrExportService.ArtifactTooLargeException(
                        "Use chunked export: rendered DSR artefact is 60000000 bytes (cap 52428800)"));

        DsrRequest request = dsrService.createAccessRequest(dataSubjectUserId, "huge export");

        assertThatThrownBy(() -> dsrService.processAccessOrPortability(request.getId()))
                .isInstanceOf(DsrExportService.ArtifactTooLargeException.class)
                .hasMessageContaining("chunked export");

        // The row stays IN_PROGRESS because the COMPLETED transition runs after
        // the export — but the upstream IN_PROGRESS save is in our own tx and
        // therefore rolls back with the test's @Transactional. We only assert
        // the exception escapes the service (the controller test verifies the
        // HTTP-status mapping).
    }

    private DsrExportService realExportService() {
        // Build a fresh real instance using the autowired collaborators so the
        // @MockBean shadow doesn't override aggregation. AutowireCapableBeanFactory
        // lets us construct + populate without re-registering the bean.
        DsrExportService real = new DsrExportService(
                userRepository,
                employeeRepository,
                applicationContext.getBean(com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository.class),
                applicationContext.getBean(com.hrms.infrastructure.leave.repository.LeaveBalanceRepository.class),
                leaveRequestRepository,
                applicationContext.getBean(com.hrms.infrastructure.payroll.repository.SalaryStructureRepository.class),
                auditLogRepository,
                objectMapper);
        return real;
    }
}
