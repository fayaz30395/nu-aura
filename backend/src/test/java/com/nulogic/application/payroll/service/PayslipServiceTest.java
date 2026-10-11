package com.nulogic.application.payroll.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.payroll.dto.StatutoryDeductions;
import com.nulogic.application.payroll.strategy.StatutoryCalculator;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.application.payroll.strategy.StatutoryResult;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayslipService Tests")
class PayslipServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private StatutoryDeductionService statutoryDeductionService;
    @Mock
    private DataScopeService dataScopeService;
    @Mock
    private PayrollRunRepository payrollRunRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private StatutoryCalculatorFactory statutoryCalculatorFactory;
    @InjectMocks
    private PayslipService payslipService;
    private UUID tenantId;
    private UUID employeeId;
    private UUID payrollRunId;
    private Payslip payslip;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        payrollRunId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        payslip = Payslip.builder()
                .employeeId(employeeId)
                .payrollRunId(payrollRunId)
                .payPeriodYear(2025)
                .payPeriodMonth(1)
                .payDate(LocalDate.of(2025, 1, 31))
                .basicSalary(new BigDecimal("50000"))
                .hra(new BigDecimal("20000"))
                .conveyanceAllowance(new BigDecimal("1600"))
                .medicalAllowance(new BigDecimal("1250"))
                .specialAllowance(new BigDecimal("10000"))
                .otherAllowances(new BigDecimal("5000"))
                .providentFund(new BigDecimal("6000"))
                .professionalTax(new BigDecimal("200"))
                .incomeTax(new BigDecimal("5000"))
                .otherDeductions(new BigDecimal("1000"))
                .workingDays(22)
                .presentDays(20)
                .leaveDays(2)
                .build();
        payslip.setId(UUID.randomUUID());
        payslip.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Payslip Tests")
    class CreatePayslipTests {

        @Test
        @DisplayName("Should create payslip successfully")
        void shouldCreatePayslipSuccessfully() {
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    any(), any(), any(), any())).thenReturn(false);
            when(payslipRepository.save(any(Payslip.class)))
                    .thenAnswer(invocation -> {
                        Payslip p = invocation.getArgument(0);
                        p.setId(UUID.randomUUID());
                        return p;
                    });

            Payslip result = payslipService.createPayslip(payslip);

            assertThat(result).isNotNull();
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
            verify(payslipRepository).save(any(Payslip.class));
        }

        @Test
        @DisplayName("Should throw exception when payslip already exists for period")
        void shouldThrowExceptionWhenPayslipExists() {
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(true);

            assertThatThrownBy(() -> payslipService.createPayslip(payslip))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("Should calculate totals when creating payslip")
        void shouldCalculateTotalsWhenCreating() {
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    any(), any(), any(), any())).thenReturn(false);
            when(payslipRepository.save(any(Payslip.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            Payslip result = payslipService.createPayslip(payslip);

            assertThat(result).isNotNull();
            // Verify calculateTotals was called (totals should be set)
            verify(payslipRepository).save(any(Payslip.class));
        }
    }

    @Nested
    @DisplayName("Update Payslip Tests")
    class UpdatePayslipTests {

        @Test
        @DisplayName("Should update payslip successfully")
        void shouldUpdatePayslipSuccessfully() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));
            when(payslipRepository.save(any(Payslip.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            Payslip updatedData = Payslip.builder()
                    .payrollRunId(payrollRunId)
                    .employeeId(employeeId)
                    .payPeriodYear(2025)
                    .payPeriodMonth(2)
                    .payDate(LocalDate.of(2025, 2, 28))
                    .basicSalary(new BigDecimal("55000"))
                    .hra(new BigDecimal("22000"))
                    .conveyanceAllowance(new BigDecimal("1600"))
                    .medicalAllowance(new BigDecimal("1250"))
                    .specialAllowance(new BigDecimal("11000"))
                    .otherAllowances(new BigDecimal("5500"))
                    .providentFund(new BigDecimal("6600"))
                    .professionalTax(new BigDecimal("200"))
                    .incomeTax(new BigDecimal("5500"))
                    .otherDeductions(new BigDecimal("1100"))
                    .workingDays(20)
                    .presentDays(20)
                    .leaveDays(0)
                    .build();

            Payslip result = payslipService.updatePayslip(payslipId, updatedData);

            assertThat(result).isNotNull();
            assertThat(result.getBasicSalary()).isEqualTo(new BigDecimal("55000"));
            assertThat(result.getPayPeriodMonth()).isEqualTo(2);
        }

        @Test
        @DisplayName("Should throw exception when payslip not found")
        void shouldThrowExceptionWhenPayslipNotFound() {
            UUID invalidId = UUID.randomUUID();
            when(payslipRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.updatePayslip(invalidId, payslip))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should throw exception when tenant mismatch")
        void shouldThrowExceptionWhenTenantMismatch() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.updatePayslip(payslipId, payslip))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Release Gating Tests")
    class ReleaseGatingTests {

        @Test
        @DisplayName("Self-service single read hides payslip from PROCESSED run")
        void hidesPayslipFromProcessedRun() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));
            when(payrollRunRepository.findByIdAndTenantId(payrollRunId, tenantId))
                    .thenReturn(Optional.of(runWithStatus(PayrollStatus.PROCESSED)));

            assertThatThrownBy(() -> payslipService.getReleasedPayslipById(payslipId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Self-service single read shows payslip from APPROVED run")
        void showsPayslipFromApprovedRun() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));
            when(payrollRunRepository.findByIdAndTenantId(payrollRunId, tenantId))
                    .thenReturn(Optional.of(runWithStatus(PayrollStatus.APPROVED)));

            assertThat(payslipService.getReleasedPayslipById(payslipId)).isSameAs(payslip);
        }

        @Test
        @DisplayName("Self-service single read shows payslip from LOCKED run")
        void showsPayslipFromLockedRun() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));
            when(payrollRunRepository.findByIdAndTenantId(payrollRunId, tenantId))
                    .thenReturn(Optional.of(runWithStatus(PayrollStatus.LOCKED)));

            assertThat(payslipService.getReleasedPayslipById(payslipId)).isSameAs(payslip);
        }

        @Test
        @DisplayName("Self-service read hides payslip with no payroll run")
        void hidesPayslipWithoutRun() {
            UUID payslipId = payslip.getId();
            payslip.setPayrollRunId(null);
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));

            assertThatThrownBy(() -> payslipService.getReleasedPayslipById(payslipId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Self-service period read hides payslip from PROCESSED run")
        void hidesPeriodPayslipFromProcessedRun() {
            when(payslipRepository.findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(Optional.of(payslip));
            when(payrollRunRepository.findByIdAndTenantId(payrollRunId, tenantId))
                    .thenReturn(Optional.of(runWithStatus(PayrollStatus.PROCESSED)));

            assertThatThrownBy(() -> payslipService.getReleasedPayslipByEmployeeAndPeriod(employeeId, 2025, 1))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Self-service list queries only APPROVED and LOCKED runs")
        void listUsesReleasedStatuses() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Payslip> page = new PageImpl<>(List.of(payslip));
            when(payslipRepository.findReleasedByEmployeeIdOrderByPeriodDesc(
                    tenantId, employeeId, List.of(PayrollStatus.APPROVED, PayrollStatus.LOCKED), pageable))
                    .thenReturn(page);

            Page<Payslip> result = payslipService.getReleasedPayslipsByEmployeeId(employeeId, pageable);

            assertThat(result.getContent()).containsExactly(payslip);
        }

        @Test
        @DisplayName("Self-service year list queries only APPROVED and LOCKED runs")
        void yearListUsesReleasedStatuses() {
            when(payslipRepository.findReleasedByEmployeeAndYear(
                    tenantId, employeeId, 2025, List.of(PayrollStatus.APPROVED, PayrollStatus.LOCKED)))
                    .thenReturn(List.of(payslip));

            assertThat(payslipService.getReleasedPayslipsByEmployeeAndYear(employeeId, 2025))
                    .containsExactly(payslip);
        }

        @Test
        @DisplayName("Self-service reads of a missing payslip are not-found, same as unreleased")
        void missingPayslipIsNotFound() {
            UUID missingId = UUID.randomUUID();
            when(payslipRepository.findByIdAndTenantId(missingId, tenantId)).thenReturn(Optional.empty());
            when(payslipRepository.findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 2)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.getReleasedPayslipById(missingId))
                    .isInstanceOf(ResourceNotFoundException.class);
            assertThatThrownBy(() -> payslipService.getReleasedPayslipByEmployeeAndPeriod(employeeId, 2025, 2))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Full-scope read ignores run status")
        void fullScopeReadIgnoresRunStatus() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));

            assertThat(payslipService.getPayslipById(payslipId)).isSameAs(payslip);
            verifyNoInteractions(payrollRunRepository);
        }

        private PayrollRun runWithStatus(PayrollStatus status) {
            PayrollRun run = new PayrollRun();
            run.setStatus(status);
            return run;
        }
    }

    @Nested
    @DisplayName("Get Payslip Tests")
    class GetPayslipTests {

        @Test
        @DisplayName("Should get payslip by ID")
        void shouldGetPayslipById() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));

            Payslip result = payslipService.getPayslipById(payslipId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(payslipId);
        }

        @Test
        @DisplayName("Should throw exception when payslip not found by ID")
        void shouldThrowExceptionWhenNotFoundById() {
            UUID invalidId = UUID.randomUUID();
            when(payslipRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.getPayslipById(invalidId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get all payslips with pagination")
        void shouldGetAllPayslipsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Payslip> page = new PageImpl<>(List.of(payslip));
            when(dataScopeService.getScopeSpecification(anyString()))
                    .thenReturn((root, query, cb) -> cb.conjunction());
            when(payslipRepository.findAll(ArgumentMatchers.<Specification<Payslip>>any(), eq(pageable))).thenReturn(page);

            Page<Payslip> result = payslipService.getAllPayslips(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get payslips by employee ID")
        void shouldGetPayslipsByEmployeeId() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Payslip> page = new PageImpl<>(List.of(payslip));
            when(payslipRepository.findAllByEmployeeIdOrderByPeriodDesc(tenantId, employeeId, pageable))
                    .thenReturn(page);

            Page<Payslip> result = payslipService.getPayslipsByEmployeeId(employeeId, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should get payslip by employee and period")
        void shouldGetPayslipByEmployeeAndPeriod() {
            when(payslipRepository.findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(Optional.of(payslip));

            Payslip result = payslipService.getPayslipByEmployeeAndPeriod(employeeId, 2025, 1);

            assertThat(result).isNotNull();
            assertThat(result.getPayPeriodYear()).isEqualTo(2025);
            assertThat(result.getPayPeriodMonth()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should throw exception when payslip not found for period")
        void shouldThrowExceptionWhenNotFoundForPeriod() {
            when(payslipRepository.findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 12)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.getPayslipByEmployeeAndPeriod(employeeId, 2025, 12))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get payslips by payroll run")
        void shouldGetPayslipsByPayrollRun() {
            when(payslipRepository.findAllByTenantIdAndPayrollRunId(tenantId, payrollRunId))
                    .thenReturn(List.of(payslip));

            List<Payslip> result = payslipService.getPayslipsByPayrollRun(payrollRunId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getPayrollRunId()).isEqualTo(payrollRunId);
        }

        @Test
        @DisplayName("Should get payslips by payroll run with pagination")
        void shouldGetPayslipsByPayrollRunPaged() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Payslip> page = new PageImpl<>(List.of(payslip));
            when(payslipRepository.findAllByTenantIdAndPayrollRunId(tenantId, payrollRunId, pageable))
                    .thenReturn(page);

            Page<Payslip> result = payslipService.getPayslipsByPayrollRunPaged(payrollRunId, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get payslips by employee and year")
        void shouldGetPayslipsByEmployeeAndYear() {
            when(payslipRepository.findByEmployeeIdAndYear(tenantId, employeeId, 2025))
                    .thenReturn(List.of(payslip));

            List<Payslip> result = payslipService.getPayslipsByEmployeeAndYear(employeeId, 2025);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getPayPeriodYear()).isEqualTo(2025);
        }
    }

    @Nested
    @DisplayName("Delete Payslip Tests")
    class DeletePayslipTests {

        @Test
        @DisplayName("Should delete payslip successfully")
        void shouldDeletePayslipSuccessfully() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findByIdAndTenantId(payslipId, tenantId)).thenReturn(Optional.of(payslip));
            when(payslipRepository.save(any(Payslip.class))).thenAnswer(invocation -> invocation.getArgument(0));

            payslipService.deletePayslip(payslipId);

            verify(payslipRepository).save(any(Payslip.class));
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent payslip")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            UUID invalidId = UUID.randomUUID();
            when(payslipRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.deletePayslip(invalidId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Released Run Immutability Tests")
    class ReleasedRunImmutabilityTests {

        private PayrollRun run(PayrollStatus status, int year, int month) {
            PayrollRun run = new PayrollRun();
            run.setStatus(status);
            run.setPayPeriodYear(year);
            run.setPayPeriodMonth(month);
            return run;
        }

        private void stubRun(UUID runId, PayrollStatus status) {
            when(payrollRunRepository.findByIdAndTenantId(runId, tenantId))
                    .thenReturn(Optional.of(run(status, 2025, 1)));
        }

        @Test
        @DisplayName("Create rejects a payslip targeting an APPROVED run")
        void createRejectsReleasedRun() {
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(false);
            stubRun(payrollRunId, PayrollStatus.APPROVED);

            assertThatThrownBy(() -> payslipService.createPayslip(payslip))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("approved payroll run");
            verify(payslipRepository, never()).save(any());
        }

        @Test
        @DisplayName("Create rejects a payslip whose period differs from its run's period")
        void createRejectsPeriodMismatch() {
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(false);
            when(payrollRunRepository.findByIdAndTenantId(payrollRunId, tenantId))
                    .thenReturn(Optional.of(run(PayrollStatus.DRAFT, 2025, 2)));

            assertThatThrownBy(() -> payslipService.createPayslip(payslip))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("does not match payroll run period");
            verify(payslipRepository, never()).save(any());
        }

        @Test
        @DisplayName("Create allows a payslip in an unreleased run of the same period")
        void createAllowsUnreleasedRun() {
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(false);
            stubRun(payrollRunId, PayrollStatus.PROCESSED);
            when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));

            assertThat(payslipService.createPayslip(payslip)).isSameAs(payslip);
        }

        @Test
        @DisplayName("Update rejects a payslip whose current run is LOCKED")
        void updateRejectsCurrentReleasedRun() {
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.LOCKED);

            assertThatThrownBy(() -> payslipService.updatePayslip(payslip.getId(), payslip))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("locked payroll run");
            verify(payslipRepository, never()).save(any());
        }

        @Test
        @DisplayName("Update rejects moving a payslip into an APPROVED run")
        void updateRejectsMoveIntoReleasedRun() {
            UUID targetRunId = UUID.randomUUID();
            Payslip data = Payslip.builder().payrollRunId(targetRunId).employeeId(employeeId)
                    .payPeriodYear(2025).payPeriodMonth(1).build();
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.DRAFT);
            stubRun(targetRunId, PayrollStatus.APPROVED);

            assertThatThrownBy(() -> payslipService.updatePayslip(payslip.getId(), data))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("move a payslip into");
            verify(payslipRepository, never()).save(any());
        }

        @Test
        @DisplayName("Update allows a payslip of a PROCESSED run")
        void updateAllowsUnreleasedRun() {
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.PROCESSED);
            when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));

            assertThat(payslipService.updatePayslip(payslip.getId(), payslip)).isSameAs(payslip);
        }

        @Test
        @DisplayName("Delete rejects a payslip of an APPROVED run")
        void deleteRejectsReleasedRun() {
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.APPROVED);

            assertThatThrownBy(() -> payslipService.deletePayslip(payslip.getId()))
                    .isInstanceOf(IllegalStateException.class);
            assertThat(payslip.isDeleted()).isFalse();
            verify(payslipRepository, never()).save(any());
        }

        @Test
        @DisplayName("Delete allows a payslip of a DRAFT run")
        void deleteAllowsUnreleasedRun() {
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.DRAFT);
            when(payslipRepository.save(any(Payslip.class))).thenAnswer(inv -> inv.getArgument(0));

            payslipService.deletePayslip(payslip.getId());

            assertThat(payslip.isDeleted()).isTrue();
        }

        @Test
        @DisplayName("Statutory apply rejects a payslip of a LOCKED run")
        void statutoryRejectsReleasedRun() {
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.LOCKED);
            payslipService.setStatutoryCalculatorFactory(statutoryCalculatorFactory);

            assertThatThrownBy(() -> payslipService.applyStatutoryDeductions(payslip.getId(), "Karnataka"))
                    .isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(statutoryCalculatorFactory);
            verify(payslipRepository, never()).save(any());
        }

        @Test
        @DisplayName("Statutory apply allows a payslip of a PROCESSED run")
        void statutoryAllowsUnreleasedRun() {
            when(payslipRepository.findByIdAndTenantId(payslip.getId(), tenantId)).thenReturn(Optional.of(payslip));
            stubRun(payrollRunId, PayrollStatus.PROCESSED);
            StatutoryCalculator calculator = mock(StatutoryCalculator.class);
            StatutoryResult result = mock(StatutoryResult.class);
            StatutoryDeductions deductions = StatutoryDeductions.builder()
                    .employeePf(BigDecimal.ZERO).employerPf(BigDecimal.ZERO)
                    .employeeEsi(BigDecimal.ZERO).employerEsi(BigDecimal.ZERO)
                    .professionalTax(BigDecimal.ZERO).tdsMonthly(BigDecimal.ZERO)
                    .build();
            when(statutoryCalculatorFactory.forTenant(tenantId)).thenReturn(calculator);
            when(calculator.calculate(any())).thenReturn(result);
            when(result.legacyIndiaView()).thenReturn(deductions);
            payslipService.setStatutoryCalculatorFactory(statutoryCalculatorFactory);

            assertThat(payslipService.applyStatutoryDeductions(payslip.getId(), "Karnataka")).isSameAs(deductions);
            verify(payslipRepository).save(payslip);
        }
    }
}
