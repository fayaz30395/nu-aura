# Kafka Integration Guide for NU-AURA HRMS

This guide provides step-by-step instructions for integrating Kafka event publishing and consuming into NU-AURA services.

## Quick Start

### 1. Add Spring Kafka Dependency

Add to `backend/pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

### 2. Start Kafka

```bash
cd /path/to/nu-aura
docker-compose up -d zookeeper kafka
```

Verify Kafka is running:

```bash
docker logs hrms-kafka | grep "started"
```

### 3. Start Application

```bash
cd backend
./start-backend.sh
```

The KafkaConfig bean will automatically create all topics.

## Integration Examples

### Example 1: Publishing Approval Events

**File**: `backend/src/main/java/com/hrms/infrastructure/leave/service/LeaveApprovalService.java`

```java
package com.hrms.infrastructure.leave.service;

import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LeaveApprovalService {

    private final LeaveRequestRepository leaveRepository;
    private final EventPublisher eventPublisher;

    /**
     * Approve a leave request.
     */
    public LeaveRequest approveLeaveRequest(UUID leaveRequestId, UUID approverId, String comments) {
        LeaveRequest leave = leaveRepository.findById(leaveRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));

        leave.setStatus(LeaveStatus.APPROVED);
        leave.setApprovedBy(approverId);
        leave.setApprovedAt(LocalDateTime.now());

        LeaveRequest saved = leaveRepository.save(leave);

        // Publish approval event
        eventPublisher.publishApprovalEvent(
                leaveRequestId,
                UUID.randomUUID(),  // taskId (from workflow)
                "LEAVE",
                "APPROVED",
                leave.getTenantId(),
                approverId,
                leave.getEmployeeId(),
                comments,
                true,  // isTerminal
                Map.of(
                        "leaveRequestId", leaveRequestId.toString(),
                        "leaveType", leave.getLeaveType().name(),
                        "days", leave.getDays(),
                        "leaveBalance", calculateRemainingBalance(leave.getEmployeeId())
                )
        );

        return saved;
    }

    /**
     * Reject a leave request.
     */
    public LeaveRequest rejectLeaveRequest(UUID leaveRequestId, UUID approverId, String reason) {
        LeaveRequest leave = leaveRepository.findById(leaveRequestId)
                .orElseThrow();

        leave.setStatus(LeaveStatus.REJECTED);
        leave.setRejectedBy(approverId);
        leave.setRejectionReason(reason);

        LeaveRequest saved = leaveRepository.save(leave);

        // Publish rejection event
        eventPublisher.publishApprovalEvent(
                leaveRequestId,
                UUID.randomUUID(),
                "LEAVE",
                "REJECTED",
                leave.getTenantId(),
                approverId,
                leave.getEmployeeId(),
                reason,
                true,
                Map.of("leaveRequestId", leaveRequestId.toString())
        );

        // Also publish a rejection notification
        eventPublisher.publishNotificationEvent(
                leave.getEmployeeId(),
                "EMAIL",
                "Leave Request Rejected",
                null,
                "leave-rejected",
                Map.of(
                        "employeeName", leave.getEmployee().getName(),
                        "leaveType", leave.getLeaveType().name(),
                        "reason", reason,
                        "requestDate", leave.getRequestedAt().toString()
                ),
                leave.getTenantId(),
                leaveRequestId,
                "LEAVE_REQUEST",
                "/app/leave/requests/" + leaveRequestId,
                "NORMAL"
        );

        return saved;
    }

    private Integer calculateRemainingBalance(UUID employeeId) {
        // TODO: Calculate remaining balance from leave_balance table
        return 10;
    }
}
```

### Example 2: Consuming Approval Events

The `ApprovalEventConsumer` already handles leave approvals. Just implement the TODO:

**File**: `backend/src/main/java/com/hrms/infrastructure/kafka/consumer/ApprovalEventConsumer.java`

```java
private void handleLeaveApproved(ApprovalEvent event) {
    if (!event.isTerminal()) {
        log.debug("Leave approval is not terminal, skipping balance deduction");
        return;
    }

    Map<String, Object> metadata = event.getMetadata();
    if (metadata == null) {
        log.warn("No metadata found for leave approval");
        return;
    }

    UUID leaveRequestId = UUID.fromString((String) metadata.get("leaveRequestId"));
    String leaveType = (String) metadata.get("leaveType");
    Integer days = (Integer) metadata.get("days");

    try {
        log.info("Deducting {} days of {} leave for request {}", days, leaveType, leaveRequestId);

        // IMPLEMENT THIS:
        leaveService.deductLeaveBalance(
                event.getRequesterId(),  // employeeId
                LeaveType.valueOf(leaveType),
                days,
                leaveRequestId
        );

        log.info("Successfully deducted leave balance for request {}", leaveRequestId);

    } catch (Exception e) {
        log.error("Failed to deduct leave balance for request {}: {}", leaveRequestId, e.getMessage(), e);
        throw new RuntimeException("Leave deduction failed", e);
    }
}
```

### Example 3: Publishing Employee Lifecycle Events

**File**: `backend/src/main/java/com/hrms/infrastructure/employee/service/EmployeeService.java`

```java
package com.hrms.infrastructure.employee.service;

import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EventPublisher eventPublisher;
    private final LeaveService leaveService;

    /**
     * Onboard an employee (grant access, create leave balances, assign tasks).
     */
    public void onboardEmployee(UUID employeeId, LocalDate startDate, UUID onboardingManagerId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow();

        employee.setOnboardingStatus(OnboardingStatus.IN_PROGRESS);
        employee.setStartDate(startDate);
        employeeRepository.save(employee);

        // Publish onboarded event
        eventPublisher.publishEmployeeLifecycleEvent(
                employeeId,
                "ONBOARDED",
                getCurrentUserId(),  // initiatedBy
                employee.getTenantId(),
                employee.getEmail(),
                employee.getName(),
                employee.getDepartmentId(),
                employee.getManagerId(),
                employee.getJobTitle(),
                employee.getEmploymentType(),
                Map.of(
                        "startDate", startDate.toString(),
                        "onboardingManagerId", onboardingManagerId.toString(),
                        "mentorId", assignMentor(employeeId).toString()
                ),
                false
        );
    }

    /**
     * Promote an employee.
     */
    public void promoteEmployee(UUID employeeId, String newJobTitle, Double salaryIncrease) {
        Employee employee = employeeRepository.findById(employeeId).orElseThrow();
        String oldJobTitle = employee.getJobTitle();

        employee.setJobTitle(newJobTitle);
        employee.setSalary(employee.getSalary() + salaryIncrease);
        Employee saved = employeeRepository.save(employee);

        eventPublisher.publishEmployeeLifecycleEvent(
                employeeId,
                "PROMOTED",
                getCurrentUserId(),
                employee.getTenantId(),
                employee.getEmail(),
                employee.getName(),
                employee.getDepartmentId(),
                employee.getManagerId(),
                newJobTitle,
                employee.getEmploymentType(),
                Map.of(
                        "oldJobTitle", oldJobTitle,
                        "newJobTitle", newJobTitle,
                        "salaryIncrease", salaryIncrease,
                        "effectiveDate", LocalDate.now().toString()
                ),
                false
        );
    }

    /**
     * Offboard an employee (disable access, collect documents).
     */
    public void offboardEmployee(UUID employeeId, String reason, LocalDate lastWorkingDay) {
        Employee employee = employeeRepository.findById(employeeId).orElseThrow();

        employee.setOffboardingStatus(OffboardingStatus.IN_PROGRESS);
        employee.setLastWorkingDay(lastWorkingDay);
        employeeRepository.save(employee);

        eventPublisher.publishEmployeeLifecycleEvent(
                employeeId,
                "OFFBOARDED",
                getCurrentUserId(),
                employee.getTenantId(),
                employee.getEmail(),
                employee.getName(),
                employee.getDepartmentId(),
                employee.getManagerId(),
                employee.getJobTitle(),
                employee.getEmploymentType(),
                Map.of(
                        "reason", reason,
                        "lastWorkingDay", lastWorkingDay.toString()
                ),
                false
        );
    }
}
```

### Example 4: Publishing Notification Events

**File**: `backend/src/main/java/com/hrms/infrastructure/notification/service/ApprovalNotificationService.java`

```java
package com.hrms.infrastructure.notification.service;

import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ApprovalNotificationService {

    private final EventPublisher eventPublisher;

    /**
     * Notify approver of pending approval task.
     */
    public void notifyApprovalTask(UUID approverId, String approvalType, UUID requestId, UUID tenantId) {
        String subject = "New " + approvalType + " Approval Task";
        String templateName = approvalType.toLowerCase() + "-pending-approval";

        eventPublisher.publishNotificationEvent(
                approverId,
                "EMAIL",
                subject,
                null,  // body (use template)
                templateName,
                Map.of(
                        "approvalType", approvalType,
                        "requestId", requestId.toString(),
                        "actionUrl", "https://app.example.com/approvals/" + requestId
                ),
                tenantId,
                requestId,
                "APPROVAL_TASK",
                "https://app.example.com/approvals/" + requestId,
                "HIGH"
        );
    }

    /**
     * Notify requester of approval decision.
     */
    public void notifyApprovalDecision(
            UUID requesterId,
            String approvalType,
            UUID requestId,
            String decision,
            String reason,
            UUID tenantId) {

        String subject = approvalType + " " + decision;
        String templateName = approvalType.toLowerCase() + "-" + decision.toLowerCase();

        eventPublisher.publishNotificationEvent(
                requesterId,
                "EMAIL",
                subject,
                null,
                templateName,
                Map.of(
                        "approvalType", approvalType,
                        "decision", decision,
                        "reason", reason,
                        "requestId", requestId.toString()
                ),
                tenantId,
                requestId,
                "APPROVAL_DECISION",
                null,
                decision.equals("APPROVED") ? "HIGH" : "NORMAL"
        );
    }
}
```

### Example 5: Consuming Employee Lifecycle Events

The `EmployeeLifecycleConsumer` handles lifecycle events. Implement the TODOs:

**File**: `backend/src/main/java/com/hrms/infrastructure/kafka/consumer/EmployeeLifecycleConsumer.java`

```java
private void handleEmployeeOnboarded(EmployeeLifecycleEvent event) {
    UUID employeeId = event.getEmployeeId();

    try {
        // 1. Create default leave balances
        leaveService.createDefaultLeaveBalances(employeeId, event.getTenantId());

        // 2. Create onboarding tasks
        UUID onboardingManagerId = (UUID) event.getMetadata().get("onboardingManagerId");
        onboardingService.createOnboardingTasks(employeeId, onboardingManagerId);

        // 3. Send welcome email
        notificationService.sendWelcomeEmail(employeeId, event.getEmail(), event.getName());

        log.info("Successfully onboarded employee: {}", employeeId);

    } catch (Exception e) {
        log.error("Onboarding failed: {}", e.getMessage(), e);
        throw e;
    }
}
```

## Testing Kafka Integration

### Manual Testing with kafka-console-producer

```bash
# Enter Kafka container
docker exec -it hrms-kafka bash

# Produce a test approval event
kafka-console-producer --broker-list localhost:9092 --topic nu-aura.approvals

# Paste JSON (Ctrl+D to send):
{
  "event_id": "test-001",
  "event_type": "APPROVAL_APPROVED",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-03-12T10:00:00",
  "source": "test",
  "approval_id": "550e8400-e29b-41d4-a716-446655440001",
  "approval_type": "LEAVE",
  "status": "APPROVED",
  "is_terminal": true
}
```

### Consuming Messages with kafka-console-consumer

```bash
# Read from latest messages
kafka-console-consumer --bootstrap-server localhost:9092 --topic nu-aura.audit --from-beginning
```

### Unit Test Example

```java
@SpringBootTest
@EmbeddedKafka(partitions = 1, brokerProperties = {"log.dir=/tmp/kafka"})
public class ApprovalEventConsumerTest {

    @Autowired
    private KafkaTemplate<String, ApprovalEvent> kafkaTemplate;

    @Autowired
    private ApprovalEventConsumer consumer;

    @Test
    public void testLeaveApprovalProcessing() throws InterruptedException {
        // Given
        ApprovalEvent event = ApprovalEvent.builder()
                .eventId("test-001")
                .eventType("APPROVAL_APPROVED")
                .tenantId(UUID.randomUUID())
                .timestamp(LocalDateTime.now())
                .source("test")
                .approvalId(UUID.randomUUID())
                .approvalType("LEAVE")
                .status("APPROVED")
                .isTerminal(true)
                .metadata(Map.of(
                        "leaveRequestId", UUID.randomUUID().toString(),
                        "leaveType", "SICK_LEAVE",
                        "days", 3
                ))
                .build();

        // When
        kafkaTemplate.send(KafkaTopics.APPROVALS, event);
        Thread.sleep(1000);  // Wait for processing

        // Then
        // Verify leave balance was deducted
    }
}
```

## Troubleshooting

### Topics not created automatically

Verify KafkaConfig is loaded:

```bash
curl http://localhost:8080/actuator/beans | grep KafkaConfig
```

If missing, check application logs for configuration errors.

### Consumer lag increasing

Check if consumers are running:

```bash
docker exec hrms-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

### Messages in DLT

Check error logs:

```bash
docker logs hrms-backend | grep "DeadLetterHandler\|Error processing"
```

Inspect failed events table:

```sql
SELECT * FROM failed_events ORDER BY stored_at DESC LIMIT 10;
```

## Next Steps

1. Update leave service to publish events (Example 1)
2. Implement ApprovalEventConsumer TODOs (Example 2)
3. Update employee service with lifecycle events (Example 3)
4. Create notification templates for email rendering
5. Implement audit log persistence
6. Set up monitoring and alerting
7. Load test with high approval/notification volume
8. Migrate idempotency to Redis for multi-instance deployment

---

For detailed architecture, see [KAFKA_IMPLEMENTATION.md](./KAFKA_IMPLEMENTATION.md)
