package com.nulogic.integration;

import com.nulogic.api.payroll.dto.PayslipReleaseStatusResponse;
import com.nulogic.api.payroll.dto.PayslipReleaseStatusResponse.Reason;
import com.nulogic.application.payroll.service.PayslipService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Batch 1: the per-month payslip release-status endpoint, on a real Postgres 16 with the Flyway schema.
 * Covers the service (release states, no-run months, tenant isolation, run status transitions) and the HTTP
 * layer with the real {@code @RequiresPermission} aspect and the controller's own access check.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Payslip release status (real Postgres)")
class PayslipReleaseStatusIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final int YEAR = 2031;

    @Autowired private PayslipService payslipService;
    @Autowired private PayslipRepository payslipRepository;
    @Autowired private PayrollRunRepository payrollRunRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;
    @Autowired private MockMvc mockMvc;

    private final UUID tenantA = UUID.randomUUID();
    private final UUID tenantB = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final UUID otherEmployeeId = UUID.randomUUID();
    private final UUID crossTenantEmployeeId = UUID.randomUUID();   // has an APPROVED payslip, but only in tenant B
    private PayrollRun draftRun;

    @BeforeEach
    void seed() {
        SecurityContext.clear();
        // Synthetic tenants/employees; FK checks are irrelevant to these queries.
        jdbcTemplate.execute("SET LOCAL session_replication_role = replica");
        draftRun = seedRunWithPayslip(tenantA, 1, PayrollStatus.DRAFT, employeeId);
        seedRunWithPayslip(tenantA, 2, PayrollStatus.PROCESSED, employeeId);
        seedRunWithPayslip(tenantA, 3, PayrollStatus.APPROVED, employeeId);
        seedRunWithPayslip(tenantA, 4, PayrollStatus.LOCKED, employeeId);
        seedRunOnly(tenantA, 5, PayrollStatus.APPROVED);                      // run exists, no payslip for the employee
        seedRunWithPayslip(tenantB, 6, PayrollStatus.APPROVED, employeeId);   // same employee id in another tenant
        seedRunWithPayslip(tenantB, 7, PayrollStatus.APPROVED, crossTenantEmployeeId);
        entityManager.flush();
        entityManager.clear();
        TenantContext.setCurrentTenant(tenantA);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    private PayrollRun seedRunOnly(UUID tenant, int month, PayrollStatus status) {
        TenantContext.setCurrentTenant(tenant);
        return payrollRunRepository.save(PayrollRun.builder()
                .payPeriodMonth(month).payPeriodYear(YEAR)
                .payrollDate(LocalDate.of(YEAR, month, 28)).status(status).build());
    }

    private PayrollRun seedRunWithPayslip(UUID tenant, int month, PayrollStatus status, UUID employee) {
        PayrollRun run = seedRunOnly(tenant, month, status);
        payslipRepository.save(Payslip.builder()
                .payrollRunId(run.getId()).employeeId(employee)
                .payPeriodMonth(month).payPeriodYear(YEAR)
                .payDate(LocalDate.of(YEAR, month, 28))
                .basicSalary(new BigDecimal("1000")).grossSalary(new BigDecimal("1000"))
                .totalDeductions(BigDecimal.ZERO).netSalary(new BigDecimal("1000")).build());
        return run;
    }

    private void callerWith(Map<String, RoleScope> permissions, Set<String> roles, UUID callerEmployeeId) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), callerEmployeeId, roles, permissions);
        SecurityContext.setCurrentTenantId(tenantA);
    }

    private void callerSelf(UUID callerEmployeeId) {
        Map<String, RoleScope> p = new HashMap<>();
        p.put(Permission.PAYROLL_VIEW_SELF, RoleScope.SELF);
        callerWith(p, Set.of("EMPLOYEE"), callerEmployeeId);
    }

    private static PayslipReleaseStatusResponse month(List<PayslipReleaseStatusResponse> all, int m) {
        return all.stream().filter(r -> r.month() == m).findFirst().orElseThrow();
    }

    // ---- service ----

    @Test
    @DisplayName("returns all 12 months with the release state of each")
    void returnsTwelveMonthsWithStates() {
        List<PayslipReleaseStatusResponse> result = payslipService.getReleaseStatus(employeeId, YEAR);

        assertThat(result).hasSize(12);
        assertThat(result).extracting(PayslipReleaseStatusResponse::month)
                .containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
        assertThat(month(result, 1).reason()).isEqualTo(Reason.NOT_RELEASED);   // DRAFT run
        assertThat(month(result, 2).reason()).isEqualTo(Reason.NOT_RELEASED);   // PROCESSED run
        assertThat(month(result, 3).reason()).isEqualTo(Reason.RELEASED);       // APPROVED run
        assertThat(month(result, 4).reason()).isEqualTo(Reason.RELEASED);       // LOCKED run
        assertThat(result).filteredOn(PayslipReleaseStatusResponse::released)
                .extracting(PayslipReleaseStatusResponse::month).containsExactly(3, 4);
    }

    @Test
    @DisplayName("a month without a payroll run, or without this employee's payslip, is unreleased with NO_PAYSLIP")
    void noRunOrNoPayslipIsUnreleased() {
        List<PayslipReleaseStatusResponse> result = payslipService.getReleaseStatus(employeeId, YEAR);

        assertThat(month(result, 5).released()).isFalse();           // approved run, but no payslip for the employee
        assertThat(month(result, 5).reason()).isEqualTo(Reason.NO_PAYSLIP);
        assertThat(month(result, 9).released()).isFalse();           // no run at all
        assertThat(month(result, 9).reason()).isEqualTo(Reason.NO_PAYSLIP);
    }

    @Test
    @DisplayName("tenant isolation: another tenant's released payslip for the same employee id is not visible")
    void otherTenantIsInvisible() {
        List<PayslipReleaseStatusResponse> result = payslipService.getReleaseStatus(employeeId, YEAR);

        assertThat(month(result, 6).reason()).isEqualTo(Reason.NO_PAYSLIP);
    }

    @Test
    @DisplayName("a run moving to APPROVED releases its month")
    void runTransitionToApprovedReleasesMonth() {
        assertThat(month(payslipService.getReleaseStatus(employeeId, YEAR), 1).released()).isFalse();

        PayrollRun run = payrollRunRepository.findById(draftRun.getId()).orElseThrow();
        run.setStatus(PayrollStatus.APPROVED);
        payrollRunRepository.saveAndFlush(run);

        assertThat(month(payslipService.getReleaseStatus(employeeId, YEAR), 1).reason()).isEqualTo(Reason.RELEASED);
    }

    @Test
    @DisplayName("run status lookup for a period is tenant scoped")
    void runStatusForPeriodIsTenantScoped() {
        assertThat(payslipService.getRunStatusForPeriod(YEAR, 5)).contains(PayrollStatus.APPROVED);
        assertThat(payslipService.getRunStatusForPeriod(YEAR, 6)).isEmpty();   // exists only in tenant B
        assertThat(payslipService.getRunStatusForPeriod(YEAR, 9)).isEmpty();
    }

    // ---- HTTP + authorization ----

    private static final String URL = "/api/v1/payroll/payslips/employee/{id}/release-status";

    @Test
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("self: own release status is returned, with no salary fields")
    void selfCanReadOwnStatus() throws Exception {
        callerSelf(employeeId);

        mockMvc.perform(get(URL, employeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[2].month").value(3))
                .andExpect(jsonPath("$[2].released").value(true))
                .andExpect(jsonPath("$[2].reason").value("RELEASED"))
                .andExpect(jsonPath("$[0].reason").value("NOT_RELEASED"))
                .andExpect(jsonPath("$[0].netSalary").doesNotExist())
                .andExpect(jsonPath("$[0].grossSalary").doesNotExist())
                .andExpect(jsonPath("$[0].basicSalary").doesNotExist());
    }

    @Test
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("self: another employee's release status is denied")
    void selfCannotReadAnotherEmployee() throws Exception {
        callerSelf(otherEmployeeId);

        mockMvc.perform(get(URL, employeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "hr@test.com", roles = {"HR_MANAGER"})
    @DisplayName("PAYROLL_VIEW_ALL: any employee in the tenant is allowed")
    void viewAllCanReadAnyEmployee() throws Exception {
        Map<String, RoleScope> p = new HashMap<>();
        p.put(Permission.PAYROLL_VIEW_ALL, RoleScope.ALL);
        callerWith(p, Set.of("HR_MANAGER"), otherEmployeeId);

        mockMvc.perform(get(URL, employeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[3].reason").value("RELEASED"));
    }

    @Test
    @WithMockUser(username = "hr@test.com", roles = {"HR_MANAGER"})
    @DisplayName("cross-tenant: a tenant A caller with PAYROLL_VIEW_ALL learns nothing about an employee who only has data in tenant B")
    void crossTenantEmployeeRevealsNothing() throws Exception {
        Map<String, RoleScope> p = new HashMap<>();
        p.put(Permission.PAYROLL_VIEW_ALL, RoleScope.ALL);
        callerWith(p, Set.of("HR_MANAGER"), otherEmployeeId);

        mockMvc.perform(get(URL, crossTenantEmployeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[?(@.released == true)]").isEmpty())
                .andExpect(jsonPath("$[?(@.reason != 'NO_PAYSLIP')]").isEmpty());
    }

    @Test
    @WithMockUser(username = "root@test.com", roles = {"SUPER_ADMIN"})
    @DisplayName("super admin: allowed even without an explicit payroll permission entry")
    void superAdminAllowed() throws Exception {
        Map<String, RoleScope> p = new HashMap<>();
        p.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        callerWith(p, Set.of("SUPER_ADMIN"), otherEmployeeId);

        mockMvc.perform(get(URL, employeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "nobody@test.com", roles = {"EMPLOYEE"})
    @DisplayName("a caller with no payroll permission is denied")
    void callerWithoutPayrollPermissionDenied() throws Exception {
        callerWith(new HashMap<>(), Set.of("EMPLOYEE"), employeeId);

        mockMvc.perform(get(URL, employeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("no authenticated caller context is not served")
    void unauthenticatedIsNotServed() throws Exception {
        SecurityContext.clear();

        mockMvc.perform(get(URL, employeeId).param("year", String.valueOf(YEAR)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("an out-of-range year is rejected with 400")
    void invalidYearRejected() throws Exception {
        callerSelf(employeeId);

        mockMvc.perform(get(URL, employeeId).param("year", "1800"))
                .andExpect(status().isBadRequest());
    }
}
