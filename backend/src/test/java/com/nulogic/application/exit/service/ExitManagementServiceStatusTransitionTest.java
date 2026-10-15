package com.nulogic.application.exit.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.exit.ExitClearance;
import com.nulogic.domain.exit.ExitProcess;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.exit.repository.*;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExitManagementServiceStatusTransitionTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private ExitProcessRepository exitProcessRepository;
    @Mock
    private ExitClearanceRepository exitClearanceRepository;
    @Mock
    private FullAndFinalSettlementRepository settlementRepository;
    @Mock
    private ExitInterviewRepository exitInterviewRepository;
    @Mock
    private AssetRecoveryRepository assetRecoveryRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private EventPublisher eventPublisher;
    @Mock
    private com.nulogic.common.util.TenantTimeService tenantTimeService;
    @Mock
    private FnFCalculationService fnfCalculationService;

    private ExitManagementService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID processId = UUID.randomUUID();
    private ExitProcess process;

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
        service = new ExitManagementService(exitProcessRepository, exitClearanceRepository, settlementRepository,
                exitInterviewRepository, assetRecoveryRepository, employeeRepository, eventPublisher,
                tenantTimeService, fnfCalculationService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        process = new ExitProcess();
        process.setId(processId);
        process.setTenantId(tenantId);
        process.setEmployeeId(UUID.randomUUID());
        when(exitProcessRepository.findByIdAndTenantId(processId, tenantId)).thenReturn(Optional.of(process));
        when(exitProcessRepository.save(any(ExitProcess.class))).thenAnswer(i -> i.getArgument(0));
    }

    private ExitClearance clearance(ExitClearance.ClearanceStatus status) {
        ExitClearance c = new ExitClearance();
        c.setStatus(status);
        return c;
    }

    @Test
    void validTransition_inProgressToClearancePending() {
        process.setStatus(ExitProcess.ExitStatus.IN_PROGRESS);

        service.updateExitStatus(processId, ExitProcess.ExitStatus.CLEARANCE_PENDING);

        assertThat(process.getStatus()).isEqualTo(ExitProcess.ExitStatus.CLEARANCE_PENDING);
    }

    @Test
    void completed_allowedWhenAllClearancesResolved() {
        process.setStatus(ExitProcess.ExitStatus.CLEARANCE_PENDING);
        when(exitClearanceRepository.findByTenantIdAndExitProcessId(tenantId, processId)).thenReturn(List.of(
                clearance(ExitClearance.ClearanceStatus.APPROVED), clearance(ExitClearance.ClearanceStatus.NOT_REQUIRED)));

        service.updateExitStatus(processId, ExitProcess.ExitStatus.COMPLETED);

        assertThat(process.getStatus()).isEqualTo(ExitProcess.ExitStatus.COMPLETED);
    }

    @Test
    void completed_blockedWhenClearancePending() {
        process.setStatus(ExitProcess.ExitStatus.CLEARANCE_PENDING);
        when(exitClearanceRepository.findByTenantIdAndExitProcessId(tenantId, processId))
                .thenReturn(List.of(clearance(ExitClearance.ClearanceStatus.PENDING)));

        assertThatThrownBy(() -> service.updateExitStatus(processId, ExitProcess.ExitStatus.COMPLETED))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("clearances");
        assertThat(process.getStatus()).isEqualTo(ExitProcess.ExitStatus.CLEARANCE_PENDING);
        verify(exitProcessRepository, never()).save(any());
    }

    @Test
    void initiated_cannotJumpToCompleted() {
        process.setStatus(ExitProcess.ExitStatus.INITIATED);

        assertThatThrownBy(() -> service.updateExitStatus(processId, ExitProcess.ExitStatus.COMPLETED))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Invalid exit status transition");
        verify(exitProcessRepository, never()).save(any());
    }

    @Test
    void terminalStatesCannotBeReopened() {
        process.setStatus(ExitProcess.ExitStatus.CANCELLED);

        assertThatThrownBy(() -> service.updateExitStatus(processId, ExitProcess.ExitStatus.IN_PROGRESS))
                .isInstanceOf(IllegalStateException.class);
    }
}
