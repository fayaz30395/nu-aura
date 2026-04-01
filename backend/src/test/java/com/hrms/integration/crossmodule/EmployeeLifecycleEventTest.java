package com.hrms.integration.crossmodule;

import com.hrms.application.event.DomainEventPublisher;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.DomainEvent;
import com.hrms.domain.event.employee.EmployeeCreatedEvent;
import com.hrms.domain.event.employee.EmployeeTerminatedEvent;
import com.hrms.domain.event.employee.EmployeeStatusChangedEvent;
import com.hrms.domain.user.User;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Cross-module business flow test: Employee Lifecycle -> Downstream Module Impact.
 *
 * Verifies that employee lifecycle events (created, terminated, status changed)
 * carry the correct payload for consuming modules:
 * - Permissions/RBAC (user status, roles)
 * - Reporting lines (manager changes)
 * - Payroll (status for salary processing)
 * - Onboarding/offboarding workflows
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Cross-Module: Employee Lifecycle Events -> Downstream Modules")
class EmployeeLifecycleEventTest {

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    private DomainEventPublisher domainEventPublisher;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID MANAGER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        domainEventPublisher = new DomainEventPublisher(applicationEventPublisher);
    }

    @Nested
    @DisplayName("EmployeeCreatedEvent")
    class EmployeeCreatedEventTests {

        @Test
        @DisplayName("Should publish event with correct payload for onboarding workflow")
        void shouldPublishEventWithCorrectPayloadForOnboarding() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.ACTIVE);

            // When
            EmployeeCreatedEvent event = EmployeeCreatedEvent.of(this, employee);
            domainEventPublisher.publish(event);

            // Then
            ArgumentCaptor<DomainEvent> captor = ArgumentCaptor.forClass(DomainEvent.class);
            verify(applicationEventPublisher).publishEvent(captor.capture());

            DomainEvent captured = captor.getValue();
            assertThat(captured.getEventType()).isEqualTo("EMPLOYEE_CREATED");
            assertThat(captured.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(captured.getAggregateId()).isEqualTo(EMPLOYEE_ID);
            assertThat(captured.getAggregateType()).isEqualTo("Employee");
        }

        @Test
        @DisplayName("Event payload should contain fields needed by RBAC and permissions module")
        void eventPayloadShouldContainRbacFields() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.ACTIVE);

            // When
            EmployeeCreatedEvent event = EmployeeCreatedEvent.of(this, employee);

            // Then
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();

            assertThat(payload).containsKey("employeeId");
            assertThat(payload).containsKey("employeeCode");
            assertThat(payload).containsKey("fullName");
            assertThat(payload).containsKey("status");
            assertThat(payload).containsKey("email");
            assertThat(payload).containsKey("userId");
            assertThat(payload).containsKey("joiningDate");
            assertThat(payload.get("status")).isEqualTo("ACTIVE");
            assertThat(payload.get("employmentType")).isEqualTo("FULL_TIME");
        }

        @Test
        @DisplayName("Event should carry tenant context for multi-tenant isolation")
        void eventShouldCarryTenantContext() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.ACTIVE);

            // When
            EmployeeCreatedEvent event = EmployeeCreatedEvent.of(this, employee);

            // Then
            assertThat(event.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(event.getEventId()).isNotNull();
            assertThat(event.getOccurredAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("EmployeeTerminatedEvent")
    class EmployeeTerminatedEventTests {

        @Test
        @DisplayName("Should publish event with termination details for offboarding")
        void shouldPublishTerminationEventForOffboarding() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.TERMINATED);
            employee.setExitDate(LocalDate.now().plusDays(30));
            String terminationReason = "Voluntary resignation";

            // When
            EmployeeTerminatedEvent event = EmployeeTerminatedEvent.of(this, employee, terminationReason);
            domainEventPublisher.publish(event);

            // Then
            ArgumentCaptor<DomainEvent> captor = ArgumentCaptor.forClass(DomainEvent.class);
            verify(applicationEventPublisher).publishEvent(captor.capture());

            DomainEvent captured = captor.getValue();
            assertThat(captured.getEventType()).isEqualTo("EMPLOYEE_TERMINATED");
        }

        @Test
        @DisplayName("Event payload should contain termination reason and exit date for FnF/payroll")
        void eventPayloadShouldContainTerminationDetails() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.TERMINATED);
            employee.setExitDate(LocalDate.of(2026, 4, 30));

            // When
            EmployeeTerminatedEvent event = EmployeeTerminatedEvent.of(
                    this, employee, "Performance issues");

            // Then
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();

            assertThat(payload.get("terminationReason")).isEqualTo("Performance issues");
            assertThat(payload.get("exitDate")).isEqualTo("2026-04-30");
            assertThat(payload.get("status")).isEqualTo("TERMINATED");
        }

        @Test
        @DisplayName("Terminated employee event should trigger access revocation checks")
        void terminatedEmployeeShouldTriggerAccessRevocation() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.TERMINATED);

            // When
            EmployeeTerminatedEvent event = EmployeeTerminatedEvent.of(
                    this, employee, "Contract ended");

            // Then - verify event can be used by RBAC module to revoke access
            assertThat(event.getEmployee().getStatus())
                    .isEqualTo(Employee.EmployeeStatus.TERMINATED);
            assertThat(event.getTenantId()).isEqualTo(TENANT_ID);

            // The RBAC consumer should check: if status == TERMINATED, deactivate user account
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();
            assertThat(payload.get("status")).isEqualTo("TERMINATED");
        }
    }

    @Nested
    @DisplayName("EmployeeStatusChangedEvent")
    class EmployeeStatusChangedEventTests {

        @Test
        @DisplayName("Should carry old and new status for reporting line recalculation")
        void shouldCarryOldAndNewStatus() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.ON_NOTICE);

            // When
            EmployeeStatusChangedEvent event = EmployeeStatusChangedEvent.of(
                    this, employee,
                    Employee.EmployeeStatus.ACTIVE,
                    Employee.EmployeeStatus.ON_NOTICE
            );

            // Then
            assertThat(event.getEventType()).isEqualTo("EMPLOYEE_STATUS_CHANGED");
            assertThat(event.getPreviousStatus()).isEqualTo(Employee.EmployeeStatus.ACTIVE);
            assertThat(event.getNewStatus()).isEqualTo(Employee.EmployeeStatus.ON_NOTICE);
        }

        @Test
        @DisplayName("Status change event payload should contain old and new status for downstream modules")
        void statusChangePayloadShouldContainBothStatuses() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.ACTIVE);

            // When
            EmployeeStatusChangedEvent event = EmployeeStatusChangedEvent.of(
                    this, employee,
                    Employee.EmployeeStatus.ACTIVE,
                    Employee.EmployeeStatus.ACTIVE
            );

            // Then
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();

            assertThat(payload).containsKey("previousStatus");
            assertThat(payload).containsKey("newStatus");
            assertThat(payload).containsKey("employeeId");
        }
    }

    @Nested
    @DisplayName("Event Publishing Integrity")
    class EventPublishingIntegrity {

        @Test
        @DisplayName("Multiple lifecycle events should publish independently")
        void multipleLifecycleEventsShouldPublishIndependently() {
            // Given
            Employee emp1 = buildEmployee(Employee.EmployeeStatus.ACTIVE);
            Employee emp2 = buildEmployee(Employee.EmployeeStatus.ACTIVE);
            emp2.setId(UUID.randomUUID());
            emp2.setEmployeeCode("EMP002");

            // When
            domainEventPublisher.publish(EmployeeCreatedEvent.of(this, emp1));
            domainEventPublisher.publish(EmployeeCreatedEvent.of(this, emp2));

            // Then
            verify(applicationEventPublisher, times(2)).publishEvent(any(DomainEvent.class));
        }

        @Test
        @DisplayName("Event IDs should be unique for idempotency tracking")
        void eventIdsShouldBeUnique() {
            // Given
            Employee employee = buildEmployee(Employee.EmployeeStatus.ACTIVE);

            // When
            EmployeeCreatedEvent event1 = EmployeeCreatedEvent.of(this, employee);
            EmployeeCreatedEvent event2 = EmployeeCreatedEvent.of(this, employee);

            // Then
            assertThat(event1.getEventId()).isNotEqualTo(event2.getEventId());
        }
    }

    // ===================== Helper Methods =====================

    private Employee buildEmployee(Employee.EmployeeStatus status) {
        User user = new User();
        user.setId(USER_ID);
        user.setEmail("john.doe@company.com");

        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);
        employee.setTenantId(TENANT_ID);
        employee.setEmployeeCode("EMP001");
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setUser(user);
        employee.setManagerId(MANAGER_ID);
        employee.setJoiningDate(LocalDate.now());
        employee.setEmploymentType(Employee.EmploymentType.FULL_TIME);
        employee.setStatus(status);
        return employee;
    }
}
