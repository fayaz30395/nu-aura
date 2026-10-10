package com.nulogic.integration;

import com.nulogic.application.payroll.service.PayslipService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P0-1: validates the two released-only payslip JPQL queries against a real Postgres 16 with the
 * Flyway schema (not mocks). Rolled back per test.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Released-only payslip queries (real Postgres)")
class PayslipReleasedQueriesIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final int YEAR = 2031;

    @Autowired private PayslipRepository payslipRepository;
    @Autowired private PayrollRunRepository payrollRunRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    private final UUID tenantA = UUID.randomUUID();
    private final UUID tenantB = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private PayrollRun draft;

    @BeforeEach
    void seed() {
        // Seeded rows reference synthetic tenants/employees; FK checks are irrelevant to these queries.
        jdbcTemplate.execute("SET LOCAL session_replication_role = replica");
        draft = seedRun(tenantA, 1, PayrollStatus.DRAFT);
        seedRun(tenantA, 2, PayrollStatus.PROCESSED);
        seedRun(tenantA, 3, PayrollStatus.APPROVED);
        seedRun(tenantA, 4, PayrollStatus.LOCKED);
        seedRun(tenantB, 5, PayrollStatus.APPROVED); // same employee id, other tenant
        entityManager.flush();
        entityManager.clear();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private PayrollRun seedRun(UUID tenant, int month, PayrollStatus status) {
        TenantContext.setCurrentTenant(tenant);
        PayrollRun run = payrollRunRepository.save(PayrollRun.builder()
                .payPeriodMonth(month).payPeriodYear(YEAR)
                .payrollDate(LocalDate.of(YEAR, month, 28))
                .status(status).build());
        payslipRepository.save(Payslip.builder()
                .payrollRunId(run.getId()).employeeId(employeeId)
                .payPeriodMonth(month).payPeriodYear(YEAR)
                .payDate(LocalDate.of(YEAR, month, 28))
                .basicSalary(new BigDecimal("1000")).grossSalary(new BigDecimal("1000"))
                .totalDeductions(BigDecimal.ZERO).netSalary(new BigDecimal("1000")).build());
        return run;
    }

    @Test
    @DisplayName("year query returns only APPROVED/LOCKED runs, newest month first, own tenant only")
    void yearQueryReturnsOnlyReleased() {
        List<Payslip> result = payslipRepository.findReleasedByEmployeeAndYear(
                tenantA, employeeId, YEAR, PayslipService.RELEASED_STATUSES);

        assertThat(result).extracting(Payslip::getPayPeriodMonth).containsExactly(4, 3);
    }

    @Test
    @DisplayName("paged query returns only released payslips with correct totals")
    void pagedQueryReturnsOnlyReleased() {
        var page = payslipRepository.findReleasedByEmployeeIdOrderByPeriodDesc(
                tenantA, employeeId, PayslipService.RELEASED_STATUSES, PageRequest.of(0, 1));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(Payslip::getPayPeriodMonth).containsExactly(4);
    }

    @Test
    @DisplayName("status filter is honoured (not hard-coded); a year without released runs is empty")
    void statusFilterIsHonouredAndEmptyYearIsEmpty() {
        assertThat(payslipRepository.findReleasedByEmployeeAndYear(
                tenantA, employeeId, YEAR, List.of(PayrollStatus.DRAFT)))
                .extracting(Payslip::getPayPeriodMonth).containsExactly(1);
        assertThat(payslipRepository.findReleasedByEmployeeAndYear(
                tenantA, employeeId, 2099, PayslipService.RELEASED_STATUSES)).isEmpty();
    }

    @Test
    @DisplayName("a run transitioning to APPROVED makes its payslip appear immediately")
    void statusTransitionIsReflected() {
        TenantContext.setCurrentTenant(tenantA);
        PayrollRun run = payrollRunRepository.findById(draft.getId()).orElseThrow();
        run.setStatus(PayrollStatus.APPROVED);
        payrollRunRepository.saveAndFlush(run);

        assertThat(payslipRepository.findReleasedByEmployeeAndYear(
                tenantA, employeeId, YEAR, PayslipService.RELEASED_STATUSES))
                .extracting(Payslip::getPayPeriodMonth).containsExactly(4, 3, 1);
    }
}
