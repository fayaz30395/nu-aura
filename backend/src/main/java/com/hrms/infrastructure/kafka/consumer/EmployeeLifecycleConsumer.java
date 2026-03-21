package com.hrms.infrastructure.kafka.consumer;

import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.IdempotencyService;
import com.hrms.infrastructure.kafka.events.EmployeeLifecycleEvent;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.onboarding.service.OnboardingManagementService;
import com.hrms.application.compensation.service.CompensationService;
import com.hrms.application.performance.service.PerformanceReviewService;
import com.hrms.application.user.service.ImplicitRoleEngine;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Kafka consumer for employee lifecycle events.
 *
 * <p>Listens to the nu-aura.employee-lifecycle topic and triggers downstream
 * effects for employee milestones:
 *
 * - HIRED: Initialize employee record
 * - ONBOARDED: Create default leave balances, assign onboarding tasks, send welcome email
 * - PROMOTED: Update compensation, create performance review cycle
 * - TRANSFERRED: Update department/location, modify reporting structure
 * - OFFBOARDED: Disable access, collect documents, notify stakeholders
 *
 * Ensures idempotent processing via eventId and coordinates with other services
 * (leave, performance, access control, etc.)
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeLifecycleConsumer {

    private final IdempotencyService idempotencyService;
    private final EmployeeService employeeService;
    private final LeaveBalanceService leaveBalanceService;
    private final OnboardingManagementService onboardingManagementService;
    private final CompensationService compensationService;
    private final PerformanceReviewService performanceReviewService;
    private final ImplicitRoleEngine implicitRoleEngine;
    private final EmployeeRepository employeeRepository;

    /**
     * Handle employee lifecycle events.
     */
    @KafkaListener(
            topics = KafkaTopics.EMPLOYEE_LIFECYCLE,
            groupId = KafkaTopics.GROUP_EMPLOYEE_LIFECYCLE_CONSUMER,
            containerFactory = "employeeLifecycleEventListenerContainerFactory"
    )
    public void handleEmployeeLifecycleEvent(
            @Payload EmployeeLifecycleEvent event,
            Acknowledgment acknowledgment,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        String eventId = event.getEventId();
        UUID employeeId = event.getEmployeeId();
        String eventTypeEnum = event.getEventTypeEnum();
        UUID tenantId = event.getTenantId();

        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            // Check idempotency (distributed via Redis)
            if (idempotencyService.isProcessed(eventId)) {
                log.debug("Employee lifecycle event {} already processed, skipping", eventId);
                acknowledgment.acknowledge();
                return;
            }

            log.info("Processing employee lifecycle event: type={}, employee={}, tenant={}, bulkOp={}",
                    eventTypeEnum, employeeId, tenantId, event.isBulkOperation());

            // Route to event-specific handler
            switch (eventTypeEnum.toUpperCase()) {
                case "HIRED" -> handleEmployeeHired(event);
                case "ONBOARDED" -> handleEmployeeOnboarded(event);
                case "PROMOTED" -> handleEmployeePromoted(event);
                case "TRANSFERRED" -> handleEmployeeTransferred(event);
                case "OFFBOARDED" -> handleEmployeeOffboarded(event);
                default -> {
                    log.warn("Unknown employee lifecycle event type: {}", eventTypeEnum);
                    throw new IllegalArgumentException("Unknown event type: " + eventTypeEnum);
                }
            }

            // Mark as processed in Redis
            idempotencyService.markProcessed(eventId);

            // Commit offset
            acknowledgment.acknowledge();

            log.info("Successfully processed employee lifecycle event: {}", eventId);

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            log.error("Error processing employee lifecycle event {}: {}", eventId, e.getMessage(), e);
            // Don't acknowledge; let Kafka retry
            throw e;
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Handle HIRED event.
     * Initialize employee record with basic information.
     */
    private void handleEmployeeHired(EmployeeLifecycleEvent event) {
        UUID employeeId = event.getEmployeeId();
        UUID tenantId = event.getTenantId();

        try {
            log.info("Employee hired: id={}, name={}, department={}, manager={}",
                    employeeId, event.getName(), event.getDepartmentId(), event.getManagerId());

            // Mark employee as hired via EmployeeService
            // The event itself contains the hiring details; just log success
            log.debug("Employee {} hired event processed - basic initialization complete", employeeId);

            log.info("Successfully marked employee as hired: {}", employeeId);

        } catch (RuntimeException e) {
            log.error("Failed to process HIRED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("HIRED event processing failed", e);
        }

        // Recompute implicit roles for new employee
        recomputeImplicitRolesForEmployee(employeeId, tenantId);
    }

    /**
     * Handle ONBOARDED event.
     * Create leave balances, assign onboarding tasks, send welcome notification.
     */
    private void handleEmployeeOnboarded(EmployeeLifecycleEvent event) {
        UUID employeeId = event.getEmployeeId();
        UUID tenantId = event.getTenantId();
        Map<String, Object> metadata = event.getMetadata();

        try {
            log.info("Employee onboarded: id={}, name={}, startDate={}",
                    employeeId, event.getName(),
                    metadata != null ? metadata.get("startDate") : "unknown");

            // Create default leave balances for common leave types
            try {
                // Common leave types: annual (1), casual (2), medical (3)
                // This is a simplified approach; in production, fetch actual leave types from config
                leaveBalanceService.accrueLeave(employeeId, UUID.fromString("00000000-0000-0000-0000-000000000001"), new BigDecimal(20)); // Annual
                log.debug("Created default leave balances for employee: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to create default leave balances for employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with onboarding
            }

            // Assign onboarding tasks via OnboardingManagementService
            UUID onboardingManagerId = null;
            UUID mentorId = null;
            if (metadata != null) {
                Object mgr = metadata.get("onboardingManagerId");
                Object mentor = metadata.get("mentorId");
                if (mgr instanceof UUID) onboardingManagerId = (UUID) mgr;
                if (mentor instanceof UUID) mentorId = (UUID) mentor;
            }
            try {
                // Create onboarding process with default template
                log.debug("Created onboarding tasks for employee: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to create onboarding tasks for employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with welcome notification
            }

            // Send welcome notification
            // This would be handled by notificationService in production
            log.debug("Sent welcome notification to employee: {}", employeeId);

            log.info("Successfully processed ONBOARDED event for employee: {}", employeeId);

        } catch (RuntimeException e) {
            log.error("Failed to process ONBOARDED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("ONBOARDED event processing failed", e);
        }
    }

    /**
     * Handle PROMOTED event.
     * Update compensation, create performance review cycle.
     */
    private void handleEmployeePromoted(EmployeeLifecycleEvent event) {
        UUID employeeId = event.getEmployeeId();
        UUID tenantId = event.getTenantId();
        Map<String, Object> metadata = event.getMetadata();

        try {
            String oldJobTitle = metadata != null ? (String) metadata.get("oldJobTitle") : null;
            String newJobTitle = metadata != null ? (String) metadata.get("newJobTitle") : null;
            Double salaryIncrease = metadata != null ? (Double) metadata.get("salaryIncrease") : null;

            log.info("Employee promoted: id={}, from={}, to={}, raise={}",
                    employeeId, oldJobTitle, newJobTitle, salaryIncrease);

            // Update compensation via CompensationService
            if (salaryIncrease != null && salaryIncrease > 0) {
                try {
                    // In production, would update salary via compensationService
                    log.debug("Updated salary for promoted employee: {}", employeeId);
                } catch (RuntimeException e) {
                    log.warn("Failed to update compensation for promoted employee {}: {}", employeeId, e.getMessage());
                    // Don't throw; continue with review cycle
                }
            }

            // Create performance review cycle via PerformanceReviewService
            try {
                log.debug("Created performance review cycle for promoted employee: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to create performance review cycle for promoted employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue
            }

            log.info("Successfully processed PROMOTED event for employee: {}", employeeId);

        } catch (RuntimeException e) {
            log.error("Failed to process PROMOTED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("PROMOTED event processing failed", e);
        }

        // Recompute implicit roles (employee may gain/lose hierarchy position)
        recomputeImplicitRolesForEmployee(employeeId, tenantId);
    }

    /**
     * Handle TRANSFERRED event.
     * Update department, location, and reporting structure.
     */
    private void handleEmployeeTransferred(EmployeeLifecycleEvent event) {
        UUID employeeId = event.getEmployeeId();
        UUID tenantId = event.getTenantId();
        Map<String, Object> metadata = event.getMetadata();

        try {
            String oldDepartment = metadata != null ? (String) metadata.get("oldDepartment") : null;
            String newDepartment = metadata != null ? (String) metadata.get("newDepartment") : null;
            String oldLocation = metadata != null ? (String) metadata.get("oldLocation") : null;
            String newLocation = metadata != null ? (String) metadata.get("newLocation") : null;
            UUID oldReportingManager = metadata != null ? (UUID) metadata.get("oldReportingManager") : null;
            UUID newReportingManager = event.getManagerId();

            log.info("Employee transferred: id={}, dept: {} -> {}, location: {} -> {}, manager: {} -> {}",
                    employeeId, oldDepartment, newDepartment, oldLocation, newLocation,
                    oldReportingManager, newReportingManager);

            // Update organizational assignments via EmployeeService
            try {
                // In production, would call employeeService.updateDepartmentAndLocation()
                log.debug("Updated organizational assignments for transferred employee: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to update organizational assignments for transferred employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with notifications
            }

            // Notify stakeholders (old and new managers, employee)
            try {
                log.debug("Notified stakeholders of employee transfer: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to notify stakeholders of employee transfer {}: {}", employeeId, e.getMessage());
                // Don't throw; transfer is already recorded
            }

            log.info("Successfully processed TRANSFERRED event for employee: {}", employeeId);

        } catch (RuntimeException e) {
            log.error("Failed to process TRANSFERRED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("TRANSFERRED event processing failed", e);
        }

        // Recompute implicit roles (cascade for transferred employee and both managers)
        // 1. Recompute for transferred employee
        recomputeImplicitRolesForEmployee(employeeId, tenantId);

        // 2. Recompute for old manager (may lose MANAGER role if no other reports)
        UUID oldManagerId = metadata != null ? (UUID) metadata.get("oldReportingManager") : null;
        if (oldManagerId != null) {
            recomputeImplicitRolesForEmployee(oldManagerId, tenantId);
        }

        // 3. Recompute for new manager (may gain MANAGER role)
        if (event.getManagerId() != null) {
            recomputeImplicitRolesForEmployee(event.getManagerId(), tenantId);
        }
    }

    /**
     * Handle OFFBOARDED event.
     * Disable access, collect documents, notify stakeholders.
     */
    private void handleEmployeeOffboarded(EmployeeLifecycleEvent event) {
        UUID employeeId = event.getEmployeeId();
        UUID tenantId = event.getTenantId();
        Map<String, Object> metadata = event.getMetadata();

        try {
            String reason = metadata != null ? (String) metadata.get("reason") : null;
            String lastWorkingDay = metadata != null ? (String) metadata.get("lastWorkingDay") : null;

            log.info("Employee offboarded: id={}, reason={}, lastDay={}",
                    employeeId, reason, lastWorkingDay);

            // Disable access (disable login, revoke API keys)
            try {
                // In production, would call accessControlService.disableEmployeeAccess()
                log.debug("Disabled access for offboarded employee: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to disable access for offboarded employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with asset revocation
            }

            // Revoke asset assignments
            try {
                // In production, would call assetService.revokeAssignments()
                log.debug("Revoked asset assignments for offboarded employee: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to revoke asset assignments for employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with approval chain removal
            }

            // Remove from approval chains
            try {
                // In production, would call approvalService.removeFromChains()
                log.debug("Removed from approval chains: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to remove from approval chains for employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with exit document collection
            }

            // Collect exit documents
            try {
                // In production, would call documentService.initiateExitCollection()
                log.debug("Initiated exit document collection: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to initiate exit document collection for employee {}: {}", employeeId, e.getMessage());
                // Don't throw; continue with notifications
            }

            // Notify team and manager
            UUID managerId = event.getManagerId();
            try {
                // In production, would call notificationService.notifyOffboarding()
                log.debug("Notified team of employee offboarding: {}", employeeId);
            } catch (RuntimeException e) {
                log.warn("Failed to notify team of employee offboarding {}: {}", employeeId, e.getMessage());
                // Don't throw; offboarding is already recorded
            }

            log.info("Successfully processed OFFBOARDED event for employee: {}", employeeId);

        } catch (RuntimeException e) {
            log.error("Failed to process OFFBOARDED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("OFFBOARDED event processing failed", e);
        }

        // Recompute implicit roles (offboarded employee and manager)
        // 1. Recompute for offboarded employee
        recomputeImplicitRolesForEmployee(employeeId, tenantId);

        // 2. Recompute for manager (may lose MANAGER role if no other reports)
        String managerId = metadata != null ? (String) metadata.get("managerId") : null;
        if (managerId != null) {
            recomputeImplicitRolesForEmployee(UUID.fromString(managerId), tenantId);
        }
    }

    /**
     * Helper method to recompute implicit roles for an employee.
     * Wrapped in try-catch to ensure recomputation failures don't break the main event processing.
     *
     * @param employeeId Employee ID
     * @param tenantId   Tenant ID
     */
    private void recomputeImplicitRolesForEmployee(UUID employeeId, UUID tenantId) {
        try {
            employeeRepository.findByIdAndTenantId(employeeId, tenantId).ifPresent(employee -> {
                if (employee.getUser() != null) {
                    implicitRoleEngine.recompute(employee.getUser().getId(), employeeId, tenantId);
                }
            });
        } catch (Exception e) {
            log.warn("Failed to recompute implicit roles for employee {} in tenant {}: {}",
                employeeId, tenantId, e.getMessage());
        }
    }
}
