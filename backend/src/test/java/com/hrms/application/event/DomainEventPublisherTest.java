package com.hrms.application.event;

import com.hrms.domain.event.DomainEvent;
import com.hrms.domain.event.employee.EmployeeCreatedEvent;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DomainEventPublisher.
 */
@ExtendWith(MockitoExtension.class)
class DomainEventPublisherTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;
    private DomainEventPublisher domainEventPublisher;

    @BeforeEach
    void setUp() {
        domainEventPublisher = new DomainEventPublisher(applicationEventPublisher);
    }

    @Test
    void publish_shouldDelegateToApplicationEventPublisher() {
        // Arrange
        Employee employee = createTestEmployee();
        EmployeeCreatedEvent event = EmployeeCreatedEvent.of(this, employee);

        // Act
        domainEventPublisher.publish(event);

        // Assert
        verify(applicationEventPublisher).publishEvent(event);
    }

    @Test
    void publish_shouldLogEventDetails() {
        // Arrange
        Employee employee = createTestEmployee();
        EmployeeCreatedEvent event = EmployeeCreatedEvent.of(this, employee);

        // Act
        domainEventPublisher.publish(event);

        // Assert
        ArgumentCaptor<DomainEvent> eventCaptor = ArgumentCaptor.forClass(DomainEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());

        DomainEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent.getEventType()).isEqualTo("EMPLOYEE_CREATED");
        assertThat(capturedEvent.getAggregateType()).isEqualTo("Employee");
        assertThat(capturedEvent.getAggregateId()).isEqualTo(EMPLOYEE_ID);
        assertThat(capturedEvent.getTenantId()).isEqualTo(TENANT_ID);
        assertThat(capturedEvent.getEventId()).isNotBlank();
    }

    @Test
    void publishAll_shouldPublishMultipleEventsInOrder() {
        // Arrange
        Employee employee1 = createTestEmployee();
        Employee employee2 = createTestEmployee();
        employee2.setId(UUID.randomUUID());
        employee2.setEmployeeCode("EMP002");

        List<EmployeeCreatedEvent> events = List.of(
                EmployeeCreatedEvent.of(this, employee1),
                EmployeeCreatedEvent.of(this, employee2)
        );

        // Act
        domainEventPublisher.publishAll(events);

        // Assert
        verify(applicationEventPublisher, times(2)).publishEvent(any(DomainEvent.class));
    }

    @Test
    void employeeCreatedEvent_shouldContainCorrectPayload() {
        // Arrange
        Employee employee = createTestEmployee();
        EmployeeCreatedEvent event = EmployeeCreatedEvent.of(this, employee);

        // Act
        Object payload = event.getEventPayload();

        // Assert
        assertThat(payload).isInstanceOf(java.util.Map.class);
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> payloadMap = (java.util.Map<String, Object>) payload;
        assertThat(payloadMap.get("employeeId")).isEqualTo(EMPLOYEE_ID.toString());
        assertThat(payloadMap.get("employeeCode")).isEqualTo("EMP001");
        assertThat(payloadMap.get("firstName")).isEqualTo("John");
        assertThat(payloadMap.get("lastName")).isEqualTo("Doe");
        assertThat(payloadMap.get("fullName")).isEqualTo("John Doe");
        assertThat(payloadMap.get("status")).isEqualTo("ACTIVE");
        assertThat(payloadMap.get("employmentType")).isEqualTo("FULL_TIME");
    }

    private Employee createTestEmployee() {
        User user = new User();
        user.setId(USER_ID);
        user.setEmail("john.doe@example.com");

        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);
        employee.setTenantId(TENANT_ID);
        employee.setEmployeeCode("EMP001");
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setUser(user);
        employee.setJoiningDate(LocalDate.now());
        employee.setEmploymentType(Employee.EmploymentType.FULL_TIME);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
        return employee;
    }
}
