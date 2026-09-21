package com.nulogic.application.compliance.scheduler;

import com.nulogic.application.compliance.service.ComplianceService;
import com.nulogic.application.compliance.service.ComplianceService.PendingAcknowledgmentGap;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.compliance.CompliancePolicy;
import com.nulogic.domain.compliance.PolicyAcknowledgmentReminder;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.notification.Notification;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.compliance.repository.PolicyAcknowledgmentReminderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PolicyAcknowledgmentReminderScheduler")
class PolicyAcknowledgmentReminderSchedulerTest {

    @Mock
    private ComplianceService complianceService;
    @Mock
    private PolicyAcknowledgmentReminderRepository reminderRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private PolicyAcknowledgmentReminderScheduler scheduler;
    private final UUID tenantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        scheduler = new PolicyAcknowledgmentReminderScheduler(
                complianceService, reminderRepository, notificationService, tenantTimeService, jdbcTemplate);
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2026, 6, 1));
        when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.of(2026, 6, 1, 6, 0));
    }

    private PendingAcknowledgmentGap gap() {
        CompliancePolicy policy = new CompliancePolicy();
        policy.setId(UUID.randomUUID());
        policy.setName("Code of Conduct");

        User user = User.builder().build();
        user.setId(UUID.randomUUID());
        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setUser(user);

        return new PendingAcknowledgmentGap(policy, employee);
    }

    @Test
    @DisplayName("sends a reminder and records it when no prior reminder exists")
    void sendsReminderWhenNoPriorRecord() {
        PendingAcknowledgmentGap gap = gap();
        when(complianceService.findPendingAcknowledgmentGaps(tenantId, LocalDate.of(2026, 6, 1)))
                .thenReturn(List.of(gap));
        when(reminderRepository.findByTenantIdAndPolicyIdAndEmployeeId(tenantId, gap.policy().getId(), gap.employee().getId()))
                .thenReturn(Optional.empty());
        when(reminderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int sent = scheduler.remindTenant(tenantId);

        assertThat(sent).isEqualTo(1);
        verify(notificationService).createNotification(
                eq(gap.employee().getUser().getId()), eq(Notification.NotificationType.REMINDER),
                any(), any(), eq(gap.policy().getId()), any(), any(), any());
        verify(reminderRepository).save(argThat(r -> r.getPolicyId().equals(gap.policy().getId())
                && r.getEmployeeId().equals(gap.employee().getId())));
    }

    @Test
    @DisplayName("does not re-send within the cooldown window (idempotent)")
    void doesNotSpamWithinCooldown() {
        PendingAcknowledgmentGap gap = gap();
        when(complianceService.findPendingAcknowledgmentGaps(tenantId, LocalDate.of(2026, 6, 1)))
                .thenReturn(List.of(gap));

        PolicyAcknowledgmentReminder existing = PolicyAcknowledgmentReminder.builder()
                .policyId(gap.policy().getId())
                .employeeId(gap.employee().getId())
                .lastRemindedAt(LocalDateTime.of(2026, 5, 30, 6, 0)) // 2 days ago, cooldown is 7
                .build();
        when(reminderRepository.findByTenantIdAndPolicyIdAndEmployeeId(tenantId, gap.policy().getId(), gap.employee().getId()))
                .thenReturn(Optional.of(existing));

        int sent = scheduler.remindTenant(tenantId);

        assertThat(sent).isEqualTo(0);
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("re-sends after the cooldown window has elapsed")
    void resendsAfterCooldownElapsed() {
        PendingAcknowledgmentGap gap = gap();
        when(complianceService.findPendingAcknowledgmentGaps(tenantId, LocalDate.of(2026, 6, 1)))
                .thenReturn(List.of(gap));

        PolicyAcknowledgmentReminder existing = PolicyAcknowledgmentReminder.builder()
                .policyId(gap.policy().getId())
                .employeeId(gap.employee().getId())
                .lastRemindedAt(LocalDateTime.of(2026, 5, 20, 6, 0)) // 12 days ago, past 7-day cooldown
                .build();
        when(reminderRepository.findByTenantIdAndPolicyIdAndEmployeeId(tenantId, gap.policy().getId(), gap.employee().getId()))
                .thenReturn(Optional.of(existing));
        when(reminderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int sent = scheduler.remindTenant(tenantId);

        assertThat(sent).isEqualTo(1);
    }

    @Test
    @DisplayName("skips an employee with no linked user account")
    void skipsEmployeeWithoutUser() {
        CompliancePolicy policy = new CompliancePolicy();
        policy.setId(UUID.randomUUID());
        policy.setName("Data Privacy");
        Employee employeeNoUser = new Employee();
        employeeNoUser.setId(UUID.randomUUID());
        PendingAcknowledgmentGap gap = new PendingAcknowledgmentGap(policy, employeeNoUser);

        when(complianceService.findPendingAcknowledgmentGaps(tenantId, LocalDate.of(2026, 6, 1)))
                .thenReturn(List.of(gap));
        when(reminderRepository.findByTenantIdAndPolicyIdAndEmployeeId(tenantId, policy.getId(), employeeNoUser.getId()))
                .thenReturn(Optional.empty());

        int sent = scheduler.remindTenant(tenantId);

        assertThat(sent).isEqualTo(0);
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any(), any(), any());
    }
}
