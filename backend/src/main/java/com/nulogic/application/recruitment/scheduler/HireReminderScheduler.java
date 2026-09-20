package com.nulogic.application.recruitment.scheduler;

import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.notification.Notification;
import com.nulogic.domain.onboarding.OnboardingTask;
import com.nulogic.domain.recruitment.Interview;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.notification.repository.NotificationRepository;
import com.nulogic.infrastructure.onboarding.repository.OnboardingTaskRepository;
import com.nulogic.infrastructure.recruitment.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Reminder scheduler for the Hire lifecycle.
 *
 * <p>Responsibilities:</p>
 * <ol>
 *   <li><b>Onboarding task reminders:</b> notifies the onboarding employee, whoever the
 *       task is assigned to, and the employee's manager when an incomplete task is due
 *       within {@link #ONBOARDING_DUE_WINDOW_DAYS} days.</li>
 *   <li><b>Interview reminders:</b> notifies the interviewer when a scheduled interview
 *       starts within {@link #INTERVIEW_REMINDER_WINDOW_HOURS} hours.</li>
 * </ol>
 *
 * <p>Runs daily at 07:00 AM UTC. Processes all active tenants sequentially with
 * per-tenant failure isolation, matching {@code ContractLifecycleScheduler}.</p>
 *
 * <p>Idempotency: a reminder is skipped if a REMINDER notification already exists for the
 * same (recipient, entity) pair, so re-running the job (or the entity staying inside the
 * window across multiple days) never spams duplicate notifications.</p>
 */
@Component
@ConditionalOnProperty(name = "app.hire.reminders.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class HireReminderScheduler {

    // ponytail: no existing "due soon" window convention for onboarding tasks in this
    // codebase — defaulting to 3 days per task instructions.
    private static final int ONBOARDING_DUE_WINDOW_DAYS = 3;
    // ponytail: no existing interview-reminder window convention — defaulting to 24h.
    private static final int INTERVIEW_REMINDER_WINDOW_HOURS = 24;

    private static final String ONBOARDING_ENTITY_TYPE = "ONBOARDING_TASK";
    private static final String INTERVIEW_ENTITY_TYPE = "INTERVIEW";

    private final OnboardingTaskRepository onboardingTaskRepository;
    private final InterviewRepository interviewRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final TenantTimeService tenantTimeService;
    private final JdbcTemplate jdbcTemplate;

    @Scheduled(cron = "${app.hire.reminders.cron:0 0 7 * * *}", zone = "UTC")
    @SchedulerLock(name = "processHireReminders", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void processHireReminders() {
        log.info("HireReminderScheduler: starting daily run");

        List<UUID> tenants = fetchActiveTenants();
        int totalOnboardingReminders = 0;
        int totalInterviewReminders = 0;
        int tenantsWithErrors = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);
                totalOnboardingReminders += sendOnboardingTaskReminders(tenantId);
                totalInterviewReminders += sendInterviewReminders(tenantId);
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                tenantsWithErrors++;
                log.error("HireReminderScheduler: failed for tenant {}: {}", tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("HireReminderScheduler: completed. Tenants: {}, Onboarding reminders: {}, " +
                        "Interview reminders: {}, Tenants with errors: {}",
                tenants.size(), totalOnboardingReminders, totalInterviewReminders, tenantsWithErrors);
    }

    @Transactional
    public int sendOnboardingTaskReminders(UUID tenantId) {
        LocalDate today = tenantTimeService.today(tenantId);
        LocalDate windowEnd = today.plusDays(ONBOARDING_DUE_WINDOW_DAYS);
        List<OnboardingTask> dueSoon = onboardingTaskRepository.findDueBetween(tenantId, today, windowEnd);
        if (dueSoon.isEmpty()) {
            return 0;
        }

        Set<UUID> employeeIds = new HashSet<>();
        for (OnboardingTask task : dueSoon) {
            employeeIds.add(task.getEmployeeId());
            if (task.getAssignedTo() != null) {
                employeeIds.add(task.getAssignedTo());
            }
        }
        Map<UUID, UUID> managerIdByEmployeeId = toIdMap(employeeRepository.findManagerIdsByIds(employeeIds));
        for (UUID managerId : managerIdByEmployeeId.values()) {
            if (managerId != null) {
                employeeIds.add(managerId);
            }
        }
        Map<UUID, UUID> userIdByEmployeeId =
                toIdMap(employeeRepository.findUserIdsByEmployeeIdsAndTenantId(employeeIds, tenantId));

        int sent = 0;
        for (OnboardingTask task : dueSoon) {
            Set<UUID> recipientEmployeeIds = new LinkedHashSet<>();
            recipientEmployeeIds.add(task.getEmployeeId());
            if (task.getAssignedTo() != null) {
                recipientEmployeeIds.add(task.getAssignedTo());
            }
            UUID managerId = managerIdByEmployeeId.get(task.getEmployeeId());
            if (managerId != null) {
                recipientEmployeeIds.add(managerId);
            }

            String title = "Onboarding task due soon: " + task.getTaskName();
            String message = String.format(
                    "The onboarding task '%s' is due on %s.", task.getTaskName(), task.getDueDate());

            for (UUID employeeId : recipientEmployeeIds) {
                UUID userId = userIdByEmployeeId.get(employeeId);
                if (userId == null || alreadyNotified(tenantId, userId, task.getId(), ONBOARDING_ENTITY_TYPE)) {
                    continue;
                }
                notificationService.createNotification(
                        userId,
                        Notification.NotificationType.REMINDER,
                        title,
                        message,
                        task.getId(),
                        ONBOARDING_ENTITY_TYPE,
                        "/onboarding/tasks/" + task.getId(),
                        Notification.Priority.NORMAL);
                sent++;
            }
        }
        return sent;
    }

    @Transactional
    public int sendInterviewReminders(UUID tenantId) {
        LocalDateTime now = tenantTimeService.now(tenantId);
        LocalDateTime windowEnd = now.plusHours(INTERVIEW_REMINDER_WINDOW_HOURS);
        List<Interview> upcoming = interviewRepository.findUpcomingBetween(tenantId, now, windowEnd);
        if (upcoming.isEmpty()) {
            return 0;
        }

        Set<UUID> interviewerIds = new HashSet<>();
        for (Interview interview : upcoming) {
            if (interview.getInterviewerId() != null) {
                interviewerIds.add(interview.getInterviewerId());
            }
        }
        Map<UUID, UUID> userIdByEmployeeId =
                toIdMap(employeeRepository.findUserIdsByEmployeeIdsAndTenantId(interviewerIds, tenantId));

        int sent = 0;
        for (Interview interview : upcoming) {
            UUID interviewerId = interview.getInterviewerId();
            UUID userId = interviewerId == null ? null : userIdByEmployeeId.get(interviewerId);
            if (userId == null || alreadyNotified(tenantId, userId, interview.getId(), INTERVIEW_ENTITY_TYPE)) {
                continue;
            }

            String title = "Upcoming interview reminder";
            String message = String.format(
                    "You have an interview scheduled at %s.", interview.getScheduledAt());

            notificationService.createNotification(
                    userId,
                    Notification.NotificationType.REMINDER,
                    title,
                    message,
                    interview.getId(),
                    INTERVIEW_ENTITY_TYPE,
                    "/recruitment/interviews/" + interview.getId(),
                    Notification.Priority.HIGH);
            sent++;
        }
        return sent;
    }

    private boolean alreadyNotified(UUID tenantId, UUID userId, UUID relatedEntityId, String relatedEntityType) {
        return notificationRepository.existsByTenantIdAndUserIdAndRelatedEntityIdAndRelatedEntityTypeAndType(
                tenantId, userId, relatedEntityId, relatedEntityType, Notification.NotificationType.REMINDER);
    }

    private static Map<UUID, UUID> toIdMap(List<Object[]> rows) {
        Map<UUID, UUID> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((UUID) row[0], (UUID) row[1]);
        }
        return map;
    }

    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList("SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.warn("Could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }
}
