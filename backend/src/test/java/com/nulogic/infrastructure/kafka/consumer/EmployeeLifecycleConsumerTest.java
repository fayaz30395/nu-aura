package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.application.integration.service.IntegrationEventRouter;
import com.nulogic.application.leave.service.LeaveBalanceService;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.application.user.service.ImplicitRoleEngine;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.integration.IntegrationEvent;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.events.EmployeeLifecycleEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link EmployeeLifecycleConsumer#process(EmployeeLifecycleEvent)}.
 *
 * <p>Branches covered:
 * <ul>
 *   <li>idempotency duplicate skip</li>
 *   <li>eventType switch: HIRED, ONBOARDED, PROMOTED, TRANSFERRED, OFFBOARDED, unknown</li>
 *   <li>implicit-role recompute fan-out (employee + old/new managers on TRANSFER/OFFBOARD)</li>
 *   <li>ONBOARDED welcome-email path (user present / absent) and best-effort leave accrual</li>
 *   <li>integration routing best-effort swallow</li>
 *   <li>recompute helper swallows its own failures; OFFBOARDED invalid managerId swallowed</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class EmployeeLifecycleConsumerTest {

    @Mock
    private IdempotencyService idempotencyService;
    @Mock
    private LeaveBalanceService leaveBalanceService;
    @Mock
    private ImplicitRoleEngine implicitRoleEngine;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private IntegrationEventRouter integrationEventRouter;
    @Mock
    private EmailNotificationService emailNotificationService;

    @InjectMocks
    private EmployeeLifecycleConsumer consumer;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private EmployeeLifecycleEvent event(String type, UUID employeeId, UUID managerId, Map<String, Object> metadata) {
        EmployeeLifecycleEvent e = new EmployeeLifecycleEvent();
        e.setEventId(UUID.randomUUID().toString());
        e.setTenantId(UUID.randomUUID());
        e.setEmployeeId(employeeId);
        e.setEventTypeEnum(type);
        e.setName("Jane Doe");
        e.setDepartmentId(UUID.randomUUID());
        e.setManagerId(managerId);
        e.setMetadata(metadata);
        return e;
    }

    /** Build an Employee whose linked User has the given id; used for recompute fan-out. */
    private Employee employeeWithUser(UUID userId) {
        User user = mock(User.class);
        lenient().when(user.getId()).thenReturn(userId);
        Employee employee = mock(Employee.class);
        lenient().when(employee.getUser()).thenReturn(user);
        return employee;
    }

    // ---------- idempotency / unknown ----------

    @Test
    @DisplayName("process skips when event already processed")
    void process_duplicate_skips() {
        EmployeeLifecycleEvent e = event("HIRED", UUID.randomUUID(), null, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(false);

        consumer.process(e);

        verifyNoInteractions(employeeRepository, implicitRoleEngine, integrationEventRouter,
                leaveBalanceService, emailNotificationService);
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("unknown event type throws IllegalArgumentException and releases claim")
    void process_unknownType_throwsAndReleases() {
        EmployeeLifecycleEvent e = event("RETIRED", UUID.randomUUID(), null, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        assertThatThrownBy(() -> consumer.process(e))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown event type");

        verify(idempotencyService).release(e.getEventId());
    }

    @Test
    @DisplayName("lowercase event type is upper-cased before dispatch")
    void process_lowercaseType_dispatches() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("hired", employeeId, null, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(integrationEventRouter).routeToConnectors(any());
    }

    // ---------- HIRED ----------

    @Test
    @DisplayName("HIRED routes integration event and recomputes implicit roles")
    void hired_routesAndRecomputes() {
        UUID employeeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("HIRED", employeeId, null, null);
        Employee employee = employeeWithUser(userId);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.of(employee));

        consumer.process(e);

        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("EMPLOYEE_HIRED");
        verify(implicitRoleEngine).recompute(userId, employeeId, e.getTenantId());
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("HIRED with no user on employee skips recompute but still routes")
    void hired_noUser_skipsRecompute() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("HIRED", employeeId, null, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        Employee noUser = mock(Employee.class);
        when(noUser.getUser()).thenReturn(null);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.of(noUser));

        consumer.process(e);

        verify(implicitRoleEngine, never()).recompute(any(), any(), any());
        verify(integrationEventRouter).routeToConnectors(any());
    }

    // ---------- ONBOARDED ----------

    @Test
    @DisplayName("ONBOARDED accrues default leave, sends welcome email, routes event")
    void onboarded_accruesAndWelcomesAndRoutes() {
        UUID employeeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("startDate", "2026-07-01");
        EmployeeLifecycleEvent e = event("ONBOARDED", employeeId, null, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        User user = mock(User.class);
        when(user.getEmail()).thenReturn("jane@corp.io");
        Employee emp = mock(Employee.class);
        when(emp.getUser()).thenReturn(user);
        when(emp.getFirstName()).thenReturn("Jane");
        when(emp.getLastName()).thenReturn("Doe");
        when(employeeRepository.findByIdWithUser(employeeId, e.getTenantId()))
                .thenReturn(Optional.of(emp));

        consumer.process(e);

        verify(leaveBalanceService).accrueLeave(eq(employeeId),
                eq(UUID.fromString("00000000-0000-0000-0000-000000000001")), eq(new BigDecimal(20)));
        verify(emailNotificationService).sendWelcomeEmail("jane@corp.io", "Jane Doe", "Welcome@123");
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("EMPLOYEE_ONBOARDED");
    }

    @Test
    @DisplayName("ONBOARDED with no linked user skips welcome email but still routes")
    void onboarded_noUser_skipsEmail() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("ONBOARDED", employeeId, null, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdWithUser(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(emailNotificationService, never()).sendWelcomeEmail(any(), any(), any());
        verify(integrationEventRouter).routeToConnectors(any());
    }

    @Test
    @DisplayName("ONBOARDED leave-accrual failure is swallowed; processing continues")
    void onboarded_accrualFailure_swallowed() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("ONBOARDED", employeeId, null, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(leaveBalanceService.accrueLeave(any(), any(), any()))
                .thenThrow(new RuntimeException("no leave config"));
        when(employeeRepository.findByIdWithUser(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(integrationEventRouter).routeToConnectors(any());
        verify(idempotencyService, never()).release(any());
    }

    // ---------- PROMOTED ----------

    @Test
    @DisplayName("PROMOTED with salary increase routes event and recomputes roles")
    void promoted_withRaise_routesAndRecomputes() {
        UUID employeeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("oldJobTitle", "Engineer");
        md.put("newJobTitle", "Senior Engineer");
        md.put("salaryIncrease", 5000.0);
        EmployeeLifecycleEvent e = event("PROMOTED", employeeId, null, md);
        Employee employee = employeeWithUser(userId);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.of(employee));

        consumer.process(e);

        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("EMPLOYEE_PROMOTED");
        verify(implicitRoleEngine).recompute(userId, employeeId, e.getTenantId());
    }

    @Test
    @DisplayName("PROMOTED with null metadata routes and recomputes (no raise branch)")
    void promoted_nullMetadata_routes() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("PROMOTED", employeeId, null, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(integrationEventRouter).routeToConnectors(any());
    }

    // ---------- TRANSFERRED ----------

    @Test
    @DisplayName("TRANSFERRED recomputes for employee, old manager, and new manager")
    void transferred_recomputesForAllThree() {
        UUID employeeId = UUID.randomUUID();
        UUID newManagerId = UUID.randomUUID();
        UUID oldManagerId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("oldDepartment", "Sales");
        md.put("newDepartment", "Marketing");
        md.put("oldReportingManager", oldManagerId);
        EmployeeLifecycleEvent e = event("TRANSFERRED", employeeId, newManagerId, md);
        Employee transferredEmployee = employeeWithUser(UUID.randomUUID());
        Employee oldManager = employeeWithUser(UUID.randomUUID());
        Employee newManager = employeeWithUser(UUID.randomUUID());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.of(transferredEmployee));
        when(employeeRepository.findByIdAndTenantId(oldManagerId, e.getTenantId()))
                .thenReturn(Optional.of(oldManager));
        when(employeeRepository.findByIdAndTenantId(newManagerId, e.getTenantId()))
                .thenReturn(Optional.of(newManager));

        consumer.process(e);

        verify(employeeRepository).findByIdAndTenantId(employeeId, e.getTenantId());
        verify(employeeRepository).findByIdAndTenantId(oldManagerId, e.getTenantId());
        verify(employeeRepository).findByIdAndTenantId(newManagerId, e.getTenantId());
        verify(implicitRoleEngine, times(3)).recompute(any(), any(), eq(e.getTenantId()));
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("EMPLOYEE_TRANSFERRED");
    }

    @Test
    @DisplayName("TRANSFERRED with no managers only recomputes for the employee")
    void transferred_noManagers_recomputesEmployeeOnly() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("TRANSFERRED", employeeId, null, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(employeeRepository, times(1)).findByIdAndTenantId(any(), any());
        verify(integrationEventRouter).routeToConnectors(any());
    }

    // ---------- OFFBOARDED ----------

    @Test
    @DisplayName("OFFBOARDED recomputes for employee and a UUID managerId in metadata")
    void offboarded_recomputesEmployeeAndManager() {
        UUID employeeId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("reason", "resignation");
        md.put("lastWorkingDay", "2026-08-01");
        md.put("managerId", managerId);
        EmployeeLifecycleEvent e = event("OFFBOARDED", employeeId, null, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());
        when(employeeRepository.findByIdAndTenantId(managerId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(employeeRepository).findByIdAndTenantId(employeeId, e.getTenantId());
        verify(employeeRepository).findByIdAndTenantId(managerId, e.getTenantId());
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("EMPLOYEE_OFFBOARDED");
    }

    @Test
    @DisplayName("OFFBOARDED accepts a String managerId in metadata and parses it")
    void offboarded_stringManagerId_parsed() {
        UUID employeeId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("managerId", managerId.toString());
        EmployeeLifecycleEvent e = event("OFFBOARDED", employeeId, null, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());
        when(employeeRepository.findByIdAndTenantId(managerId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(employeeRepository).findByIdAndTenantId(managerId, e.getTenantId());
    }

    @Test
    @DisplayName("OFFBOARDED with an invalid String managerId swallows the parse error")
    void offboarded_invalidManagerId_swallowed() {
        UUID employeeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("managerId", "not-a-uuid");
        EmployeeLifecycleEvent e = event("OFFBOARDED", employeeId, null, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        // Only the employee lookup happened; the bad managerId never reaches the repo.
        verify(employeeRepository, times(1)).findByIdAndTenantId(any(), any());
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("OFFBOARDED with no managerId in metadata recomputes employee only")
    void offboarded_noManager_employeeOnly() {
        UUID employeeId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("OFFBOARDED", employeeId, null, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.empty());

        consumer.process(e);

        verify(employeeRepository, times(1)).findByIdAndTenantId(any(), any());
        verify(integrationEventRouter).routeToConnectors(any());
    }

    // ---------- recompute helper resilience ----------

    @Test
    @DisplayName("implicit-role recompute failure is swallowed and does not fail processing")
    void recomputeFailure_swallowed() {
        UUID employeeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        EmployeeLifecycleEvent e = event("HIRED", employeeId, null, null);
        Employee employee = employeeWithUser(userId);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(employeeRepository.findByIdAndTenantId(employeeId, e.getTenantId()))
                .thenReturn(Optional.of(employee));
        when(implicitRoleEngine.recompute(userId, employeeId, e.getTenantId()))
                .thenThrow(new RuntimeException("role engine down"));

        consumer.process(e);

        verify(idempotencyService, never()).release(any());
    }
}
