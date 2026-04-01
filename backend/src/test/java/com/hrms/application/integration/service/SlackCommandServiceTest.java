package com.hrms.application.integration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationChannelConfig;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.notification.repository.NotificationChannelConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SlackCommandServiceTest {

    @Mock private EmployeeRepository employeeRepository;
    @Mock private LeaveBalanceRepository leaveBalanceRepository;
    @Mock private LeaveTypeRepository leaveTypeRepository;
    @Mock private NotificationChannelConfigRepository channelConfigRepository;

    @InjectMocks
    private SlackCommandService slackCommandService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final String TEAM_ID = "T12345";
    private static final String SLACK_USER_ID = "U12345";

    private NotificationChannelConfig slackConfig;
    private Employee employee;

    @BeforeEach
    void setUp() {
        // Need to inject ObjectMapper manually since @InjectMocks won't construct it
        try {
            var field = SlackCommandService.class.getDeclaredField("objectMapper");
            field.setAccessible(true);
            field.set(slackCommandService, new ObjectMapper());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        slackConfig = NotificationChannelConfig.builder()
                .channel(NotificationChannel.SLACK)
                .slackWorkspaceId(TEAM_ID)
                .tenantId(TENANT_ID)
                .build();

        employee = Employee.builder()
                .id(EMPLOYEE_ID)
                .tenantId(TENANT_ID)
                .build();
    }

    @Test
    @DisplayName("handleBalanceCommand returns leave balances for mapped employee")
    void handleBalanceCommand_returnsBalances() {
        when(channelConfigRepository.findAll()).thenReturn(List.of(slackConfig));
        when(employeeRepository.findByTenantId(TENANT_ID)).thenReturn(List.of(employee));

        LeaveType casualLeave = LeaveType.builder().leaveName("Casual Leave").build();
        casualLeave.setId(UUID.randomUUID());

        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(EMPLOYEE_ID)
                .leaveTypeId(casualLeave.getId())
                .available(new BigDecimal("10.0"))
                .used(new BigDecimal("5.0"))
                .accrued(new BigDecimal("15.0"))
                .tenantId(TENANT_ID)
                .build();

        when(leaveBalanceRepository.findByEmployeeIdAndYear(eq(EMPLOYEE_ID), anyInt(), eq(TENANT_ID)))
                .thenReturn(List.of(balance));
        when(leaveTypeRepository.findById(casualLeave.getId())).thenReturn(Optional.of(casualLeave));

        String result = slackCommandService.handleBalanceCommand(SLACK_USER_ID, TEAM_ID);

        assertThat(result).contains("Leave Balances");
        assertThat(result).contains("Casual Leave");
        assertThat(result).contains("10.0");
    }

    @Test
    @DisplayName("handleBalanceCommand returns error when workspace not connected")
    void handleBalanceCommand_unknownWorkspace() {
        when(channelConfigRepository.findAll()).thenReturn(List.of());

        String result = slackCommandService.handleBalanceCommand(SLACK_USER_ID, "UNKNOWN_TEAM");

        assertThat(result).contains("not connected");
    }

    @Test
    @DisplayName("handleBalanceCommand returns error when employee not found")
    void handleBalanceCommand_employeeNotFound() {
        when(channelConfigRepository.findAll()).thenReturn(List.of(slackConfig));
        when(employeeRepository.findByTenantId(TENANT_ID)).thenReturn(List.of());

        String result = slackCommandService.handleBalanceCommand(SLACK_USER_ID, TEAM_ID);

        assertThat(result).contains("Could not find");
    }

    @Test
    @DisplayName("handleLeaveCommand with empty text shows usage")
    void handleLeaveCommand_emptyText_showsUsage() {
        when(channelConfigRepository.findAll()).thenReturn(List.of(slackConfig));
        when(employeeRepository.findByTenantId(TENANT_ID)).thenReturn(List.of(employee));

        String result = slackCommandService.handleLeaveCommand("", SLACK_USER_ID, TEAM_ID);

        assertThat(result).contains("Usage");
        assertThat(result).contains("/leave");
    }

    @Test
    @DisplayName("handleLeaveCommand with valid input returns confirmation")
    void handleLeaveCommand_validInput_returnsConfirmation() {
        when(channelConfigRepository.findAll()).thenReturn(List.of(slackConfig));
        when(employeeRepository.findByTenantId(TENANT_ID)).thenReturn(List.of(employee));

        String result = slackCommandService.handleLeaveCommand("2 casual family event", SLACK_USER_ID, TEAM_ID);

        assertThat(result).contains("Confirm Leave Request");
        assertThat(result).contains("casual");
        assertThat(result).contains("2");
    }

    @Test
    @DisplayName("handleLeaveCommand with invalid days returns error")
    void handleLeaveCommand_invalidDays_returnsError() {
        when(channelConfigRepository.findAll()).thenReturn(List.of(slackConfig));
        when(employeeRepository.findByTenantId(TENANT_ID)).thenReturn(List.of(employee));

        String result = slackCommandService.handleLeaveCommand("abc casual", SLACK_USER_ID, TEAM_ID);

        assertThat(result).contains("Invalid number");
    }

    @Test
    @DisplayName("handleLeaveCommand with excessive days returns error")
    void handleLeaveCommand_excessiveDays_returnsError() {
        when(channelConfigRepository.findAll()).thenReturn(List.of(slackConfig));
        when(employeeRepository.findByTenantId(TENANT_ID)).thenReturn(List.of(employee));

        String result = slackCommandService.handleLeaveCommand("50 casual", SLACK_USER_ID, TEAM_ID);

        assertThat(result).contains("between 1 and 30");
    }

    @Test
    @DisplayName("handleUrlVerification returns challenge")
    void handleUrlVerification_returnsChallenge() {
        String body = "{\"type\":\"url_verification\",\"challenge\":\"test_challenge_123\"}";

        var result = slackCommandService.handleUrlVerification(body);

        assertThat(result.getBody()).contains("test_challenge_123");
    }
}
