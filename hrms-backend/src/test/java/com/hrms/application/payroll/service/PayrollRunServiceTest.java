package com.hrms.application.payroll.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
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

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayrollRunService Tests")
class PayrollRunServiceTest {

    @Mock
    private PayrollRunRepository payrollRunRepository;

    @InjectMocks
    private PayrollRunService payrollRunService;

    private static MockedStatic<TenantContext> tenantContextMock;

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
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

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
            when(payrollRunRepository.existsByTenantIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, 2025, 1)).thenReturn(false);
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
            when(payrollRunRepository.existsByTenantIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, 2025, 1)).thenReturn(true);

            assertThatThrownBy(() -> payrollRunService.createPayrollRun(payrollRun))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
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
                    .isInstanceOf(IllegalArgumentException.class)
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
            when(payrollRunRepository.findById(runId))
                    .thenReturn(Optional.of(payrollRun));
            when(payrollRunRepository.save(any(PayrollRun.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            PayrollRun result = payrollRunService.processPayrollRun(runId, userId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PayrollStatus.PROCESSING);
            verify(payrollRunRepository).save(any(PayrollRun.class));
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

            when(payrollRunRepository.findById(runId))
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
}
