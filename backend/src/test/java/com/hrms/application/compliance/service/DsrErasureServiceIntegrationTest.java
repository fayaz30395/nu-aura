package com.hrms.application.compliance.service;

import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.compliance.DsrRequest;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.payroll.EmployeePayrollRecord;
import com.hrms.domain.payroll.GlobalPayrollRun;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.domain.user.AuthProvider;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.compliance.DsrRequestRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.EmployeePayrollRecordRepository;
import com.hrms.infrastructure.payroll.repository.GlobalPayrollRunRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for {@link DsrErasureService} — GDPR Article 17
 * (right to be forgotten) cascade fulfilment.
 *
 * <p>Spins the full Spring context with the H2 in-memory profile so the
 * REQUIRES_NEW propagation on each cascade collaborator behaves exactly as
 * it does in production. The {@code @Transactional} class annotation common
 * to other integration tests is deliberately omitted here — the production
 * cascade uses {@code REQUIRES_NEW} on every step so a test-managed outer
 * transaction would swallow the inner commits and make the assertions
 * indistinguishable from a successful cascade. Instead we clean up
 * explicitly in {@code @AfterEach}.</p>
 *
 * <p>Out of scope: the controller-level authority gate (covered by the
 * controller test suite). Authority is enforced inside the service via
 * {@link SecurityContext#isSystemAdmin()} which {@code TestSecurityConfig}
 * grants — so every test below acts as a SYSTEM_ADMIN fulfilling on behalf
 * of the data subject.</p>
 */
// See note in DsrServiceIntegrationTest — the literal "false" override
// disables RoutingDataSourceConfig's @ConditionalOnProperty so the H2 test
// profile's auto-configured primary dataSource is sufficient.
// "spring.main.allow-circular-references=true" works around a pre-existing
// WebSocketConfig <-> RedisWebSocketRelay circular DI that Spring Boot 3
// rejects by default; allowing it at test-load time lets the full context
// boot without touching production code.
@SpringBootTest(properties = {
        "spring.datasource.replica.url=false",
        "spring.main.allow-circular-references=true"
})
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("DsrErasureService Integration Tests — Article 17 cascade")
class DsrErasureServiceIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID HANDLER_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");

    @Autowired
    private DsrService dsrService;

    @Autowired
    private DsrErasureService dsrErasureService;

    @Autowired
    private DsrRequestRepository dsrRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private SalaryStructureRepository salaryStructureRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private EmployeePayrollRecordRepository payrollRecordRepository;

    @Autowired
    private GlobalPayrollRunRepository payrollRunRepository;

    private UUID dataSubjectUserId;
    private UUID dataSubjectEmployeeId;
    private UUID dsrRequestId;
    private UUID seededLeaveId;
    private UUID seededAttendanceId;
    private UUID seededSalaryId;
    private UUID seededPayrollRunId;
    private UUID seededPayrollRecordId;

    @BeforeEach
    void seedTenantGraph() {
        TenantContext.setCurrentTenant(TENANT_ID);
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(HANDLER_USER_ID, UUID.randomUUID(),
                Set.of("SYSTEM_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        // 1) Subject user with full PII so we can assert each field is wiped.
        User subject = User.builder()
                .email("carol-" + UUID.randomUUID() + "@example.com")
                .firstName("Carol")
                .lastName("Danvers")
                .passwordHash("$2a$10$realbcrypthashreplacedbyanonymizerwithanunguessablevalue")
                .status(User.UserStatus.ACTIVE)
                .authProvider(AuthProvider.LOCAL)
                .mfaEnabled(true)
                .mfaSecret("TOTP-SEED-XYZ")
                .mfaBackupCodes("backup-1,backup-2")
                .build();
        subject.setTenantId(TENANT_ID);
        subject = userRepository.save(subject);
        dataSubjectUserId = subject.getId();

        // 2) Employee row — drives the cascade through HR / payroll / leave.
        Employee employee = Employee.builder()
                .employeeCode("ERASE-" + UUID.randomUUID().toString().substring(0, 8))
                .firstName("Carol")
                .lastName("Danvers")
                .personalEmail("carol.personal@example.com")
                .phoneNumber("+91-9000000000")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .joiningDate(LocalDate.now().minusYears(3))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(subject)
                .build();
        employee.setTenantId(TENANT_ID);
        employee = employeeRepository.save(employee);
        dataSubjectEmployeeId = employee.getId();

        // 3) Salary structure — the §139A path uses payroll records, not this row,
        //    to decide the retention override. The salary row exists so the
        //    forensic count assertion below has something to count.
        SalaryStructure salary = SalaryStructure.builder()
                .employeeId(dataSubjectEmployeeId)
                .effectiveDate(LocalDate.now().minusYears(1))
                .basicSalary(new BigDecimal("50000.00"))
                .isActive(true)
                .build();
        salary.setTenantId(TENANT_ID);
        seededSalaryId = salaryStructureRepository.save(salary).getId();

        // 4) Leave request — should be soft-deleted by the cascade.
        LeaveRequest leave = LeaveRequest.builder()
                .employeeId(dataSubjectEmployeeId)
                .leaveTypeId(UUID.randomUUID())
                .requestNumber("LR-" + UUID.randomUUID().toString().substring(0, 8))
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().minusDays(9))
                .totalDays(new BigDecimal("2.00"))
                .isHalfDay(false)
                .reason("Medical appointment")
                .status(LeaveRequest.LeaveRequestStatus.APPROVED)
                .appliedOn(LocalDateTime.now().minusDays(15))
                .build();
        leave.setTenantId(TENANT_ID);
        seededLeaveId = leaveRequestRepository.save(leave).getId();

        // 5) Attendance row — should also be soft-deleted.
        AttendanceRecord attendance = AttendanceRecord.builder()
                .employeeId(dataSubjectEmployeeId)
                .attendanceDate(LocalDate.now().minusDays(3))
                .status(AttendanceRecord.AttendanceStatus.PRESENT)
                .workDurationMinutes(480)
                .build();
        attendance.setTenantId(TENANT_ID);
        seededAttendanceId = attendanceRecordRepository.save(attendance).getId();

        // 6) DSR row of type ERASURE — what the cascade consumes.
        DsrRequest dsr = dsrService.createErasureRequest(
                dataSubjectUserId, "Article 17 — exercise right to be forgotten");
        dsrRequestId = dsr.getId();
    }

    @AfterEach
    void cleanUp() {
        // Cascade collaborators commit in their own REQUIRES_NEW transactions,
        // so the test-method @Transactional rollback would NOT undo their work.
        // We must clean up the seeded rows explicitly to keep test isolation.
        TenantContext.setCurrentTenant(TENANT_ID);
        try {
            if (seededAttendanceId != null) {
                attendanceRecordRepository.findById(seededAttendanceId).ifPresent(attendanceRecordRepository::delete);
            }
            if (seededLeaveId != null) {
                leaveRequestRepository.findById(seededLeaveId).ifPresent(leaveRequestRepository::delete);
            }
            if (seededPayrollRecordId != null) {
                payrollRecordRepository.findById(seededPayrollRecordId).ifPresent(payrollRecordRepository::delete);
            }
            if (seededPayrollRunId != null) {
                payrollRunRepository.findById(seededPayrollRunId).ifPresent(payrollRunRepository::delete);
            }
            if (seededSalaryId != null) {
                salaryStructureRepository.findById(seededSalaryId).ifPresent(salaryStructureRepository::delete);
            }
            if (dataSubjectEmployeeId != null) {
                employeeRepository.findById(dataSubjectEmployeeId).ifPresent(employeeRepository::delete);
            }
            if (dataSubjectUserId != null) {
                userRepository.findById(dataSubjectUserId).ifPresent(userRepository::delete);
            }
            if (dsrRequestId != null) {
                dsrRequestRepository.findById(dsrRequestId).ifPresent(dsrRequestRepository::delete);
            }
        } catch (RuntimeException ignored) {
            // Best-effort cleanup — the schema is re-created between Spring
            // contexts via ddl-auto=create-drop. Cleanup failures don't fail
            // the test that already produced its assertions.
        }
        TenantContext.clear();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("processErasure anonymises the User row (email + names + MFA wiped, status INACTIVE)")
    void processErasure_anonymizesUserRow() {
        dsrService.processErasure(dsrRequestId);

        User reloaded = userRepository.findById(dataSubjectUserId).orElseThrow();
        assertThat(reloaded.getEmail()).startsWith("anonymized+").endsWith("@erased.invalid");
        assertThat(reloaded.getFirstName()).isEqualTo("ANONYMIZED");
        assertThat(reloaded.getLastName()).isNull();
        assertThat(reloaded.getProfilePictureUrl()).isNull();
        assertThat(reloaded.getMfaSecret()).isNull();
        assertThat(reloaded.getMfaBackupCodes()).isNull();
        assertThat(reloaded.getStatus()).isEqualTo(User.UserStatus.INACTIVE);
        assertThat(reloaded.getAnonymizedAt()).isNotNull();
        // BCrypt-incompatible sentinel — login flow cannot accept any input.
        assertThat(reloaded.getPasswordHash()).startsWith("ERASED:");
    }

    @Test
    @DisplayName("processErasure cascades to the Employee row (firstName=ANONYMIZED, contact PII null)")
    void processErasure_cascadesToEmployee() {
        dsrService.processErasure(dsrRequestId);

        Employee reloaded = employeeRepository.findById(dataSubjectEmployeeId).orElseThrow();
        assertThat(reloaded.getFirstName()).isEqualTo("ANONYMIZED");
        assertThat(reloaded.getLastName()).isNull();
        assertThat(reloaded.getPersonalEmail()).isNull();
        assertThat(reloaded.getPhoneNumber()).isNull();
        assertThat(reloaded.getDateOfBirth()).isNull();
        // Preserved (audit pseudonym + §139A retention check inputs).
        assertThat(reloaded.getEmployeeCode()).isNotBlank();
        assertThat(reloaded.getJoiningDate()).isNotNull();
    }

    @Test
    @DisplayName("processErasure cascades SalaryStructure as a forensic count (rows preserved under §139A)")
    void processErasure_cascadesSalaryStructureForensicCount() {
        dsrService.processErasure(dsrRequestId);

        // Salary rows are retained intact (§139A 7-year window). The cascade
        // is a forensic count today — the row count must still equal the
        // seed count after the erasure.
        List<SalaryStructure> remaining =
                salaryStructureRepository.findAllByTenantIdAndEmployeeId(TENANT_ID, dataSubjectEmployeeId);
        assertThat(remaining).hasSize(1);
        assertThat(remaining.get(0).getBasicSalary()).isEqualByComparingTo("50000.00");
        assertThat(remaining.get(0).getIsActive()).isTrue();
    }

    @Test
    @DisplayName("processErasure soft-deletes LeaveRequest rows for the data subject")
    void processErasure_softDeletesLeaveRequests() {
        dsrService.processErasure(dsrRequestId);

        // findById uses the entity's @Where(is_deleted=false) clause, so a
        // soft-deleted row is invisible. To assert the soft-delete we look
        // through the JpaSpecificationExecutor with an unfiltered predicate
        // — but the @Where applies to all derived/spec queries.
        // Easier: assert the row no longer appears in app-visible queries.
        List<LeaveRequest> visible = leaveRequestRepository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("tenantId"), TENANT_ID),
                cb.equal(root.get("employeeId"), dataSubjectEmployeeId)));
        assertThat(visible).isEmpty();
    }

    @Test
    @DisplayName("processErasure soft-deletes AttendanceRecord rows for the data subject")
    void processErasure_softDeletesAttendance() {
        dsrService.processErasure(dsrRequestId);

        List<AttendanceRecord> visible = attendanceRecordRepository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("tenantId"), TENANT_ID),
                cb.equal(root.get("employeeId"), dataSubjectEmployeeId)));
        assertThat(visible).isEmpty();
    }

    @Test
    @DisplayName("processErasure is idempotent — second invocation on terminal DSR row is a no-op (rejected)")
    void processErasure_idempotent() {
        // First pass — completes the cascade and moves the DSR row to COMPLETED.
        dsrService.processErasure(dsrRequestId);

        DsrRequest afterFirst = dsrRequestRepository.findById(dsrRequestId).orElseThrow();
        assertThat(afterFirst.getStatus()).isEqualTo(DsrRequest.Status.COMPLETED);

        // The service blocks re-processing a terminal DSR row — this is the
        // load-bearing idempotency guard. The collaborators themselves
        // (UserAnonymizer, EmployeeAnonymizer, the redactors) are independently
        // idempotent, but the orchestrator must refuse a re-entry so the
        // legal team isn't paged twice for the same erasure.
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> dsrService.processErasure(dsrRequestId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("terminal");

        // The data is still erased — the user row stayed anonymised.
        User userAfter = userRepository.findById(dataSubjectUserId).orElseThrow();
        assertThat(userAfter.getStatus()).isEqualTo(User.UserStatus.INACTIVE);
        assertThat(userAfter.getAnonymizedAt()).isNotNull();
    }

    @Test
    @DisplayName("processErasure applies ANONYMIZE when payroll exists within 7 years (§139A retention check)")
    void processErasure_appliesAnonymizeWhenPayrollWithin7Years() {
        // Seed a payroll record inside the 7-year retention window — this
        // forces DsrErasureService.resolvePolicies to lock Employee +
        // SalaryStructure to ANONYMIZE regardless of the default matrix.
        GlobalPayrollRun run = GlobalPayrollRun.builder()
                .runCode("RUN-" + UUID.randomUUID().toString().substring(0, 8))
                .payPeriodStart(LocalDate.now().minusYears(1))
                .payPeriodEnd(LocalDate.now().minusYears(1).plusMonths(1))
                .baseCurrency("INR")
                .status(GlobalPayrollRun.PayrollRunStatus.APPROVED)
                .build();
        run.setTenantId(TENANT_ID);
        run = payrollRunRepository.save(run);
        seededPayrollRunId = run.getId();

        EmployeePayrollRecord payroll = EmployeePayrollRecord.builder()
                .payrollRun(run)
                .employeeId(dataSubjectEmployeeId)
                .employeeName("Carol Danvers")
                .localCurrency("INR")
                .baseSalaryLocal(new BigDecimal("50000.00"))
                .build();
        payroll.setTenantId(TENANT_ID);
        seededPayrollRecordId = payrollRecordRepository.save(payroll).getId();

        dsrService.processErasure(dsrRequestId);

        // Employee row exists post-erasure with PII wiped — the §139A override
        // forced ANONYMIZE rather than any deletion path.
        Employee reloadedEmployee = employeeRepository.findById(dataSubjectEmployeeId).orElseThrow();
        assertThat(reloadedEmployee.getFirstName()).isEqualTo("ANONYMIZED");
        assertThat(reloadedEmployee.getPersonalEmail()).isNull();

        // Salary row still present (retention forensic count).
        assertThat(salaryStructureRepository.findAllByTenantIdAndEmployeeId(TENANT_ID, dataSubjectEmployeeId))
                .hasSize(1);

        // The DSR row's adminNotes summary should cite the §139A retention
        // decision so the legal team can quote it back to the data subject.
        DsrRequest reloadedRequest = dsrRequestRepository.findById(dsrRequestId).orElseThrow();
        assertThat(reloadedRequest.getStatus()).isEqualTo(DsrRequest.Status.COMPLETED);
        assertThat(reloadedRequest.getAdminNotes()).contains("ANONYMIZE", "§139A");
    }
}
