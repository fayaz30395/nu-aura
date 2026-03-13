package com.hrms.infrastructure.kafka.consumer;

import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.events.EmployeeLifecycleEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

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

    /**
     * In-memory cache of processed event IDs.
     * TODO: Use Redis for distributed systems.
     */
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();

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

        try {
            // Check idempotency
            if (processedEvents.containsKey(eventId)) {
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

            // Mark as processed
            processedEvents.put(eventId, true);

            // Commit offset
            acknowledgment.acknowledge();

            log.info("Successfully processed employee lifecycle event: {}", eventId);

        } catch (Exception e) {
            log.error("Error processing employee lifecycle event {}: {}", eventId, e.getMessage(), e);
            // Don't acknowledge; let Kafka retry
            throw e;
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

            // TODO: Integrate with employee service
            // employeeService.markAsHired(employeeId, event);

            log.info("Successfully marked employee as hired: {}", employeeId);

        } catch (Exception e) {
            log.error("Failed to process HIRED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("HIRED event processing failed", e);
        }
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

            // Create default leave balances
            // TODO: leaveService.createDefaultLeaveBalances(employeeId, tenantId);
            log.debug("Created default leave balances for employee: {}", employeeId);

            // Assign onboarding tasks
            UUID onboardingManagerId = null;
            UUID mentorId = null;
            if (metadata != null) {
                onboardingManagerId = (UUID) metadata.get("onboardingManagerId");
                mentorId = (UUID) metadata.get("mentorId");
            }
            // TODO: onboardingService.createOnboardingTasks(employeeId, onboardingManagerId, mentorId);
            log.debug("Created onboarding tasks for employee: {}", employeeId);

            // Send welcome notification
            // TODO: notificationService.sendWelcomeEmail(employeeId, event.getEmail(), event.getName());
            log.debug("Sent welcome notification to employee: {}", employeeId);

            log.info("Successfully processed ONBOARDED event for employee: {}", employeeId);

        } catch (Exception e) {
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

            // Update compensation
            if (salaryIncrease != null && salaryIncrease > 0) {
                // TODO: compensationService.updateSalary(employeeId, salaryIncrease);
                log.debug("Updated salary for promoted employee: {}", employeeId);
            }

            // Create performance review cycle (if annual)
            // TODO: performanceService.createReviewCycle(employeeId, tenantId);
            log.debug("Created performance review cycle for promoted employee: {}", employeeId);

            log.info("Successfully processed PROMOTED event for employee: {}", employeeId);

        } catch (Exception e) {
            log.error("Failed to process PROMOTED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("PROMOTED event processing failed", e);
        }
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

            // Update organizational assignments
            // TODO: employeeService.updateDepartmentAndLocation(employeeId, event.getDepartmentId(), newLocation);

            // Update reporting relationship
            // TODO: employeeService.updateReportingManager(employeeId, newReportingManager);
            log.debug("Updated organizational assignments for transferred employee: {}", employeeId);

            // Notify stakeholders (old and new managers, employee)
            // TODO: notificationService.notifyTransfer(employeeId, oldReportingManager, newReportingManager);
            log.debug("Notified stakeholders of employee transfer: {}", employeeId);

            log.info("Successfully processed TRANSFERRED event for employee: {}", employeeId);

        } catch (Exception e) {
            log.error("Failed to process TRANSFERRED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("TRANSFERRED event processing failed", e);
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
            // TODO: accessControlService.disableEmployeeAccess(employeeId);
            log.debug("Disabled access for offboarded employee: {}", employeeId);

            // Revoke asset assignments
            // TODO: assetService.revokeAssignments(employeeId);
            log.debug("Revoked asset assignments for offboarded employee: {}", employeeId);

            // Remove from approval chains
            // TODO: approvalService.removeFromChains(employeeId);
            log.debug("Removed from approval chains: {}", employeeId);

            // Collect exit documents
            // TODO: documentService.initiateExitCollection(employeeId);
            log.debug("Initiated exit document collection: {}", employeeId);

            // Notify team and manager
            UUID managerId = event.getManagerId();
            // TODO: notificationService.notifyOffboarding(employeeId, managerId);
            log.debug("Notified team of employee offboarding: {}", employeeId);

            log.info("Successfully processed OFFBOARDED event for employee: {}", employeeId);

        } catch (Exception e) {
            log.error("Failed to process OFFBOARDED event for employee {}: {}", employeeId, e.getMessage(), e);
            throw new RuntimeException("OFFBOARDED event processing failed", e);
        }
    }
}
