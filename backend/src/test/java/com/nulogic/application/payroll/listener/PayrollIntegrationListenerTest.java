package com.nulogic.application.payroll.listener;

import com.nulogic.domain.event.expense.ExpenseApprovedEvent;
import com.nulogic.domain.event.leave.LeaveApprovedEvent;
import com.nulogic.domain.event.overtime.OvertimeApprovedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

class PayrollIntegrationListenerTest {

    // Events are dispatched after the publisher's transaction committed; a REQUIRED listener would join
    // that dead transaction and its save would never be flushed (LOP/expense adjustments were lost).
    @Test
    @DisplayName("Listeners open their own transaction so adjustments are committed")
    void listenersUseRequiresNew() throws Exception {
        for (Class<?> event : new Class<?>[]{
                OvertimeApprovedEvent.class, ExpenseApprovedEvent.class, LeaveApprovedEvent.class}) {
            var method = java.util.Arrays.stream(PayrollIntegrationListener.class.getDeclaredMethods())
                    .filter(m -> m.getParameterCount() == 1 && m.getParameterTypes()[0] == event)
                    .findFirst().orElseThrow();
            assertThat(method.getAnnotation(Transactional.class).propagation())
                    .as(method.getName()).isEqualTo(Propagation.REQUIRES_NEW);
        }
    }
}
