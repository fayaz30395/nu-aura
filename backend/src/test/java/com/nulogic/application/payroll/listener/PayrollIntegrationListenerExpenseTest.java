package com.nulogic.application.payroll.listener;

import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.event.expense.ExpenseApprovedEvent;
import com.nulogic.domain.payroll.PayrollAdjustment;
import com.nulogic.infrastructure.payroll.repository.PayrollAdjustmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayrollIntegrationListener expense reimbursement")
class PayrollIntegrationListenerExpenseTest {

    @Mock
    private PayrollAdjustmentRepository adjustmentRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private PayrollIntegrationListener listener;

    private ExpenseApprovedEvent event(UUID tenantId, UUID claimId) {
        return ExpenseApprovedEvent.of(this, tenantId, claimId, UUID.randomUUID(), UUID.randomUUID(),
                new BigDecimal("100.00"), "INR", "EXP-1", "TRAVEL");
    }

    @Test
    @DisplayName("creates one reimbursement adjustment for a new claim")
    void createsAdjustment() {
        UUID tenantId = UUID.randomUUID();
        UUID claimId = UUID.randomUUID();
        when(adjustmentRepository.findByTenantIdAndSourceModuleAndSourceId(tenantId, "EXPENSE", claimId))
                .thenReturn(List.of());
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.now());

        listener.onExpenseApproved(event(tenantId, claimId));

        verify(adjustmentRepository, times(1)).save(any(PayrollAdjustment.class));
    }

    @Test
    @DisplayName("a repeated approval event does not create a second adjustment")
    void duplicateEventIgnored() {
        UUID tenantId = UUID.randomUUID();
        UUID claimId = UUID.randomUUID();
        when(adjustmentRepository.findByTenantIdAndSourceModuleAndSourceId(tenantId, "EXPENSE", claimId))
                .thenReturn(List.of(PayrollAdjustment.builder().build()));

        listener.onExpenseApproved(event(tenantId, claimId));

        verify(adjustmentRepository, never()).save(any(PayrollAdjustment.class));
    }
}
