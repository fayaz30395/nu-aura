package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
import org.junit.jupiter.api.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

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
                    .hasMessageContaining("DRAFT or PROCESSING");
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
