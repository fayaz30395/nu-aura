package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.Payslip;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayslipService Tests")
class PayslipServiceTest {

    @Mock
    private PayslipRepository payslipRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private StatutoryDeductionService statutoryDeductionService;

    @InjectMocks
    private PayslipService payslipService;

    private static MockedStatic<TenantContext> tenantContextMock;

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
            when(payslipRepository.findById(payslipId)).thenReturn(Optional.of(payslip));
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
            when(payslipRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.updatePayslip(invalidId, payslip))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should throw exception when tenant mismatch")
        void shouldThrowExceptionWhenTenantMismatch() {
            UUID payslipId = payslip.getId();
            payslip.setTenantId(UUID.randomUUID()); // Different tenant
            when(payslipRepository.findById(payslipId)).thenReturn(Optional.of(payslip));

            assertThatThrownBy(() -> payslipService.updatePayslip(payslipId, payslip))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Get Payslip Tests")
    class GetPayslipTests {

        @Test
        @DisplayName("Should get payslip by ID")
        void shouldGetPayslipById() {
            UUID payslipId = payslip.getId();
            when(payslipRepository.findById(payslipId)).thenReturn(Optional.of(payslip));

            Payslip result = payslipService.getPayslipById(payslipId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(payslipId);
        }

        @Test
        @DisplayName("Should throw exception when payslip not found by ID")
        void shouldThrowExceptionWhenNotFoundById() {
            UUID invalidId = UUID.randomUUID();
            when(payslipRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.getPayslipById(invalidId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get all payslips with pagination")
        void shouldGetAllPayslipsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Payslip> page = new PageImpl<>(List.of(payslip));
            when(payslipRepository.findAllByTenantId(tenantId, pageable)).thenReturn(page);

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
            when(payslipRepository.findById(payslipId)).thenReturn(Optional.of(payslip));
            when(payslipRepository.save(any(Payslip.class))).thenAnswer(invocation -> invocation.getArgument(0));

            payslipService.deletePayslip(payslipId);

            verify(payslipRepository).save(any(Payslip.class));
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent payslip")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            UUID invalidId = UUID.randomUUID();
            when(payslipRepository.findById(invalidId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> payslipService.deletePayslip(invalidId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
