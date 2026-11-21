package com.nulogic.application.leave.scheduler;

import com.nulogic.application.leave.service.LeaveBalanceService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveAccrualScheduler: active-tenant loop and date boundaries")
class LeaveAccrualSchedulerTest {

    private static final UUID T1 = UUID.fromString("00000000-0000-4000-8000-0000000000a1");
    private static final UUID T2 = UUID.fromString("00000000-0000-4000-8000-0000000000a2");

    @Mock
    private LeaveBalanceService leaveBalanceService;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private TenantRepository tenantRepository;

    private LeaveAccrualScheduler scheduler;
    private final List<Object[]> accruals = new ArrayList<>();

    @BeforeEach
    void setUp() {
        scheduler = new LeaveAccrualScheduler(leaveBalanceService, leaveTypeRepository, employeeRepository, tenantRepository);
        // Record (tenant context at call time, employee, days, period) for every credit.
        lenient().when(leaveBalanceService.accrueLeavePeriodic(any(), any(), any(), any())).thenAnswer(inv -> {
            accruals.add(new Object[]{TenantContext.getCurrentTenant(), inv.getArgument(0), inv.getArgument(2), inv.getArgument(3)});
            return true;
        });
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("iterates the shared active-tenant source; each credit runs under its own tenant; one failing tenant does not stop the next")
    void perTenantContextAndFailureIsolation() {
        when(tenantRepository.findActiveTenantIds()).thenReturn(List.of(T1, T2));
        when(leaveTypeRepository.findAllByTenantIdAndIsActive(T1, true)).thenThrow(new IllegalStateException("tenant 1 broken"));
        givenTenant(T2, monthly(), employee(LocalDate.of(2024, 1, 1)));

        scheduler.accrueForDate(LocalDate.of(2027, 3, 1));

        assertThat(accruals).hasSize(1);
        assertThat(accruals.get(0)[0]).as("credit ran under tenant 2's context").isEqualTo(T2);
        assertThat(TenantContext.getCurrentTenant()).as("context cleared after the run").isNull();
    }

    @Test
    @DisplayName("a tenant-list failure is loud (ShedLock records FAILED), never a silent zero-tenant success")
    void tenantFetchFailurePropagates() {
        when(tenantRepository.findActiveTenantIds()).thenThrow(new DataAccessResourceFailureException("db down"));

        assertThatThrownBy(() -> scheduler.accrueForDate(LocalDate.of(2027, 3, 1)))
                .isInstanceOf(DataAccessResourceFailureException.class);
        verify(leaveBalanceService, never()).accrueLeavePeriodic(any(), any(), any(), any());
    }

    @Test
    @DisplayName("re-running the same day passes the same period key, so the ledger makes the second credit a no-op")
    void sameDayRerunUsesSamePeriod() {
        when(tenantRepository.findActiveTenantIds()).thenReturn(List.of(T1));
        givenTenant(T1, monthly(), employee(LocalDate.of(2024, 1, 1)));

        scheduler.accrueForDate(LocalDate.of(2027, 3, 1));
        scheduler.accrueForDate(LocalDate.of(2027, 3, 1));

        assertThat(accruals).extracting(a -> a[3]).containsExactly(YearMonth.of(2027, 3), YearMonth.of(2027, 3));
    }

    @ParameterizedTest(name = "{0}: QUARTERLY credits {1}")
    @CsvSource({
            "2027-01-01, 3.00",   // year rollover: January is a quarter start
            "2027-04-01, 3.00",
            "2027-02-01, ",       // not a quarter start: nothing
            "2027-12-01, "})
    @DisplayName("quarterly types accrue only on quarter-start months; the period is the run month (Dec -> Jan rollover)")
    void quarterlyAccrual(LocalDate runDate, BigDecimal expected) {
        when(tenantRepository.findActiveTenantIds()).thenReturn(List.of(T1));
        givenTenant(T1, leaveType(LeaveType.AccrualType.QUARTERLY), employee(LocalDate.of(2024, 1, 1)));

        scheduler.accrueForDate(runDate);

        if (expected == null) {
            assertThat(accruals).isEmpty();
        } else {
            assertThat(accruals).hasSize(1);
            assertThat((BigDecimal) accruals.get(0)[2]).isEqualByComparingTo(expected);
            assertThat(accruals.get(0)[3]).isEqualTo(YearMonth.from(runDate));
        }
    }

    @ParameterizedTest(name = "run {0}, joined {1} -> {2}")
    @CsvSource({
            "2028-02-15, 2028-02-10, 0.6897",  // leap February: 20 of 29 days
            "2027-02-15, 2027-02-10, 0.6786",  // common February: 19 of 28 days
            "2027-01-31, 2027-01-31, 0.0323",  // joined on the last day of a 31-day month: 1 of 31
            "2027-03-01, 2027-03-01, 1.00",    // joined on the run day (1st): full month
            "2027-03-01, 2027-02-28, 1.00"})   // joined last month: full month
    @DisplayName("mid-month joiners are prorated over the real month length (leap year, month end)")
    void proration(LocalDate runDate, LocalDate joined, BigDecimal expected) {
        when(tenantRepository.findActiveTenantIds()).thenReturn(List.of(T1));
        givenTenant(T1, monthly(), employee(joined));

        scheduler.accrueForDate(runDate);

        assertThat(accruals).hasSize(1);
        assertThat((BigDecimal) accruals.get(0)[2]).isEqualByComparingTo(expected);
    }

    @Test
    @DisplayName("an employee joining after the run date is not credited")
    void futureJoinerSkipped() {
        when(tenantRepository.findActiveTenantIds()).thenReturn(List.of(T1));
        givenTenant(T1, monthly(), employee(LocalDate.of(2027, 3, 2)));

        scheduler.accrueForDate(LocalDate.of(2027, 3, 1));

        assertThat(accruals).isEmpty();
    }

    private void givenTenant(UUID tenantId, LeaveType type, Employee employee) {
        when(leaveTypeRepository.findAllByTenantIdAndIsActive(tenantId, true)).thenReturn(List.of(type));
        when(employeeRepository.findByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE)).thenReturn(List.of(employee));
    }

    private static LeaveType monthly() {
        return leaveType(LeaveType.AccrualType.MONTHLY);
    }

    private static LeaveType leaveType(LeaveType.AccrualType accrualType) {
        LeaveType type = LeaveType.builder().leaveName("Earned").annualQuota(new BigDecimal("12")).accrualType(accrualType).build();
        type.setId(UUID.randomUUID());
        return type;
    }

    private static Employee employee(LocalDate joined) {
        Employee e = new Employee();
        e.setId(UUID.randomUUID());
        e.setJoiningDate(joined);
        return e;
    }
}
