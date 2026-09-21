package com.nulogic.application.exit.service;

import com.nulogic.api.exit.dto.FullAndFinalSettlementRequest;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.exit.FullAndFinalSettlement;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.exit.repository.*;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers the two changes made to consolidate the duplicate F&F settlement logic
 * (US-2FZQPK4ZEDN6): createSettlement's duplicate-row guard, and approveSettlement
 * delegating to FnFCalculationService's single status-guarded approve path.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ExitManagementService settlement consolidation")
class ExitManagementServiceSettlementConsolidationTest {

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
    private final UUID exitProcessId = UUID.randomUUID();
    private final UUID settlementId = UUID.randomUUID();

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
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @Test
    @DisplayName("createSettlement rejects a duplicate for an exit process that already has one")
    void createSettlementRejectsDuplicate() {
        FullAndFinalSettlement existing = new FullAndFinalSettlement();
        existing.setExitProcessId(exitProcessId);
        when(settlementRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId))
                .thenReturn(Optional.of(existing));

        FullAndFinalSettlementRequest request = new FullAndFinalSettlementRequest();
        request.setExitProcessId(exitProcessId);

        assertThatThrownBy(() -> service.createSettlement(request))
                .isInstanceOf(IllegalStateException.class);

        verify(settlementRepository, never()).save(any());
    }

    @Test
    @DisplayName("approveSettlement delegates to FnFCalculationService's status-guarded approve")
    void approveSettlementDelegatesToFnFCalculationService() {
        FullAndFinalSettlement settlement = new FullAndFinalSettlement();
        settlement.setId(settlementId);
        settlement.setExitProcessId(exitProcessId);
        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.APPROVED);
        when(settlementRepository.findByIdAndTenantId(settlementId, tenantId)).thenReturn(Optional.of(settlement));

        var response = service.approveSettlement(settlementId);

        verify(fnfCalculationService).approve(exitProcessId);
        assertThat(response.getStatus()).isEqualTo(FullAndFinalSettlement.SettlementStatus.APPROVED);
    }
}
