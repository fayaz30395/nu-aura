package com.nulogic.integration.isolation;

import com.nulogic.application.attendance.scheduler.AutoRegularizationScheduler;
import com.nulogic.application.compliance.scheduler.PolicyAcknowledgmentReminderScheduler;
import com.nulogic.application.contract.scheduler.ContractLifecycleScheduler;
import com.nulogic.application.document.scheduler.DocumentExpiryScheduler;
import com.nulogic.application.leave.scheduler.LeaveAccrualScheduler;
import com.nulogic.application.recruitment.scheduler.HireReminderScheduler;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * The six per-tenant scheduled jobs against the production RLS shape (app connects as {@code nu_app_rls}).
 * Before the fix every job read {@code tenants.is_active} (no such column) and processed zero tenants.
 *
 * <p>Five synthetic tenants from {@code seed-job-tenant.sql}: two ACTIVE, one ACTIVE whose compliance
 * policy is broken (the policy job must fail for it alone), one SUSPENDED and one soft-deleted ACTIVE.
 * Each job runs twice through its ShedLock proxy (lock expired in between, as for a re-run): the first run must touch
 * exactly the active tenants, the second must change nothing. The mail sender is a mock and must stay
 * untouched; notifications are in-app rows only.</p>
 */
@DisplayName("Scheduled jobs: ACTIVE tenants only, own RLS tenant per run, idempotent")
class ScheduledJobsTenantIterationTest extends AbstractTenantIsolationIntegrationTest {

    private static final ZoneId TENANT_ZONE = ZoneId.of("Asia/Kolkata");
    private static final String SEED_SCRIPT = "db/tenant-isolation/seed-job-tenant.sql";
    private static final int CONTRACT = 0xe;
    private static final int CONTRACT_REMINDER = 0x22;
    private static final int ATTENDANCE = 0x23;
    private static final int EXPIRY_TRACKING = 0x25;
    private static volatile LocalDate today;

    enum JobTenant {
        ACTIVE_1("5cb00001", "ACTIVE", false, "365"),
        ACTIVE_2("5cb00002", "ACTIVE", false, "365"),
        POLICY_BROKEN("5cb0000f", "ACTIVE", false, "NULL"),
        SUSPENDED("5cb00005", "SUSPENDED", false, "365"),
        DELETED("5cb0000d", "ACTIVE", true, "365");

        final String prefix;
        final String status;
        final boolean deleted;
        final String ackWindowDays;

        JobTenant(String prefix, String status, boolean deleted, String ackWindowDays) {
            this.prefix = prefix;
            this.status = status;
            this.deleted = deleted;
            this.ackWindowDays = ackWindowDays;
        }

        UUID id() {
            return id(0, 0);
        }

        UUID id(int type, int n) {
            return UUID.fromString(String.format("%s-%04x-4000-8000-%012x", prefix, type, n));
        }

        boolean active() {
            return "ACTIVE".equals(status) && !deleted;
        }
    }

    @MockitoBean
    private JavaMailSender mailSender;
    @Autowired
    private TenantRepository tenantRepository;
    @Autowired
    private LeaveAccrualScheduler leaveAccrual;
    @Autowired
    private ContractLifecycleScheduler contractLifecycle;
    @Autowired
    private AutoRegularizationScheduler autoRegularization;
    @Autowired
    private DocumentExpiryScheduler documentExpiry;
    @Autowired
    private HireReminderScheduler hireReminders;
    @Autowired
    private PolicyAcknowledgmentReminderScheduler policyReminders;

    @BeforeEach
    void seedJobTenants() throws IOException {
        synchronized (ScheduledJobsTenantIterationTest.class) {
            if (today != null) {
                return;
            }
            LocalDate seedDay = LocalDate.now(TENANT_ZONE);
            String template = new ClassPathResource(SEED_SCRIPT).getContentAsString(StandardCharsets.UTF_8);
            for (JobTenant t : JobTenant.values()) {
                superuserJdbc().execute(template.replace("{{T}}", t.id().toString()).replace("{{P}}", t.prefix)
                        .replace("{{N}}", t.name()).replace("{{S}}", t.status).replace("{{DEL}}", String.valueOf(t.deleted))
                        .replace("{{TODAY}}", seedDay.toString()).replace("{{FREQ}}", t.ackWindowDays));
            }
            today = seedDay;
        }
    }

    @AfterEach
    void noTenantLeftAndNothingSent() {
        assertThat(TenantContext.getCurrentTenant()).as("job left a tenant on the calling thread").isNull();
        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("shared active-tenant source: ACTIVE and not deleted; SUSPENDED and soft-deleted excluded")
    void activeTenantSource() {
        assertThat(tenantRepository.findActiveTenantIds())
                .contains(JobTenant.ACTIVE_1.id(), JobTenant.ACTIVE_2.id(), JobTenant.POLICY_BROKEN.id(),
                        TwoTenantFixture.Tenant.A.id(), TwoTenantFixture.Tenant.B.id())
                .doesNotContain(JobTenant.SUSPENDED.id(), JobTenant.DELETED.id());
    }

    @Test
    @DisplayName("leave accrual: one ledger row per employee in active tenants, credited once across re-runs")
    void leaveAccrual() {
        YearMonth period = YearMonth.now(ZoneOffset.UTC);
        for (int run = 1; run <= 2; run++) {
            runJob("accrueMonthlyLeave", leaveAccrual::accrueMonthlyLeave);
            for (JobTenant t : JobTenant.values()) {
                assertThat(count("SELECT count(*) FROM leave_accrual_ledger WHERE tenant_id = ? AND accrual_period = ?",
                        t.id(), period.toString())).as("%s ledger, run %d", t, run).isEqualTo(t.active() ? 2 : 0);
                if (t.active()) {
                    BigDecimal accrued = superuserJdbc().queryForObject("SELECT accrued FROM leave_balances WHERE tenant_id = ? "
                            + "AND employee_id = ? AND leave_type_id = ? AND year = ?", BigDecimal.class,
                            t.id(), t.id(0x3, 2), t.id(0x5, 1), period.getYear());
                    assertThat(accrued).as("%s balance, run %d", t, run).isEqualByComparingTo("1.00");
                }
            }
        }
        assertThat(count("SELECT count(*) FROM leave_accrual_ledger l JOIN employees e ON e.id = l.employee_id "
                + "WHERE l.tenant_id <> e.tenant_id")).as("ledger row written under another tenant").isZero();
    }

    @Test
    @DisplayName("contract lifecycle: expires, creates one reminder, dispatches due reminder; re-run is a no-op")
    void contractLifecycle() {
        for (int run = 1; run <= 2; run++) {
            runJob("processContractLifecycle", contractLifecycle::processContractLifecycle);
            for (JobTenant t : JobTenant.values()) {
                String why = t + " run " + run;
                assertThat(text("SELECT status FROM contracts WHERE id = ?", t.id(CONTRACT, 1))).as(why)
                        .isEqualTo(t.active() ? "EXPIRED" : "ACTIVE");
                assertThat(text("SELECT status FROM contracts WHERE id = ?", t.id(CONTRACT, 3))).as(why).isEqualTo("ACTIVE");
                assertThat(count("SELECT count(*) FROM contract_reminders WHERE contract_id = ? AND reminder_date = ?",
                        t.id(CONTRACT, 3), today.plusDays(3))).as(why).isEqualTo(t.active() ? 1 : 0);
                assertThat(count("SELECT count(*) FROM contract_reminders WHERE id = ? AND notified_at IS NOT NULL",
                        t.id(CONTRACT_REMINDER, 1))).as(why).isEqualTo(t.active() ? 1 : 0);
                assertThat(notifications(t, "Contract")).as(why).isEqualTo(t.active() ? 1 : 0);
            }
        }
    }

    @Test
    @DisplayName("auto-regularization: INCOMPLETE older than the 3-day grace (inclusive) -> PRESENT, active tenants only")
    void autoRegularization() {
        for (int run = 1; run <= 2; run++) {
            runJob("autoRegularizeAttendance", autoRegularization::autoRegularizeAttendance);
            runJob("autoApproveCompOff", autoRegularization::autoApproveCompOff);
            for (JobTenant t : JobTenant.values()) {
                String regularized = t.active() ? "PRESENT" : "INCOMPLETE";
                assertThat(attendance(t, 10)).as("%s day -10, run %d", t, run).isEqualTo(regularized);
                assertThat(attendance(t, 3)).as("%s day -3 (cutoff), run %d", t, run).isEqualTo(regularized);
                assertThat(attendance(t, 2)).as("%s day -2 (grace), run %d", t, run).isEqualTo("INCOMPLETE");
                assertThat(attendance(t, 1)).as("%s day -1 (grace), run %d", t, run).isEqualTo("INCOMPLETE");
            }
        }
    }

    @Test
    @DisplayName("document expiry: due tracking notified once, future tracking untouched")
    void documentExpiry() {
        for (int run = 1; run <= 2; run++) {
            runJob("processDocumentExpiryReminders", documentExpiry::processDocumentExpiryReminders);
            for (JobTenant t : JobTenant.values()) {
                assertThat(flag("SELECT is_notified FROM document_expiry_tracking WHERE id = ?", t.id(EXPIRY_TRACKING, 1)))
                        .as("%s due tracking, run %d", t, run).isEqualTo(t.active());
                assertThat(flag("SELECT is_notified FROM document_expiry_tracking WHERE id = ?", t.id(EXPIRY_TRACKING, 2)))
                        .as("%s future tracking, run %d", t, run).isFalse();
                assertThat(notifications(t, "Document")).as("%s run %d", t, run).isEqualTo(t.active() ? 1 : 0);
            }
        }
    }

    @Test
    @DisplayName("hire reminders: onboarding task reminds employee + manager once")
    void hireReminders() {
        for (int run = 1; run <= 2; run++) {
            runJob("processHireReminders", hireReminders::processHireReminders);
            for (JobTenant t : JobTenant.values()) {
                assertThat(notifications(t, "ONBOARDING_TASK")).as("%s run %d", t, run).isEqualTo(t.active() ? 2 : 0);
            }
        }
    }

    @Test
    @DisplayName("policy reminders: both employees reminded once; a tenant that throws does not stop the others")
    void policyReminders() {
        Predicate<JobTenant> reminded = t -> t.active() && t != JobTenant.POLICY_BROKEN;
        for (int run = 1; run <= 2; run++) {
            runJob("sendPolicyAcknowledgmentReminders", policyReminders::sendReminders);
            for (JobTenant t : JobTenant.values()) {
                assertThat(count("SELECT count(*) FROM policy_acknowledgment_reminders WHERE tenant_id = ?", t.id()))
                        .as("%s run %d", t, run).isEqualTo(reminded.test(t) ? 2 : 0);
                assertThat(notifications(t, "CompliancePolicy")).as("%s run %d", t, run).isEqualTo(reminded.test(t) ? 2 : 0);
            }
        }
    }

    @Test
    @DisplayName("a per-tenant step runs under its own RLS tenant: under tenant 1 it cannot change tenant 2's rows")
    void perTenantStepCannotCrossTenants() {
        UUID probe = UUID.randomUUID();
        superuserJdbc().update("INSERT INTO contracts (id, tenant_id, title, type, status, start_date, end_date, auto_renew) "
                + "VALUES (?, ?, 'SJOB rls probe', 'EMPLOYMENT', 'ACTIVE', DATE '2024-01-01', ?, false)",
                probe, JobTenant.ACTIVE_2.id(), today.minusDays(5));

        asTenant(JobTenant.ACTIVE_1, () -> assertThat(contractLifecycle.autoExpireContracts(JobTenant.ACTIVE_2.id()))
                .as("tenant-1 transaction saw tenant-2 contracts").isZero());
        assertThat(text("SELECT status FROM contracts WHERE id = ?", probe)).isEqualTo("ACTIVE");

        asTenant(JobTenant.ACTIVE_2, () -> contractLifecycle.autoExpireContracts(JobTenant.ACTIVE_2.id()));
        assertThat(text("SELECT status FROM contracts WHERE id = ?", probe)).as("positive control").isEqualTo("EXPIRED");
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────────────

    /**
     * Runs a job through its ShedLock proxy, as the scheduler does, after expiring its lock (a re-run once
     * lockAtLeastFor has passed). Deleting the row is not enough: ShedLock then only UPDATEs, matches nothing
     * and silently skips the run. The lock row afterwards proves the job really executed.
     */
    private static void runJob(String lockName, Runnable job) {
        JdbcTemplate su = superuserJdbc();
        su.update("UPDATE shedlock SET lock_until = TIMESTAMP '2000-01-01' WHERE name = ?", lockName);
        job.run();
        assertThat(count("SELECT count(*) FROM shedlock WHERE name = ? AND lock_until > TIMESTAMP '2001-01-01'", lockName))
                .as("%s did not run (lock not acquired)", lockName).isEqualTo(1);
    }

    private static void asTenant(JobTenant t, Runnable action) {
        TenantContext.setCurrentTenant(t.id());
        try {
            action.run();
        } finally {
            TenantContext.clear();
        }
    }

    private static long count(String sql, Object... args) {
        return superuserJdbc().queryForObject(sql, Long.class, args);
    }

    private static String text(String sql, Object... args) {
        return superuserJdbc().queryForObject(sql, String.class, args);
    }

    private static boolean flag(String sql, Object... args) {
        return Boolean.TRUE.equals(superuserJdbc().queryForObject(sql, Boolean.class, args));
    }

    private static String attendance(JobTenant t, int daysAgo) {
        return text("SELECT status FROM attendance_records WHERE id = ?", t.id(ATTENDANCE, daysAgo));
    }

    /** In-app notifications of one type in a tenant, each addressed to a user of that same tenant. */
    private static long notifications(JobTenant t, String relatedEntityType) {
        JdbcTemplate su = superuserJdbc();
        assertThat(su.queryForObject("SELECT count(*) FROM notifications n JOIN users u ON u.id = n.user_id "
                + "WHERE n.tenant_id = ? AND u.tenant_id <> n.tenant_id", Long.class, t.id()))
                .as("%s notification addressed to another tenant's user", t).isZero();
        return su.queryForObject("SELECT count(*) FROM notifications WHERE tenant_id = ? AND related_entity_type = ?",
                Long.class, t.id(), relatedEntityType);
    }
}
