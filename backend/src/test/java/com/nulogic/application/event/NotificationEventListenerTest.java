package com.nulogic.application.event;

import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.application.notification.service.EmailService;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.RoleHierarchy;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.event.employee.EmployeeCreatedEvent;
import com.nulogic.domain.event.employee.EmployeeDepartmentChangedEvent;
import com.nulogic.domain.event.employee.EmployeePromotedEvent;
import com.nulogic.domain.event.employee.EmployeeStatusChangedEvent;
import com.nulogic.domain.event.employee.EmployeeTerminatedEvent;
import com.nulogic.domain.event.performance.PerformanceReviewCompletedEvent;
import com.nulogic.domain.event.training.TrainingCompletedEvent;
import com.nulogic.domain.notification.Notification;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for the employee-lifecycle, performance, and training
 * handlers added to {@link NotificationEventListener}: verifies notificationService
 * is invoked for the expected recipient with the expected {@link Notification.NotificationType}.
 */
@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID MANAGER_USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_USER_ID = UUID.randomUUID();

    @Mock
    private NotificationService notificationService;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EmailService emailService;

    private NotificationEventListener listener;

    @BeforeEach
    void setUp() {
        listener = new NotificationEventListener(
                notificationService, webSocketNotificationService, employeeRepository, userRepository, emailService);
        lenient().when(notificationService.createNotification(
                any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Notification.builder().build());
    }

    @Test
    void onEmployeeCreatedNotifiesManager() {
        UUID managerId = UUID.randomUUID();
        Employee employee = employee(managerId, null);
        when(employeeRepository.findByIdAndTenantId(managerId, TENANT_ID))
                .thenReturn(Optional.of(managerEmployee()));

        listener.onEmployeeCreated(EmployeeCreatedEvent.of(this, employee));

        verify(notificationService).createNotification(
                eq(MANAGER_USER_ID), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(employee.getId()), eq("Employee"), any(), eq(Notification.Priority.NORMAL));
        verify(webSocketNotificationService).sendToUser(eq(MANAGER_USER_ID), any(NotificationMessage.class));
    }

    @Test
    void onEmployeePromotedNotifiesEmployeeAndManager() {
        UUID managerId = UUID.randomUUID();
        Employee employee = employee(managerId, EMPLOYEE_USER_ID);
        when(employeeRepository.findByIdAndTenantId(managerId, TENANT_ID))
                .thenReturn(Optional.of(managerEmployee()));

        listener.onEmployeePromoted(EmployeePromotedEvent.of(this, employee,
                "Engineer", "Senior Engineer", Employee.EmployeeLevel.MID, Employee.EmployeeLevel.SENIOR));

        ArgumentCaptor<UUID> recipientCaptor = ArgumentCaptor.forClass(UUID.class);
        verify(notificationService, org.mockito.Mockito.times(2)).createNotification(
                recipientCaptor.capture(), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(employee.getId()), eq("Employee"), any(), eq(Notification.Priority.NORMAL));
        assertThat(recipientCaptor.getAllValues()).containsExactlyInAnyOrder(EMPLOYEE_USER_ID, MANAGER_USER_ID);
    }

    @Test
    void onEmployeeStatusChangedNotifiesHrAdminAndHrManager() {
        Employee employee = employee(null, null);
        UUID hrAdminUserId = UUID.randomUUID();
        UUID hrManagerUserId = UUID.randomUUID();
        when(userRepository.findUserIdsByRoleCode(TENANT_ID, RoleHierarchy.HR_ADMIN))
                .thenReturn(List.of(hrAdminUserId));
        when(userRepository.findUserIdsByRoleCode(TENANT_ID, RoleHierarchy.HR_MANAGER))
                .thenReturn(List.of(hrManagerUserId));

        listener.onEmployeeStatusChanged(EmployeeStatusChangedEvent.of(this, employee,
                Employee.EmployeeStatus.ACTIVE, Employee.EmployeeStatus.ON_LEAVE));

        verify(notificationService).createNotification(
                eq(hrAdminUserId), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(employee.getId()), any(), any(), any());
        verify(notificationService).createNotification(
                eq(hrManagerUserId), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(employee.getId()), any(), any(), any());
    }

    @Test
    void onEmployeeDepartmentChangedNotifiesEmployeeAndBothManagers() {
        UUID previousManagerId = UUID.randomUUID();
        UUID newManagerId = UUID.randomUUID();
        Employee employee = employee(null, EMPLOYEE_USER_ID);
        when(employeeRepository.findByIdAndTenantId(previousManagerId, TENANT_ID))
                .thenReturn(Optional.of(managerEmployee()));
        UUID newManagerUserId = UUID.randomUUID();
        when(employeeRepository.findByIdAndTenantId(newManagerId, TENANT_ID))
                .thenReturn(Optional.of(Employee.builder()
                        .id(UUID.randomUUID())
                        .tenantId(TENANT_ID)
                        .employeeCode("MGR2")
                        .firstName("New")
                        .lastName("Manager")
                        .user(User.builder().id(newManagerUserId).email("mgr2@nulogic.io").build())
                        .build()));

        listener.onEmployeeDepartmentChanged(EmployeeDepartmentChangedEvent.of(this, employee,
                UUID.randomUUID(), UUID.randomUUID(), previousManagerId, newManagerId));

        ArgumentCaptor<UUID> recipientCaptor = ArgumentCaptor.forClass(UUID.class);
        verify(notificationService, org.mockito.Mockito.times(3)).createNotification(
                recipientCaptor.capture(), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(employee.getId()), any(), any(), any());
        assertThat(recipientCaptor.getAllValues())
                .containsExactlyInAnyOrder(EMPLOYEE_USER_ID, MANAGER_USER_ID, newManagerUserId);
    }

    @Test
    void onEmployeeTerminatedNotifiesManagerHrAdminAndAssetManager() {
        UUID managerId = UUID.randomUUID();
        Employee employee = employee(managerId, null);
        when(employeeRepository.findByIdAndTenantId(managerId, TENANT_ID))
                .thenReturn(Optional.of(managerEmployee()));
        UUID hrAdminUserId = UUID.randomUUID();
        UUID assetManagerUserId = UUID.randomUUID();
        when(userRepository.findUserIdsByRoleCode(TENANT_ID, RoleHierarchy.HR_ADMIN))
                .thenReturn(List.of(hrAdminUserId));
        when(userRepository.findUserIdsByRoleCode(TENANT_ID, RoleHierarchy.ASSET_MANAGER))
                .thenReturn(List.of(assetManagerUserId));

        listener.onEmployeeTerminated(EmployeeTerminatedEvent.of(this, employee, "Resignation"));

        ArgumentCaptor<UUID> recipientCaptor = ArgumentCaptor.forClass(UUID.class);
        verify(notificationService, org.mockito.Mockito.times(3)).createNotification(
                recipientCaptor.capture(), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(employee.getId()), any(), any(), eq(Notification.Priority.HIGH));
        assertThat(recipientCaptor.getAllValues())
                .containsExactlyInAnyOrder(MANAGER_USER_ID, hrAdminUserId, assetManagerUserId);
    }

    @Test
    void onPerformanceReviewCompletedNotifiesEmployee() {
        UUID employeeId = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();
        when(employeeRepository.findByIdAndTenantId(employeeId, TENANT_ID))
                .thenReturn(Optional.of(Employee.builder()
                        .id(employeeId)
                        .tenantId(TENANT_ID)
                        .employeeCode("EMP1")
                        .firstName("Jane")
                        .user(User.builder().id(EMPLOYEE_USER_ID).email("jane@nulogic.io").build())
                        .build()));

        listener.onPerformanceReviewCompleted(PerformanceReviewCompletedEvent.of(this, TENANT_ID, employeeId,
                reviewId, UUID.randomUUID(), BigDecimal.valueOf(4.5), "Reviewer", LocalDateTime.now()));

        verify(notificationService).createNotification(
                eq(EMPLOYEE_USER_ID), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(reviewId), eq("PerformanceReview"), any(), eq(Notification.Priority.NORMAL));
    }

    @Test
    void onTrainingCompletedNotifiesEmployee() {
        UUID employeeId = UUID.randomUUID();
        UUID programId = UUID.randomUUID();
        when(employeeRepository.findByIdAndTenantId(employeeId, TENANT_ID))
                .thenReturn(Optional.of(Employee.builder()
                        .id(employeeId)
                        .tenantId(TENANT_ID)
                        .employeeCode("EMP1")
                        .firstName("Jane")
                        .user(User.builder().id(EMPLOYEE_USER_ID).email("jane@nulogic.io").build())
                        .build()));

        listener.onTrainingCompleted(TrainingCompletedEvent.of(this, TENANT_ID, UUID.randomUUID(),
                employeeId, programId, "Onboarding 101", LocalDateTime.now()));

        verify(notificationService).createNotification(
                eq(EMPLOYEE_USER_ID), eq(Notification.NotificationType.GENERAL),
                any(), any(), eq(programId), eq("TrainingProgram"), any(), eq(Notification.Priority.NORMAL));
    }

    private Employee employee(UUID managerId, UUID userId) {
        return Employee.builder()
                .id(UUID.randomUUID())
                .tenantId(TENANT_ID)
                .employeeCode("EMP1")
                .firstName("Jane")
                .lastName("Doe")
                .managerId(managerId)
                .user(userId != null ? User.builder().id(userId).email("jane@nulogic.io").build() : null)
                .build();
    }

    private Employee managerEmployee() {
        return Employee.builder()
                .id(UUID.randomUUID())
                .tenantId(TENANT_ID)
                .employeeCode("MGR1")
                .firstName("Man")
                .lastName("Ager")
                .user(User.builder().id(MANAGER_USER_ID).email("manager@nulogic.io").build())
                .build();
    }
}
