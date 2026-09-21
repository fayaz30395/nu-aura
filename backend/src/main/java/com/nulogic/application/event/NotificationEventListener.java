package com.nulogic.application.event;

import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.RoleHierarchy;
import com.nulogic.common.security.TenantContext;
import com.nulogic.application.notification.service.EmailService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.event.employee.EmployeeCreatedEvent;
import com.nulogic.domain.event.employee.EmployeeDepartmentChangedEvent;
import com.nulogic.domain.event.employee.EmployeePromotedEvent;
import com.nulogic.domain.event.employee.EmployeeStatusChangedEvent;
import com.nulogic.domain.event.employee.EmployeeTerminatedEvent;
import com.nulogic.domain.notification.EmailNotification;
import com.nulogic.domain.event.expense.ExpenseSubmittedEvent;
import com.nulogic.domain.event.leave.LeaveRequestedEvent;
import com.nulogic.domain.event.performance.PerformanceReviewCompletedEvent;
import com.nulogic.domain.event.recruitment.CandidateStatusChangedEvent;
import com.nulogic.domain.event.recruitment.OfferAcceptedEvent;
import com.nulogic.domain.event.recruitment.OfferDeclinedEvent;
import com.nulogic.domain.event.training.TrainingCompletedEvent;
import com.nulogic.domain.event.recruitment.OfferReadyToSendEvent;
import com.nulogic.domain.notification.Notification;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Listens for domain events and creates in-app notification records.
 *
 * <p>Uses @TransactionalEventListener with AFTER_COMMIT to ensure notifications
 * are only created after the originating transaction commits successfully.</p>
 *
 * <p>Handles leave and expense submission events:</p>
 * <ul>
 *   <li>leave.requested → notify manager about the leave application</li>
 *   <li>expense.submitted → notify approver about the expense claim</li>
 * </ul>
 *
 * <p>Approval workflow assignment/decision notifications are handled by
 * {@code ApprovalNotificationListener}, which owns approval-specific metadata and
 * avoids duplicate notification rows for the same assignment event.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final WebSocketNotificationService webSocketNotificationService;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    // ==================== Leave Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeaveRequested(LeaveRequestedEvent event) {
        log.info("Handling LeaveRequestedEvent: {} applied for {} leave ({} to {})",
                event.getRequesterName(), event.getLeaveType(),
                event.getStartDate(), event.getEndDate());

        UUID recipientUserId = event.getManagerId();
        if (recipientUserId == null) {
            log.warn("No manager assigned for employee {}; skipping leave notification", event.getEmployeeId());
            return;
        }

        String title = "Leave Request";
        String message = String.format("%s applied for %s leave from %s to %s",
                event.getRequesterName(), event.getLeaveType(),
                event.getStartDate(), event.getEndDate());

        createAndPushNotification(
                event.getTenantId(),
                recipientUserId,
                Notification.NotificationType.LEAVE_PENDING,
                title,
                message,
                event.getAggregateId(),
                "LeaveRequest",
                "/leave/approvals",
                Notification.Priority.NORMAL
        );
    }

    // ==================== Expense Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onExpenseSubmitted(ExpenseSubmittedEvent event) {
        log.info("Handling ExpenseSubmittedEvent: {} submitted expense of {} {}",
                event.getRequesterName(), event.getAmount(), event.getCurrency());

        UUID recipientUserId = event.getApproverId();
        if (recipientUserId == null) {
            log.warn("No approver assigned for expense {}; skipping notification", event.getAggregateId());
            return;
        }

        String title = "Expense Submitted";
        String message = String.format("%s submitted an expense of %s %s for approval",
                event.getRequesterName(), event.getCurrency(), event.getAmount().toPlainString());

        createAndPushNotification(
                event.getTenantId(),
                recipientUserId,
                Notification.NotificationType.EXPENSE_APPROVED,  // closest existing type for expense events
                title,
                message,
                event.getAggregateId(),
                "ExpenseClaim",
                "/expenses/approvals",
                Notification.Priority.NORMAL
        );
    }

    // ==================== Employee Lifecycle Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeTerminated(EmployeeTerminatedEvent event) {
        log.info("Handling EmployeeTerminatedEvent for employee: {}", event.getAggregateId());

        UUID tenantId = event.getTenantId();
        Employee employee = event.getEmployee();
        String title = "Employee Offboarding";
        String message = String.format("%s has been marked as terminated and needs offboarding.",
                employee.getFullName());

        if (employee.getManagerId() != null) {
            employeeRepository.findByIdAndTenantId(employee.getManagerId(), tenantId)
                    .map(Employee::getUser)
                    .ifPresent(managerUser -> createAndPushNotification(
                            tenantId, managerUser.getId(), Notification.NotificationType.GENERAL,
                            title, message, employee.getId(), "Employee", "/offboarding", Notification.Priority.HIGH));
        }

        // HR and IT (asset recovery / access revocation) both need to act on offboarding —
        // no dedicated "IT" role exists, ASSET_MANAGER is the closest stand-in for that duty.
        notifyRoleHolders(tenantId, RoleHierarchy.HR_ADMIN, title, message, employee.getId());
        notifyRoleHolders(tenantId, RoleHierarchy.ASSET_MANAGER, title, message, employee.getId());
    }

    private void notifyRoleHolders(UUID tenantId, String roleCode, String title, String message, UUID relatedEntityId) {
        List<UUID> userIds = userRepository.findUserIdsByRoleCode(tenantId, roleCode);
        for (UUID userId : userIds) {
            createAndPushNotification(tenantId, userId, Notification.NotificationType.GENERAL,
                    title, message, relatedEntityId, "Employee", "/offboarding", Notification.Priority.HIGH);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeCreated(EmployeeCreatedEvent event) {
        log.info("Handling EmployeeCreatedEvent for employee: {}", event.getAggregateId());

        UUID tenantId = event.getTenantId();
        Employee employee = event.getEmployee();
        if (employee.getManagerId() == null) {
            return;
        }

        String title = "New Team Member";
        String message = String.format("%s has joined your team.", employee.getFullName());

        employeeRepository.findByIdAndTenantId(employee.getManagerId(), tenantId)
                .map(Employee::getUser)
                .ifPresent(managerUser -> createAndPushNotification(
                        tenantId, managerUser.getId(), Notification.NotificationType.GENERAL,
                        title, message, employee.getId(), "Employee", "/employees/" + employee.getId(),
                        Notification.Priority.NORMAL));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeePromoted(EmployeePromotedEvent event) {
        log.info("Handling EmployeePromotedEvent for employee: {}", event.getAggregateId());

        UUID tenantId = event.getTenantId();
        Employee employee = event.getEmployee();
        String title = "Promotion";
        String message = String.format("Congratulations! You have been promoted to %s.", event.getNewDesignation());

        if (employee.getUser() != null) {
            createAndPushNotification(tenantId, employee.getUser().getId(), Notification.NotificationType.GENERAL,
                    title, message, employee.getId(), "Employee", "/me/profile", Notification.Priority.NORMAL);

            String employeeEmail = employee.getUser().getEmail();
            if (employeeEmail != null && !employeeEmail.isBlank()) {
                TenantContext.setCurrentTenant(tenantId);
                try {
                    emailService.sendEmail(employeeEmail, employee.getFullName(), EmailNotification.EmailType.GENERAL,
                            Map.of("employeeName", employee.getFullName(), "message", message));
                } catch (RuntimeException ex) {
                    log.error("Failed to send promotion email to {}: {}", employeeEmail, ex.getMessage(), ex);
                } finally {
                    TenantContext.clear();
                }
            }
        }

        if (employee.getManagerId() != null) {
            String managerMessage = String.format("%s has been promoted to %s.",
                    employee.getFullName(), event.getNewDesignation());
            employeeRepository.findByIdAndTenantId(employee.getManagerId(), tenantId)
                    .map(Employee::getUser)
                    .ifPresent(managerUser -> createAndPushNotification(
                            tenantId, managerUser.getId(), Notification.NotificationType.GENERAL,
                            title, managerMessage, employee.getId(), "Employee", "/employees/" + employee.getId(),
                            Notification.Priority.NORMAL));
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeStatusChanged(EmployeeStatusChangedEvent event) {
        log.info("Handling EmployeeStatusChangedEvent for employee: {}", event.getAggregateId());

        UUID tenantId = event.getTenantId();
        Employee employee = event.getEmployee();
        String title = "Employee Status Changed";
        String message = String.format("%s's status changed from %s to %s.",
                employee.getFullName(), event.getPreviousStatus(), event.getNewStatus());

        notifyRoleHolders(tenantId, RoleHierarchy.HR_ADMIN, title, message, employee.getId());
        notifyRoleHolders(tenantId, RoleHierarchy.HR_MANAGER, title, message, employee.getId());
    }

    // EMPLOYEE_TRANSFERRED: no distinct domain event exists — Employee.managerId /
    // departmentId changes only ever raise EmployeeDepartmentChangedEvent, which already
    // carries both old/new department and manager IDs. Wiring a separate handler for
    // "transferred" would double-notify the same commit; onEmployeeDepartmentChanged below
    // covers this case.
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeDepartmentChanged(EmployeeDepartmentChangedEvent event) {
        log.info("Handling EmployeeDepartmentChangedEvent for employee: {}", event.getAggregateId());

        UUID tenantId = event.getTenantId();
        Employee employee = event.getEmployee();
        String title = "Department Transfer";
        String message = String.format("%s has been transferred to a new department.", employee.getFullName());

        if (employee.getUser() != null) {
            createAndPushNotification(tenantId, employee.getUser().getId(), Notification.NotificationType.GENERAL,
                    title, message, employee.getId(), "Employee", "/me/profile", Notification.Priority.NORMAL);
        }

        notifyManagerOfTransfer(tenantId, event.getPreviousManagerId(), employee, title,
                String.format("%s has left your team (department transfer).", employee.getFullName()));
        notifyManagerOfTransfer(tenantId, event.getNewManagerId(), employee, title,
                String.format("%s has joined your team (department transfer).", employee.getFullName()));
    }

    private void notifyManagerOfTransfer(UUID tenantId, UUID managerId, Employee employee, String title, String message) {
        if (managerId == null) {
            return;
        }
        employeeRepository.findByIdAndTenantId(managerId, tenantId)
                .map(Employee::getUser)
                .ifPresent(managerUser -> createAndPushNotification(
                        tenantId, managerUser.getId(), Notification.NotificationType.GENERAL,
                        title, message, employee.getId(), "Employee", "/employees/" + employee.getId(),
                        Notification.Priority.NORMAL));
    }

    // ==================== Onboarding/Offboarding Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOnboardingProcessStatusChanged(
            com.nulogic.domain.event.onboarding.OnboardingProcessStatusChangedEvent event) {
        log.info("Handling OnboardingProcessStatusChangedEvent: process {} ({} -> {})",
                event.getAggregateId(), event.getOldStatus(), event.getNewStatus());

        UUID tenantId = event.getTenantId();
        String processLabel = event.getProcessType() != null ? event.getProcessType().name() : "Onboarding";
        String title = processLabel + " Status Updated";
        String message = String.format("Your %s process moved from %s to %s",
                processLabel.toLowerCase(), event.getOldStatus(), event.getNewStatus());

        employeeRepository.findByIdAndTenantId(event.getEmployeeId(), tenantId)
                .map(Employee::getUser)
                .ifPresent(user -> createAndPushNotification(
                        tenantId, user.getId(), Notification.NotificationType.GENERAL,
                        title, message, event.getAggregateId(), "OnboardingProcess",
                        "/onboarding", Notification.Priority.NORMAL));

        if (event.getAssignedBuddyId() != null) {
            employeeRepository.findByIdAndTenantId(event.getAssignedBuddyId(), tenantId)
                    .map(Employee::getUser)
                    .ifPresent(buddyUser -> createAndPushNotification(
                            tenantId, buddyUser.getId(), Notification.NotificationType.GENERAL,
                            processLabel + " Buddy Update",
                            String.format("An %s process you are buddying moved from %s to %s",
                                    processLabel.toLowerCase(), event.getOldStatus(), event.getNewStatus()),
                            event.getAggregateId(), "OnboardingProcess", "/onboarding", Notification.Priority.LOW));
        }
    }

    // ==================== Performance Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPerformanceReviewCompleted(PerformanceReviewCompletedEvent event) {
        log.info("Handling PerformanceReviewCompletedEvent for employee: {}", event.getEmployeeId());

        UUID tenantId = event.getTenantId();
        employeeRepository.findByIdAndTenantId(event.getEmployeeId(), tenantId)
                .map(Employee::getUser)
                .ifPresent(user -> createAndPushNotification(
                        tenantId, user.getId(), Notification.NotificationType.GENERAL,
                        "Performance Review Completed",
                        "Your performance review has been completed" +
                                (event.getOverallRating() != null ? " with an overall rating of " + event.getOverallRating() : "") + ".",
                        event.getReviewId(), "PerformanceReview", "/performance/my-reviews", Notification.Priority.NORMAL));
    }

    // ==================== Training Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTrainingCompleted(TrainingCompletedEvent event) {
        log.info("Handling TrainingCompletedEvent for employee: {}", event.getEmployeeId());

        employeeRepository.findByIdAndTenantId(event.getEmployeeId(), event.getTenantId())
                .map(Employee::getUser)
                .ifPresent(user -> createAndPushNotification(
                        event.getTenantId(), user.getId(), Notification.NotificationType.GENERAL,
                        "Training Completed",
                        String.format("You have completed the training program: %s", event.getProgramName()),
                        event.getProgramId(), "TrainingProgram", "/training", Notification.Priority.NORMAL));
    }

    // ==================== Recruitment Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOfferAccepted(OfferAcceptedEvent event) {
        log.info("Handling OfferAcceptedEvent: {} accepted the offer for {}",
                event.getCandidateName(), event.getJobTitle());

        String title = "Offer Accepted";
        String message = String.format("%s accepted the offer for %s", event.getCandidateName(), event.getJobTitle());

        notifyRecruitmentStakeholders(event.getTenantId(), event.getRecruiterId(), event.getHiringManagerId(),
                title, message, event.getAggregateId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOfferDeclined(OfferDeclinedEvent event) {
        log.info("Handling OfferDeclinedEvent: {} declined the offer for {}",
                event.getCandidateName(), event.getJobTitle());

        String title = "Offer Declined";
        String message = String.format("%s declined the offer for %s", event.getCandidateName(), event.getJobTitle());

        notifyRecruitmentStakeholders(event.getTenantId(), event.getRecruiterId(), event.getHiringManagerId(),
                title, message, event.getAggregateId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOfferReadyToSend(OfferReadyToSendEvent event) {
        log.info("Handling OfferReadyToSendEvent: offer for {} ({}) approved and ready to send",
                event.getCandidateName(), event.getJobTitle());

        String title = "Offer Ready to Send";
        String message = String.format("The offer for %s (%s) has been approved and is ready to send",
                event.getCandidateName(), event.getJobTitle());

        notifyRecruitmentStakeholders(event.getTenantId(), event.getRecruiterId(), event.getHiringManagerId(),
                title, message, event.getAggregateId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCandidateStatusChanged(CandidateStatusChangedEvent event) {
        log.info("Handling CandidateStatusChangedEvent: {} moved from {} to {} for {}",
                event.getCandidateName(), event.getOldStatus(), event.getNewStatus(), event.getJobTitle());

        String title = "Candidate Status Updated";
        String message = String.format("%s's status changed from %s to %s for %s",
                event.getCandidateName(), event.getOldStatus(), event.getNewStatus(), event.getJobTitle());

        notifyRecruitmentStakeholders(event.getTenantId(), event.getRecruiterId(), event.getHiringManagerId(),
                title, message, event.getAggregateId());
    }

    private void notifyRecruitmentStakeholders(UUID tenantId, UUID recruiterId, UUID hiringManagerId,
                                               String title, String message, UUID candidateId) {
        if (recruiterId == null && hiringManagerId == null) {
            log.warn("No recruiter or hiring manager assigned for candidate {}; skipping offer response notification", candidateId);
            return;
        }

        if (recruiterId != null) {
            createAndPushNotification(tenantId, recruiterId, Notification.NotificationType.GENERAL,
                    title, message, candidateId, "Candidate", "/hire/candidates", Notification.Priority.NORMAL);
        }
        if (hiringManagerId != null && !hiringManagerId.equals(recruiterId)) {
            createAndPushNotification(tenantId, hiringManagerId, Notification.NotificationType.GENERAL,
                    title, message, candidateId, "Candidate", "/hire/candidates", Notification.Priority.NORMAL);
        }
    }

    // ==================== Helper ====================

    /**
     * Creates a persisted notification record and pushes it via WebSocket
     * for real-time delivery.
     */
    private void createAndPushNotification(UUID tenantId, UUID recipientUserId,
                                           Notification.NotificationType type,
                                           String title, String message,
                                           UUID relatedEntityId, String relatedEntityType,
                                           String actionUrl, Notification.Priority priority) {
        try {
            // Set tenant context for the notification service
            TenantContext.setCurrentTenant(tenantId);

            Notification notification = notificationService.createNotification(
                    recipientUserId, type, title, message,
                    relatedEntityId, relatedEntityType, actionUrl, priority);

            // Push real-time via WebSocket using the NotificationMessage DTO
            try {
                NotificationMessage wsMessage = NotificationMessage.builder()
                        .type(mapToWsType(type))
                        .title(title)
                        .message(message)
                        .priority(mapToWsPriority(priority))
                        .actionUrl(actionUrl)
                        .read(false)
                        .build();
                webSocketNotificationService.sendToUser(recipientUserId, wsMessage);
            } catch (Exception wsEx) { // Intentional broad catch — WebSocket send may throw checked exceptions
                log.warn("Failed to send WebSocket notification to user {}: {}",
                        recipientUserId, wsEx.getMessage());
                // Non-fatal — the persisted notification will be picked up by REST polling
            }

            log.debug("Notification created: id={} type={} recipient={}",
                    notification.getId(), type, recipientUserId);
        } catch (RuntimeException ex) {
            log.error("Failed to create notification for user {}: {}",
                    recipientUserId, ex.getMessage(), ex);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Maps domain NotificationType to WebSocket NotificationMessage.NotificationType.
     */
    private NotificationMessage.NotificationType mapToWsType(Notification.NotificationType type) {
        return switch (type) {
            case LEAVE_PENDING -> NotificationMessage.NotificationType.LEAVE_REQUEST;
            case LEAVE_APPROVED -> NotificationMessage.NotificationType.LEAVE_APPROVED;
            case LEAVE_REJECTED -> NotificationMessage.NotificationType.LEAVE_REJECTED;
            case EXPENSE_APPROVED, EXPENSE_REJECTED -> NotificationMessage.NotificationType.TASK_ASSIGNED;
            case PAYROLL_GENERATED -> NotificationMessage.NotificationType.PAYROLL_PROCESSED;
            case ANNOUNCEMENT -> NotificationMessage.NotificationType.ANNOUNCEMENT;
            case SYSTEM_ALERT -> NotificationMessage.NotificationType.SYSTEM_ALERT;
            default -> NotificationMessage.NotificationType.SYSTEM_ALERT;
        };
    }

    /**
     * Maps domain Priority to WebSocket NotificationMessage.Priority.
     */
    private NotificationMessage.Priority mapToWsPriority(Notification.Priority priority) {
        return switch (priority) {
            case LOW -> NotificationMessage.Priority.LOW;
            case NORMAL -> NotificationMessage.Priority.NORMAL;
            case HIGH -> NotificationMessage.Priority.HIGH;
            case URGENT -> NotificationMessage.Priority.URGENT;
        };
    }
}
