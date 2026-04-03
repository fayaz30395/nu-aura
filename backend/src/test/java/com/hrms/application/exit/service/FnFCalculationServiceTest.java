package com.hrms.application.exit.service;

import com.hrms.application.exit.dto.FnFAdjustmentRequest;
import com.hrms.application.exit.dto.FnFCalculationResponse;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.exit.ExitProcess;
import com.hrms.domain.exit.FullAndFinalSettlement;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.exit.repository.ExitProcessRepository;
import com.hrms.infrastructure.exit.repository.FullAndFinalSettlementRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("FnFCalculationService Tests")
class FnFCalculationServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private FullAndFinalSettlementRepository fnfRepository;
    @Mock
    private ExitProcessRepository exitProcessRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private SalaryStructureRepository salaryStructureRepository;
    @InjectMocks
    private FnFCalculationService fnfCalculationService;
    private UUID tenantId;
    private UUID exitProcessId;
    private UUID employeeId;
    private ExitProcess exitProcess;
    private Employee employee;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        exitProcessId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

        exitProcess = new ExitProcess();
        exitProcess.setId(exitProcessId);
        exitProcess.setEmployeeId(employeeId);
        exitProcess.setLastWorkingDate(LocalDate.of(2026, 3, 15));

        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setJoiningDate(LocalDate.of(2020, 1, 1));
    }

    @Nested
    @DisplayName("getOrCalculate — New Settlement")
    class GetOrCalculateNewTests {

        @Test
        @DisplayName("Should compute pro-rated salary for current month")
        void shouldComputeProRatedSalary() {
            // Given
            BigDecimal baseSalary = new BigDecimal("60000.00");
            SalaryStructure salaryStructure = SalaryStructure.builder().basicSalary(baseSalary).build();

            when(exitProcessRepository.findById(exitProcessId)).thenReturn(Optional.of(exitProcess));
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.empty());
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(eq(tenantId), eq(employeeId), any()))
                    .thenReturn(Optional.of(salaryStructure));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            FnFCalculationResponse result = fnfCalculationService.getOrCalculate(exitProcessId);

            // Then - 15 days out of 31 days in March
            BigDecimal expectedProRated = baseSalary
                    .multiply(BigDecimal.valueOf(15))
                    .divide(BigDecimal.valueOf(31), 2, RoundingMode.HALF_UP);
            assertThat(result.getPendingSalary()).isEqualByComparingTo(expectedProRated);
            assertThat(result.getStatus()).isEqualTo(FullAndFinalSettlement.SettlementStatus.DRAFT);
            verify(fnfRepository).save(any(FullAndFinalSettlement.class));
        }

        @Test
        @DisplayName("Should calculate gratuity when employee has 5+ years of service")
        void shouldCalculateGratuityForEligibleEmployee() {
            // Given - Employee joined 2020-01-01, last working 2026-03-15 (6+ years)
            BigDecimal baseSalary = new BigDecimal("60000.00");
            SalaryStructure salaryStructure = SalaryStructure.builder().basicSalary(baseSalary).build();

            when(exitProcessRepository.findById(exitProcessId)).thenReturn(Optional.of(exitProcess));
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.empty());
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(eq(tenantId), eq(employeeId), any()))
                    .thenReturn(Optional.of(salaryStructure));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            FnFCalculationResponse result = fnfCalculationService.getOrCalculate(exitProcessId);

            // Then
            assertThat(result.getIsGratuityEligible()).isTrue();
            assertThat(result.getGratuityAmount()).isNotNull();
            // Gratuity = (salary * 15/26) * years
            assertThat(result.getGratuityAmount().compareTo(BigDecimal.ZERO)).isGreaterThan(0);
        }

        @Test
        @DisplayName("Should NOT calculate gratuity when employee has less than 5 years")
        void shouldNotCalculateGratuityForIneligibleEmployee() {
            // Given - Employee joined 2023-01-01 (3 years of service)
            employee.setJoiningDate(LocalDate.of(2023, 1, 1));
            BigDecimal baseSalary = new BigDecimal("60000.00");
            SalaryStructure salaryStructure = SalaryStructure.builder().basicSalary(baseSalary).build();

            when(exitProcessRepository.findById(exitProcessId)).thenReturn(Optional.of(exitProcess));
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.empty());
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(eq(tenantId), eq(employeeId), any()))
                    .thenReturn(Optional.of(salaryStructure));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            FnFCalculationResponse result = fnfCalculationService.getOrCalculate(exitProcessId);

            // Then
            assertThat(result.getIsGratuityEligible()).isFalse();
            assertThat(result.getGratuityAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should handle zero salary gracefully")
        void shouldHandleZeroSalary() {
            // Given
            when(exitProcessRepository.findById(exitProcessId)).thenReturn(Optional.of(exitProcess));
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.empty());
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(salaryStructureRepository.findActiveByEmployeeIdAndDate(eq(tenantId), eq(employeeId), any()))
                    .thenReturn(Optional.empty()); // No salary structure

            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            FnFCalculationResponse result = fnfCalculationService.getOrCalculate(exitProcessId);

            // Then
            assertThat(result.getPendingSalary()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should throw RuntimeException when exit process not found")
        void shouldThrowWhenExitProcessNotFound() {
            // Given
            when(exitProcessRepository.findById(exitProcessId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> fnfCalculationService.getOrCalculate(exitProcessId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Exit process not found");
        }
    }

    @Nested
    @DisplayName("getOrCalculate — Existing Settlement")
    class GetOrCalculateExistingTests {

        @Test
        @DisplayName("Should return existing settlement without recomputing")
        void shouldReturnExistingSettlement() {
            // Given
            FullAndFinalSettlement existing = FullAndFinalSettlement.builder()
                    .exitProcessId(exitProcessId)
                    .employeeId(employeeId)
                    .pendingSalary(new BigDecimal("50000.00"))
                    .status(FullAndFinalSettlement.SettlementStatus.APPROVED)
                    .build();
            existing.setId(UUID.randomUUID());
            existing.setTenantId(tenantId);

            when(exitProcessRepository.findById(exitProcessId)).thenReturn(Optional.of(exitProcess));
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.of(existing));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            // When
            FnFCalculationResponse result = fnfCalculationService.getOrCalculate(exitProcessId);

            // Then
            assertThat(result.getPendingSalary()).isEqualByComparingTo(new BigDecimal("50000.00"));
            assertThat(result.getStatus()).isEqualTo(FullAndFinalSettlement.SettlementStatus.APPROVED);
            verify(fnfRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("addAdjustment")
    class AddAdjustmentTests {

        @Test
        @DisplayName("Should apply deductions and recalculate totals")
        void shouldApplyDeductionsAndRecalculate() {
            // Given
            FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                    .exitProcessId(exitProcessId)
                    .employeeId(employeeId)
                    .pendingSalary(new BigDecimal("50000.00"))
                    .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
                    .build();
            settlement.setId(UUID.randomUUID());
            settlement.setTenantId(tenantId);

            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.of(settlement));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            FnFAdjustmentRequest req = new FnFAdjustmentRequest();
            req.setLoanRecovery(new BigDecimal("10000.00"));
            req.setNoticeBuyout(new BigDecimal("5000.00"));
            req.setRemarks("Notice period not served");

            // When
            FnFCalculationResponse result = fnfCalculationService.addAdjustment(exitProcessId, req);

            // Then
            assertThat(result.getLoanRecovery()).isEqualByComparingTo(new BigDecimal("10000.00"));
            assertThat(result.getNoticeBuyout()).isEqualByComparingTo(new BigDecimal("5000.00"));
            assertThat(result.getRemarks()).isEqualTo("Notice period not served");
            // net = earnings(50000) - deductions(15000) = 35000
            assertThat(result.getNetPayable()).isEqualByComparingTo(new BigDecimal("35000.00"));
            verify(fnfRepository).save(any(FullAndFinalSettlement.class));
        }

        @Test
        @DisplayName("Should throw when settlement not found")
        void shouldThrowWhenSettlementNotFound() {
            // Given
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.empty());

            FnFAdjustmentRequest req = new FnFAdjustmentRequest();
            req.setLoanRecovery(new BigDecimal("10000.00"));

            // When/Then
            assertThatThrownBy(() -> fnfCalculationService.addAdjustment(exitProcessId, req))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Settlement not found");
        }
    }

    @Nested
    @DisplayName("approve")
    class ApproveTests {

        @Test
        @DisplayName("Should approve settlement in DRAFT status")
        void shouldApproveDraftSettlement() {
            // Given
            FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                    .exitProcessId(exitProcessId)
                    .employeeId(employeeId)
                    .pendingSalary(new BigDecimal("50000.00"))
                    .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
                    .build();
            settlement.setId(UUID.randomUUID());
            settlement.setTenantId(tenantId);

            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.of(settlement));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            // When
            FnFCalculationResponse result = fnfCalculationService.approve(exitProcessId);

            // Then
            assertThat(result.getStatus()).isEqualTo(FullAndFinalSettlement.SettlementStatus.APPROVED);
            assertThat(result.getApprovalDate()).isEqualTo(LocalDate.now());
            verify(fnfRepository).save(any(FullAndFinalSettlement.class));
        }

        @Test
        @DisplayName("Should approve settlement in PENDING_APPROVAL status")
        void shouldApprovePendingSettlement() {
            // Given
            FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                    .exitProcessId(exitProcessId)
                    .employeeId(employeeId)
                    .status(FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL)
                    .build();
            settlement.setId(UUID.randomUUID());
            settlement.setTenantId(tenantId);

            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.of(settlement));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            // When
            FnFCalculationResponse result = fnfCalculationService.approve(exitProcessId);

            // Then
            assertThat(result.getStatus()).isEqualTo(FullAndFinalSettlement.SettlementStatus.APPROVED);
        }

        @Test
        @DisplayName("Should throw IllegalStateException when settlement already PAID")
        void shouldThrowWhenAlreadyPaid() {
            // Given
            FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                    .exitProcessId(exitProcessId)
                    .employeeId(employeeId)
                    .status(FullAndFinalSettlement.SettlementStatus.PAID)
                    .build();
            settlement.setId(UUID.randomUUID());
            settlement.setTenantId(tenantId);

            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.of(settlement));

            // When/Then
            assertThatThrownBy(() -> fnfCalculationService.approve(exitProcessId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not in a state that can be approved");
        }

        @Test
        @DisplayName("Should throw when settlement not found on approve")
        void shouldThrowWhenSettlementNotFound() {
            // Given
            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> fnfCalculationService.approve(exitProcessId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Settlement not found");
        }
    }

    @Nested
    @DisplayName("Net Payable Calculation")
    class NetPayableTests {

        @Test
        @DisplayName("Net payable = total earnings - total deductions")
        void shouldCalculateNetPayableCorrectly() {
            // Given - settlement with multiple earnings and deductions
            FullAndFinalSettlement settlement = FullAndFinalSettlement.builder()
                    .exitProcessId(exitProcessId)
                    .employeeId(employeeId)
                    .pendingSalary(new BigDecimal("50000.00"))
                    .leaveEncashment(new BigDecimal("10000.00"))
                    .gratuityAmount(new BigDecimal("100000.00"))
                    .noticeBuyout(new BigDecimal("5000.00"))
                    .loanRecovery(new BigDecimal("20000.00"))
                    .taxDeduction(new BigDecimal("15000.00"))
                    .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
                    .build();
            settlement.setId(UUID.randomUUID());
            settlement.setTenantId(tenantId);

            when(fnfRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                    .thenReturn(Optional.of(settlement));
            when(fnfRepository.save(any(FullAndFinalSettlement.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            FnFAdjustmentRequest req = new FnFAdjustmentRequest();
            req.setRemarks("Final review");

            // When
            FnFCalculationResponse result = fnfCalculationService.addAdjustment(exitProcessId, req);

            // Then
            // Total earnings: 50000 + 10000 + 100000 = 160000
            assertThat(result.getTotalEarnings()).isEqualByComparingTo(new BigDecimal("160000.00"));
            // Total deductions: 5000 + 20000 + 15000 = 40000
            assertThat(result.getTotalDeductions()).isEqualByComparingTo(new BigDecimal("40000.00"));
            // Net: 160000 - 40000 = 120000
            assertThat(result.getNetPayable()).isEqualByComparingTo(new BigDecimal("120000.00"));
        }
    }
}
