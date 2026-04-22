package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.DashboardAnalyticsResponse;
import com.hrms.api.analytics.dto.DashboardContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DashboardAnalyticsService Tests")
class DashboardAnalyticsServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRecordRepository attendanceRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private PayrollRunRepository payrollRunRepository;

    @Mock
    private PayslipRepository payslipRepository;

    @Mock
    private HolidayRepository holidayRepository;

    @InjectMocks
    private DashboardAnalyticsService dashboardAnalyticsService;

    private UUID tenantId;
    private UUID userId;
    private UUID employeeId;
    private UUID managerId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        managerId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Admin Dashboard Tests")
    class AdminDashboardTests {

        @Test
        @DisplayName("Should get admin dashboard analytics successfully")
        void shouldGetAdminDashboardAnalyticsSuccessfully() {
            DashboardContext context = DashboardContext.builder()
                    .tenantId(tenantId)
                    .userId(userId)
                    .employeeId(employeeId)
                    .viewType(DashboardContext.ViewType.ADMIN)
                    .targetEmployeeIds(null)
                    .build();

            LocalDate.now();

            // Mock employee count
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(100L);

            // Mock attendance data
            when(attendanceRepository.countByTenantIdAndDate(eq(tenantId), any(LocalDate.class)))
                    .thenReturn(85L);
            when(attendanceRepository.countByTenantIdAndDateAndOnTime(eq(tenantId), any(LocalDate.class)))
                    .thenReturn(80L);

            // Mock leave data
            when(leaveRequestRepository.countByTenantIdAndDateAndStatus(eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED)))
                    .thenReturn(10L);
            when(leaveRequestRepository.countByTenantIdAndStatus(eq(tenantId), any()))
                    .thenReturn(5L);
            when(leaveRequestRepository.countByTenantIdAndDateRange(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(20L);
            when(leaveRequestRepository.findLeaveTypeDistribution(tenantId))
                    .thenReturn(new ArrayList<>());

            // Mock payroll data
            when(payslipRepository.countByTenantIdAndYearAndMonth(eq(tenantId), anyInt(), anyInt()))
                    .thenReturn(95L);
            when(payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(eq(tenantId), anyInt(), anyInt()))
                    .thenReturn(new BigDecimal("5000000"));

            // Mock headcount data
            when(employeeRepository.countByTenantIdAndJoiningDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(5L);
            when(employeeRepository.countByTenantIdAndStatusAndExitDateBetween(eq(tenantId), eq(Employee.EmployeeStatus.TERMINATED), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(2L);
            when(employeeRepository.countByTenantIdAndStatusAndJoiningDateBefore(eq(tenantId), any(), any(LocalDate.class)))
                    .thenReturn(100L);
            when(employeeRepository.findDepartmentDistribution(tenantId))
                    .thenReturn(new ArrayList<>());

            // Mock upcoming events
            when(employeeRepository.findUpcomingBirthdaysWithDepartment(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());
            when(employeeRepository.findUpcomingAnniversariesWithDepartment(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());

            DashboardAnalyticsResponse result = dashboardAnalyticsService.getDashboardAnalytics(context);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo("ADMIN");
            assertThat(result.getViewLabel()).isEqualTo("Organization View");
            assertThat(result.getTeamSize()).isEqualTo(100L);
            assertThat(result.getAttendance()).isNotNull();
            assertThat(result.getLeave()).isNotNull();
            assertThat(result.getPayroll()).isNotNull(); // Admin should see payroll
            assertThat(result.getHeadcount()).isNotNull();
        }

        @Test
        @DisplayName("Should get dashboard analytics with legacy method")
        void shouldGetDashboardAnalyticsWithLegacyMethod() {
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(50L);
            when(attendanceRepository.countByTenantIdAndDate(eq(tenantId), any(LocalDate.class)))
                    .thenReturn(40L);
            when(attendanceRepository.countByTenantIdAndDateAndOnTime(eq(tenantId), any(LocalDate.class)))
                    .thenReturn(35L);
            when(leaveRequestRepository.countByTenantIdAndDateAndStatus(eq(tenantId), any(LocalDate.class), any()))
                    .thenReturn(5L);
            when(leaveRequestRepository.countByTenantIdAndStatus(eq(tenantId), any()))
                    .thenReturn(3L);
            when(leaveRequestRepository.countByTenantIdAndDateRange(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(10L);
            when(leaveRequestRepository.findLeaveTypeDistribution(tenantId))
                    .thenReturn(new ArrayList<>());
            when(payslipRepository.countByTenantIdAndYearAndMonth(eq(tenantId), anyInt(), anyInt()))
                    .thenReturn(45L);
            when(payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(eq(tenantId), anyInt(), anyInt()))
                    .thenReturn(new BigDecimal("2500000"));
            when(employeeRepository.countByTenantIdAndJoiningDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(3L);
            when(employeeRepository.countByTenantIdAndStatusAndExitDateBetween(eq(tenantId), any(), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(1L);
            when(employeeRepository.countByTenantIdAndStatusAndJoiningDateBefore(eq(tenantId), any(), any(LocalDate.class)))
                    .thenReturn(50L);
            when(employeeRepository.findDepartmentDistribution(tenantId))
                    .thenReturn(new ArrayList<>());
            when(employeeRepository.findUpcomingBirthdaysWithDepartment(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());
            when(employeeRepository.findUpcomingAnniversariesWithDepartment(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());

            DashboardAnalyticsResponse result = dashboardAnalyticsService.getDashboardAnalytics(tenantId);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo("ADMIN");
        }
    }

    @Nested
    @DisplayName("Manager Dashboard Tests")
    class ManagerDashboardTests {

        @Test
        @DisplayName("Should get manager dashboard analytics successfully")
        void shouldGetManagerDashboardAnalyticsSuccessfully() {
            List<UUID> teamMemberIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

            DashboardContext context = DashboardContext.builder()
                    .tenantId(tenantId)
                    .userId(userId)
                    .employeeId(managerId)
                    .viewType(DashboardContext.ViewType.MANAGER)
                    .targetEmployeeIds(teamMemberIds)
                    .build();

            // Mock team attendance data
            when(attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(eq(tenantId), any(LocalDate.class), eq(teamMemberIds)))
                    .thenReturn(2L);
            when(attendanceRepository.countByTenantIdAndDateAndOnTimeAndEmployeeIdIn(eq(tenantId), any(LocalDate.class), eq(teamMemberIds)))
                    .thenReturn(2L);

            // Mock team leave data
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeIdIn(eq(tenantId), any(LocalDate.class), any(), eq(teamMemberIds)))
                    .thenReturn(1L);
            when(leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(eq(tenantId), any(), eq(teamMemberIds)))
                    .thenReturn(1L);

            // Mock team headcount
            when(employeeRepository.countByTenantIdAndIdIn(tenantId, teamMemberIds))
                    .thenReturn(3L);
            when(employeeRepository.countByTenantIdAndIdInAndJoiningDateBetween(eq(tenantId), eq(teamMemberIds), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(0L);
            when(employeeRepository.findDepartmentDistributionForEmployees(tenantId, teamMemberIds))
                    .thenReturn(new ArrayList<>());

            // Mock upcoming events for team
            when(employeeRepository.findUpcomingBirthdaysWithDepartment(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());
            when(employeeRepository.findUpcomingAnniversariesWithDepartment(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());

            DashboardAnalyticsResponse result = dashboardAnalyticsService.getDashboardAnalytics(context);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo("MANAGER");
            assertThat(result.getViewLabel()).isEqualTo("Team View");
            assertThat(result.getTeamSize()).isEqualTo(3L);
            assertThat(result.getPayroll()).isNull(); // Manager should NOT see payroll
        }
    }

    @Nested
    @DisplayName("Employee Dashboard Tests")
    class EmployeeDashboardTests {

        @Test
        @DisplayName("Should get employee dashboard analytics successfully")
        void shouldGetEmployeeDashboardAnalyticsSuccessfully() {
            DashboardContext context = DashboardContext.builder()
                    .tenantId(tenantId)
                    .userId(userId)
                    .employeeId(employeeId)
                    .viewType(DashboardContext.ViewType.EMPLOYEE)
                    .targetEmployeeIds(List.of(employeeId))
                    .build();

            // Mock personal attendance data
            when(attendanceRepository.countByTenantIdAndDateAndEmployeeId(eq(tenantId), any(LocalDate.class), eq(employeeId)))
                    .thenReturn(1L);

            // Mock personal leave data
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(eq(tenantId), any(LocalDate.class), any(), eq(employeeId)))
                    .thenReturn(0L);
            when(leaveRequestRepository.countByTenantIdAndStatusAndEmployeeId(eq(tenantId), any(), eq(employeeId)))
                    .thenReturn(2L);

            // Mock holidays (everyone can see)
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(new ArrayList<>());

            DashboardAnalyticsResponse result = dashboardAnalyticsService.getDashboardAnalytics(context);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo("EMPLOYEE");
            assertThat(result.getViewLabel()).isEqualTo("Personal View");
            assertThat(result.getTeamSize()).isEqualTo(1L);
            assertThat(result.getPayroll()).isNull(); // Employee should NOT see payroll
        }
    }

    @Nested
    @DisplayName("Build Context Tests")
    class BuildContextTests {

        @Test
        @DisplayName("Should build admin context")
        void shouldBuildAdminContext() {
            DashboardContext result = dashboardAnalyticsService.buildContext(
                    tenantId, userId, employeeId, true, false);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo(DashboardContext.ViewType.ADMIN);
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getUserId()).isEqualTo(userId);
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
            assertThat(result.getTargetEmployeeIds()).isNull();
        }

        @Test
        @DisplayName("Should build manager context with reportees")
        void shouldBuildManagerContextWithReportees() {
            List<UUID> reportees = List.of(UUID.randomUUID(), UUID.randomUUID());
            when(employeeRepository.findEmployeeIdsByManagerIds(eq(tenantId), any()))
                    .thenReturn(reportees)
                    .thenReturn(new ArrayList<>()); // Second level is empty

            DashboardContext result = dashboardAnalyticsService.buildContext(
                    tenantId, userId, managerId, false, true);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo(DashboardContext.ViewType.MANAGER);
            assertThat(result.getTargetEmployeeIds()).isNotNull();
            assertThat(result.getTargetEmployeeIds()).contains(managerId); // Manager included
        }

        @Test
        @DisplayName("Should build employee context")
        void shouldBuildEmployeeContext() {
            DashboardContext result = dashboardAnalyticsService.buildContext(
                    tenantId, userId, employeeId, false, false);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo(DashboardContext.ViewType.EMPLOYEE);
            assertThat(result.getTargetEmployeeIds()).containsExactly(employeeId);
        }

        @Test
        @DisplayName("Should build employee context with null employee ID")
        void shouldBuildEmployeeContextWithNullEmployeeId() {
            DashboardContext result = dashboardAnalyticsService.buildContext(
                    tenantId, userId, null, false, false);

            assertThat(result).isNotNull();
            assertThat(result.getViewType()).isEqualTo(DashboardContext.ViewType.EMPLOYEE);
            assertThat(result.getTargetEmployeeIds()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Context Helper Methods Tests")
    class ContextHelperMethodsTests {

        @Test
        @DisplayName("Should correctly identify admin context")
        void shouldCorrectlyIdentifyAdminContext() {
            DashboardContext adminContext = DashboardContext.builder()
                    .viewType(DashboardContext.ViewType.ADMIN)
                    .build();

            assertThat(adminContext.isAdmin()).isTrue();
            assertThat(adminContext.isManager()).isFalse();
            assertThat(adminContext.isEmployee()).isFalse();
        }

        @Test
        @DisplayName("Should correctly identify manager context")
        void shouldCorrectlyIdentifyManagerContext() {
            DashboardContext managerContext = DashboardContext.builder()
                    .viewType(DashboardContext.ViewType.MANAGER)
                    .build();

            assertThat(managerContext.isAdmin()).isFalse();
            assertThat(managerContext.isManager()).isTrue();
            assertThat(managerContext.isEmployee()).isFalse();
        }

        @Test
        @DisplayName("Should correctly identify employee context")
        void shouldCorrectlyIdentifyEmployeeContext() {
            DashboardContext employeeContext = DashboardContext.builder()
                    .viewType(DashboardContext.ViewType.EMPLOYEE)
                    .build();

            assertThat(employeeContext.isAdmin()).isFalse();
            assertThat(employeeContext.isManager()).isFalse();
            assertThat(employeeContext.isEmployee()).isTrue();
        }
    }
}
