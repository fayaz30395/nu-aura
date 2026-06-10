package com.nulogic.application.payroll.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.attendance.Holiday;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.payroll.PayrollAdjustment;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.domain.payroll.SalaryStructure;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.payroll.repository.PayrollAdjustmentRepository;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("PayrollRunService Tests")
class PayrollRunServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private PayrollRunRepository payrollRunRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private SalaryStructureRepository salaryStructureRepository;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private PayrollPeriodLock payrollPeriodLock;
    @Mock
    private com.nulogic.common.util.TenantTimeService tenantTimeService;
    @Mock
    private PayrollAdjustmentRepository payrollAdjustmentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private StatutoryCalculatorFactory statutoryCalculatorFactory;
    @InjectMocks
    private PayrollRunService payrollRunService;
    private UUID tenantId;
    private UUID userId;
    private PayrollRun payrollRun;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUpTenantTimeServiceDefaults() {
        lenient().when(tenantTimeService.today(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDate.now());
        lenient().when(tenantTimeService.now(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDateTime.now());
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of());

        payrollRun = PayrollRun.builder()
                .payPeriodYear(2025)
                .payPeriodMonth(1)
                .payrollDate(LocalDate.of(2025, 1, 31))
                .status(PayrollStatus.DRAFT)
                .remarks("January 2025 Payroll")
                .build();
        payrollRun.setId(UUID.randomUUID());
        payrollRun.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Payroll Run")
    class CreatePayrollRunTests {

        @Test
        @DisplayName("Should create payroll run successfully")
        void shouldCreatePayrollRunSuccessfully() {
            when(payrollRunRepository.findByTenantIdAndPeriodForUpdate(
                    tenantId, 2025, 1)).thenReturn(Optional.empty());
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            PayrollRun result = payrollRunService.createPayrollRun(payrollRun);

            assertThat(result).isNotNull();
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getPayPeriodYear()).isEqualTo(2025);
            assertThat(result.getPayPeriodMonth()).isEqualTo(1);
            verify(payrollRunRepository).save(any(PayrollRun.class));
        }

        @Test
        @DisplayName("Should throw exception when payroll run already exists for period")
        void shouldThrowExceptionWhenPayrollRunExists() {
            when(payrollRunRepository.findByTenantIdAndPeriodForUpdate(
                    tenantId, 2025, 1)).thenReturn(Optional.of(payrollRun));

            assertThatThrownBy(() -> payrollRunService.createPayrollRun(payrollRun))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("PROD-4: Should reject run creation when tenant country has no implemented statutory engine")
        void shouldRejectCreationForUnsupportedCountry() {
            doThrow(new BusinessException("Payroll runs are currently supported for India (IN) tenants only."))
                    .when(statutoryCalculatorFactory).assertPayrollSupported(tenantId);

            assertThatThrownBy(() -> payrollRunService.createPayrollRun(payrollRun))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("India (IN) tenants only");
            verify(payrollRunRepository, never()).save(any(PayrollRun.class));
        }
    }

    @Nested
    @DisplayName("Update Payroll Run")
    class UpdatePayrollRunTests {

        @Test
        @DisplayName("Should update draft payroll run successfully")
        void shouldUpdateDraftPayrollRunSuccessfully() {
            UUID runId = payrollRun.getId();
            PayrollRun updateData = PayrollRun.builder()
                    .payPeriodYear(2025)
                    .payPeriodMonth(2)
                    .payrollDate(LocalDate.of(2025, 2, 28))
                    .remarks("Updated remarks")
                    .build();

            when(payrollRunRepository.findById(runId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            PayrollRun result = payrollRunService.updatePayrollRun(runId, updateData);

            assertThat(result).isNotNull();
            assertThat(result.getPayPeriodMonth()).isEqualTo(2);
            assertThat(result.getRemarks()).isEqualTo("Updated remarks");
        }

        @Test
        @DisplayName("DATA-6: Should reject period change when another run already covers the new period")
        void shouldRejectPeriodChangeWhenDuplicateExists() {
            UUID runId = payrollRun.getId();
            PayrollRun conflicting = PayrollRun.builder()
                    .payPeriodYear(2025)
                    .payPeriodMonth(2)
                    .payrollDate(LocalDate.of(2025, 2, 28))
                    .build();
            conflicting.setId(UUID.randomUUID());
            conflicting.setTenantId(tenantId);

            PayrollRun updateData = PayrollRun.builder()
                    .payPeriodYear(2025)
                    .payPeriodMonth(2)
                    .payrollDate(LocalDate.of(2025, 2, 28))
                    .build();

            when(payrollRunRepository.findById(runId)).thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.findByTenantIdAndPeriodForUpdate(tenantId, 2025, 2))
                    .thenReturn(Optional.of(conflicting));

            assertThatThrownBy(() -> payrollRunService.updatePayrollRun(runId, updateData))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
            verify(payrollRunRepository, never()).save(any(PayrollRun.class));
        }

        @Test
        @DisplayName("Should throw exception when updating locked payroll run")
        void shouldThrowExceptionWhenUpdatingLockedPayrollRun() {
            UUID runId = payrollRun.getId();
            payrollRun.setStatus(PayrollStatus.LOCKED);
            PayrollRun updateData = PayrollRun.builder().build();

            when(payrollRunRepository.findById(runId))
                    .thenReturn(Optional.of(payrollRun));

            assertThatThrownBy(() -> payrollRunService.updatePayrollRun(runId, updateData))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("locked");
        }

        @Test
        @DisplayName("Should throw exception when payroll run not found")
        void shouldThrowExceptionWhenPayrollRunNotFound() {
            UUID runId = UUID.randomUUID();
            PayrollRun updateData = PayrollRun.builder().build();

            when(payrollRunRepository.findById(runId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> payrollRunService.updatePayrollRun(runId, updateData))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("Process Payroll Run")
    class ProcessPayrollRunTests {

        @Test
        @DisplayName("Should process payroll run successfully")
        void shouldProcessPayrollRunSuccessfully() {
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            PayrollRun result = payrollRunService.processPayrollRun(runId, userId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PayrollStatus.PROCESSED);
            verify(payrollRunRepository).save(any(PayrollRun.class));
        }

        @Test
        @DisplayName("BA-1: Payslip uses calendar working days and applies pending payroll adjustments")
        void shouldGeneratePayslipWithComputedDaysAndAdjustments() {
            UUID runId = payrollRun.getId();
            UUID employeeId = UUID.randomUUID();

            Employee employee = Employee.builder()
                    .status(Employee.EmployeeStatus.ACTIVE)
                    .build();
            employee.setId(employeeId);
            employee.setTenantId(tenantId);

            SalaryStructure structure = SalaryStructure.builder()
                    .employeeId(employeeId)
                    .basicSalary(new java.math.BigDecimal("30000"))
                    .build();

            // LOP: 2 days (stored as days); expense reimbursement: flat ₹1000
            PayrollAdjustment lop = PayrollAdjustment.builder()
                    .tenantId(tenantId).employeeId(employeeId)
                    .adjustmentType(PayrollAdjustment.AdjustmentType.LOP_DEDUCTION)
                    .category(PayrollAdjustment.AdjustmentCategory.DEDUCTION)
                    .amount(new java.math.BigDecimal("2"))
                    .description("LOP").sourceModule("LEAVE")
                    .effectiveDate(LocalDate.of(2025, 1, 10))
                    .build();
            PayrollAdjustment expense = PayrollAdjustment.builder()
                    .tenantId(tenantId).employeeId(employeeId)
                    .adjustmentType(PayrollAdjustment.AdjustmentType.EXPENSE_REIMBURSEMENT)
                    .category(PayrollAdjustment.AdjustmentCategory.EARNING)
                    .amount(new java.math.BigDecimal("1000"))
                    .description("Expense").sourceModule("EXPENSE")
                    .effectiveDate(LocalDate.of(2025, 1, 12))
                    .build();

            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(false, true);
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(
                    tenantId, employeeId, payrollRun.getPayrollDate()))
                    .thenReturn(Optional.of(structure));
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(
                    eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of());
            when(leaveRequestRepository.findOverlappingLeaves(
                    eq(tenantId), eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of());
            // No attendance tracked → fall back to workingDays - leaveDays
            when(attendanceRecordRepository.countByTenantIdAndEmployeeIdAndDateBetween(
                    eq(tenantId), eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(0L);
            when(payrollAdjustmentRepository
                    .findByTenantIdAndEmployeeIdAndStatusAndEffectiveDateLessThanEqual(
                            eq(tenantId), eq(employeeId),
                            eq(PayrollAdjustment.AdjustmentStatus.PENDING), any(LocalDate.class)))
                    .thenReturn(List.of(lop, expense));

            payrollRunService.processPayrollRun(runId, userId);

            ArgumentCaptor<Payslip> payslipCaptor = ArgumentCaptor.forClass(Payslip.class);
            verify(payslipRepository).save(payslipCaptor.capture());
            Payslip payslip = payslipCaptor.getValue();

            // January 2025 has 23 weekdays (8 weekend days)
            assertThat(payslip.getWorkingDays()).isEqualTo(23);
            assertThat(payslip.getPresentDays()).isEqualTo(23);
            assertThat(payslip.getLeaveDays()).isZero();
            // Expense reimbursement lands in otherAllowances
            assertThat(payslip.getOtherAllowances())
                    .isEqualByComparingTo(new java.math.BigDecimal("1000"));
            // LOP: 2 days × (30000 / 23 = 1304.35) = 2608.70 into otherDeductions
            assertThat(payslip.getOtherDeductions())
                    .isEqualByComparingTo(new java.math.BigDecimal("2608.70"));
            assertThat(payslip.getGrossSalary())
                    .isEqualByComparingTo(new java.math.BigDecimal("31000"));
            assertThat(payslip.getNetSalary())
                    .isEqualByComparingTo(new java.math.BigDecimal("28391.30"));

            // Adjustments are consumed and linked back to the run
            assertThat(lop.getStatus()).isEqualTo(PayrollAdjustment.AdjustmentStatus.PROCESSED);
            assertThat(expense.getStatus()).isEqualTo(PayrollAdjustment.AdjustmentStatus.PROCESSED);
            assertThat(lop.getPayrollRunId()).isEqualTo(runId);
            verify(payrollAdjustmentRepository).saveAll(List.of(lop, expense));
        }

        @Test
        @DisplayName("BA-6 regression: Payslip leaveDays counts only APPROVED leaves, not PENDING ones returned by findOverlappingLeaves")
        void shouldCountOnlyApprovedLeavesInPayslipLeaveDays() {
            UUID runId = payrollRun.getId();
            UUID employeeId = UUID.randomUUID();

            Employee employee = Employee.builder()
                    .status(Employee.EmployeeStatus.ACTIVE)
                    .build();
            employee.setId(employeeId);
            employee.setTenantId(tenantId);

            SalaryStructure structure = SalaryStructure.builder()
                    .employeeId(employeeId)
                    .basicSalary(new java.math.BigDecimal("30000"))
                    .build();

            // APPROVED leave: Mon Jan 6 – Tue Jan 7, 2025 → 2 working days
            com.nulogic.domain.leave.LeaveRequest approvedLeave =
                    com.nulogic.domain.leave.LeaveRequest.builder()
                            .employeeId(employeeId)
                            .startDate(LocalDate.of(2025, 1, 6))
                            .endDate(LocalDate.of(2025, 1, 7))
                            .status(com.nulogic.domain.leave.LeaveRequest.LeaveRequestStatus.APPROVED)
                            .build();
            // PENDING leave: Mon Jan 13 – Wed Jan 15, 2025 → 3 working days,
            // returned by the widened findOverlappingLeaves but must NOT count
            com.nulogic.domain.leave.LeaveRequest pendingLeave =
                    com.nulogic.domain.leave.LeaveRequest.builder()
                            .employeeId(employeeId)
                            .startDate(LocalDate.of(2025, 1, 13))
                            .endDate(LocalDate.of(2025, 1, 15))
                            .status(com.nulogic.domain.leave.LeaveRequest.LeaveRequestStatus.PENDING)
                            .build();

            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(false, true);
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(
                    tenantId, employeeId, payrollRun.getPayrollDate()))
                    .thenReturn(Optional.of(structure));
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(
                    eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of());
            when(leaveRequestRepository.findOverlappingLeaves(
                    eq(tenantId), eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(approvedLeave, pendingLeave));
            // No attendance tracked → fall back to workingDays - leaveDays
            when(attendanceRecordRepository.countByTenantIdAndEmployeeIdAndDateBetween(
                    eq(tenantId), eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(0L);
            when(payrollAdjustmentRepository
                    .findByTenantIdAndEmployeeIdAndStatusAndEffectiveDateLessThanEqual(
                            eq(tenantId), eq(employeeId),
                            eq(PayrollAdjustment.AdjustmentStatus.PENDING), any(LocalDate.class)))
                    .thenReturn(List.of());

            payrollRunService.processPayrollRun(runId, userId);

            ArgumentCaptor<Payslip> payslipCaptor = ArgumentCaptor.forClass(Payslip.class);
            verify(payslipRepository).save(payslipCaptor.capture());
            Payslip payslip = payslipCaptor.getValue();

            // January 2025 has 23 weekdays; only the 2 APPROVED days count.
            // If the PENDING leave leaked in, leaveDays would be 5 and presentDays 18.
            assertThat(payslip.getWorkingDays()).isEqualTo(23);
            assertThat(payslip.getLeaveDays()).isEqualTo(2);
            // presentDays fallback = workingDays - approved leaveDays = 23 - 2
            assertThat(payslip.getPresentDays()).isEqualTo(21);
        }

        @Test
        @DisplayName("Holiday consistency: only company-wide holidays reduce working days — optional AND restricted are excluded (same rule as leave LOP)")
        void shouldExcludeOptionalAndRestrictedHolidaysFromWorkingDays() {
            UUID runId = payrollRun.getId();
            UUID employeeId = UUID.randomUUID();

            Employee employee = Employee.builder()
                    .status(Employee.EmployeeStatus.ACTIVE)
                    .build();
            employee.setId(employeeId);
            employee.setTenantId(tenantId);

            SalaryStructure structure = SalaryStructure.builder()
                    .employeeId(employeeId)
                    .basicSalary(new java.math.BigDecimal("30000"))
                    .build();

            // Wed Jan 1: company-wide holiday → reduces working days
            Holiday companyWide = Holiday.builder()
                    .holidayDate(LocalDate.of(2025, 1, 1))
                    .build();
            // Tue Jan 14: optional holiday → must NOT reduce working days
            Holiday optionalHoliday = Holiday.builder()
                    .holidayDate(LocalDate.of(2025, 1, 14))
                    .isOptional(true)
                    .build();
            // Thu Jan 23: restricted holiday → must NOT reduce working days
            // (aligns with LeaveRequestService LOP working-day rule)
            Holiday restrictedHoliday = Holiday.builder()
                    .holidayDate(LocalDate.of(2025, 1, 23))
                    .isRestricted(true)
                    .build();

            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
            when(payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, 2025, 1)).thenReturn(false, true);
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(
                    tenantId, employeeId, payrollRun.getPayrollDate()))
                    .thenReturn(Optional.of(structure));
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(
                    eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(companyWide, optionalHoliday, restrictedHoliday));
            when(leaveRequestRepository.findOverlappingLeaves(
                    eq(tenantId), eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of());
            when(attendanceRecordRepository.countByTenantIdAndEmployeeIdAndDateBetween(
                    eq(tenantId), eq(employeeId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(0L);
            when(payrollAdjustmentRepository
                    .findByTenantIdAndEmployeeIdAndStatusAndEffectiveDateLessThanEqual(
                            eq(tenantId), eq(employeeId),
                            eq(PayrollAdjustment.AdjustmentStatus.PENDING), any(LocalDate.class)))
                    .thenReturn(List.of());

            payrollRunService.processPayrollRun(runId, userId);

            ArgumentCaptor<Payslip> payslipCaptor = ArgumentCaptor.forClass(Payslip.class);
            verify(payslipRepository).save(payslipCaptor.capture());
            Payslip payslip = payslipCaptor.getValue();

            // January 2025 has 23 weekdays; only the company-wide holiday (Jan 1)
            // reduces the count. If optional/restricted leaked in, this would be 21.
            assertThat(payslip.getWorkingDays()).isEqualTo(22);
            assertThat(payslip.getPresentDays()).isEqualTo(22);
        }
    }

    @Nested
    @DisplayName("Approve Payroll Run")
    class ApprovePayrollRunTests {

        @Test
        @DisplayName("Should approve payroll run successfully")
        void shouldApprovePayrollRunSuccessfully() {
            UUID runId = payrollRun.getId();
            payrollRun.setStatus(PayrollStatus.PROCESSED);

            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            PayrollRun result = payrollRunService.approvePayrollRun(runId, userId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PayrollStatus.APPROVED);
        }
    }

    @Nested
    @DisplayName("Query Payroll Runs")
    class QueryPayrollRunTests {

        @Test
        @DisplayName("Should get payroll run by ID")
        void shouldGetPayrollRunById() {
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findById(runId))
                    .thenReturn(Optional.of(payrollRun));

            PayrollRun result = payrollRunService.getPayrollRunById(runId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(runId);
        }

        @Test
        @DisplayName("Should get all payroll runs with pagination")
        void shouldGetAllPayrollRunsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<PayrollRun> page = new PageImpl<>(List.of(payrollRun));
            when(payrollRunRepository.findAllByTenantIdOrderByPeriodDesc(tenantId, pageable))
                    .thenReturn(page);

            Page<PayrollRun> result = payrollRunService.getAllPayrollRuns(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get payroll run by period")
        void shouldGetPayrollRunByPeriod() {
            when(payrollRunRepository.findByTenantIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, 2025, 1))
                    .thenReturn(Optional.of(payrollRun));

            PayrollRun result = payrollRunService.getPayrollRunByPeriod(2025, 1);

            assertThat(result).isNotNull();
            assertThat(result.getPayPeriodYear()).isEqualTo(2025);
            assertThat(result.getPayPeriodMonth()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should get payroll runs by year")
        void shouldGetPayrollRunsByYear() {
            when(payrollRunRepository.findByTenantIdAndYear(tenantId, 2025))
                    .thenReturn(List.of(payrollRun));

            List<PayrollRun> result = payrollRunService.getPayrollRunsByYear(2025);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should get payroll runs by status")
        void shouldGetPayrollRunsByStatus() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<PayrollRun> page = new PageImpl<>(List.of(payrollRun));
            when(payrollRunRepository.findAllByTenantIdAndStatus(tenantId, PayrollStatus.DRAFT, pageable))
                    .thenReturn(page);

            Page<PayrollRun> result = payrollRunService.getPayrollRunsByStatus(PayrollStatus.DRAFT, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Lock Payroll Run")
    class LockPayrollRunTests {

        @Test
        @DisplayName("Should lock an approved payroll run successfully")
        void shouldLockApprovedPayrollRunSuccessfully() {
            // Given — run is in APPROVED state
            payrollRun.setStatus(PayrollStatus.APPROVED);
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PayrollRun result = payrollRunService.lockPayrollRun(runId);

            // Then
            assertThat(result.getStatus()).isEqualTo(PayrollStatus.LOCKED);
            verify(payrollRunRepository).save(payrollRun);
        }

        @Test
        @DisplayName("Should throw IllegalStateException when locking a DRAFT run")
        void shouldThrowWhenLockingDraftRun() {
            // Given — run is in DRAFT (not APPROVED)
            payrollRun.setStatus(PayrollStatus.DRAFT);
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));

            // When / Then
            assertThatThrownBy(() -> payrollRunService.lockPayrollRun(runId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("approved payroll runs can be locked");
        }

        @Test
        @DisplayName("Should throw IllegalStateException when locking a PROCESSED run")
        void shouldThrowWhenLockingProcessedRun() {
            // Given — run is in PROCESSED (needs APPROVED first)
            payrollRun.setStatus(PayrollStatus.PROCESSED);
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));

            assertThatThrownBy(() -> payrollRunService.lockPayrollRun(runId))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when run does not exist")
        void shouldThrowWhenRunNotFoundForLock() {
            UUID missingId = UUID.randomUUID();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(missingId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> payrollRunService.lockPayrollRun(missingId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Delete Payroll Run")
    class DeletePayrollRunTests {

        @Test
        @DisplayName("Should soft-delete a DRAFT payroll run and log audit event")
        void shouldSoftDeleteDraftPayrollRun() {
            // Given
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findById(runId)).thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            payrollRunService.deletePayrollRun(runId);

            // Then — soft-delete sets deletedAt/deletedBy, not a hard delete
            verify(payrollRunRepository).save(payrollRun);
            // Audit log must be called
            verify(auditLogService).logAction(
                    eq("PAYROLL_RUN"), eq(runId), any(), any(), any(), anyString());
        }

        @Test
        @DisplayName("Should throw IllegalStateException when deleting a LOCKED payroll run")
        void shouldThrowWhenDeletingLockedPayrollRun() {
            // Given — locked run cannot be deleted
            payrollRun.setStatus(PayrollStatus.LOCKED);
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findById(runId)).thenReturn(Optional.of(payrollRun));

            assertThatThrownBy(() -> payrollRunService.deletePayrollRun(runId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot delete locked payroll run");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when run does not exist")
        void shouldThrowWhenRunNotFoundForDelete() {
            UUID missingId = UUID.randomUUID();
            when(payrollRunRepository.findById(missingId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payrollRunService.deletePayrollRun(missingId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("State machine — full lifecycle DRAFT → LOCKED")
    class StateMachineLifecycleTests {

        @Test
        @DisplayName("Should transition payroll run through full lifecycle: DRAFT → PROCESSED → APPROVED → LOCKED")
        void shouldTransitionThroughFullLifecycle() {
            // Given
            UUID runId = payrollRun.getId();

            // Step 1: Process (DRAFT → PROCESSED)
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            PayrollRun processed = payrollRunService.processPayrollRun(runId, userId);
            assertThat(processed.getStatus()).isEqualTo(PayrollStatus.PROCESSED);

            // Step 2: Approve (PROCESSED → APPROVED)
            PayrollRun approved = payrollRunService.approvePayrollRun(runId, userId);
            assertThat(approved.getStatus()).isEqualTo(PayrollStatus.APPROVED);

            // Step 3: Lock (APPROVED → LOCKED)
            PayrollRun locked = payrollRunService.lockPayrollRun(runId);
            assertThat(locked.getStatus()).isEqualTo(PayrollStatus.LOCKED);

            verify(payrollRunRepository, times(3)).save(any());
        }

        @Test
        @DisplayName("Should reject processing an already PROCESSED run")
        void shouldRejectProcessingAlreadyProcessedRun() {
            payrollRun.setStatus(PayrollStatus.PROCESSED);
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));

            assertThatThrownBy(() -> payrollRunService.processPayrollRun(runId, userId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("DRAFT or PROCESSING payroll runs");
        }

        @Test
        @DisplayName("Should reject approving a DRAFT run (must be processed first)")
        void shouldRejectApprovingDraftRun() {
            payrollRun.setStatus(PayrollStatus.DRAFT);
            UUID runId = payrollRun.getId();
            when(payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId))
                    .thenReturn(Optional.of(payrollRun));

            assertThatThrownBy(() -> payrollRunService.approvePayrollRun(runId, userId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("processed payroll runs can be approved");
        }
    }
}
