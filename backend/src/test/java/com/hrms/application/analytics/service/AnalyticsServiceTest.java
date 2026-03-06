package com.hrms.application.analytics.service;

import com.hrms.application.analytics.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnalyticsService Tests")
class AnalyticsServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private PayslipRepository payslipRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        when(leaveRequestRepository.countByTenantIdAndDateAndStatus(any(UUID.class), any(LocalDate.class),
                eq(LeaveRequest.LeaveRequestStatus.APPROVED))).thenReturn(0L);
        when(leaveRequestRepository.countByTenantIdAndStatus(any(UUID.class), any(LeaveRequest.LeaveRequestStatus.class)))
                .thenReturn(0L);
        when(leaveRequestRepository.findLeaveTypeDistribution(any(UUID.class))).thenReturn(new ArrayList<>());
        when(attendanceRecordRepository.countByTenantIdAndDate(any(UUID.class), any(LocalDate.class))).thenReturn(0L);
        when(attendanceRecordRepository.countByTenantIdAndDateAndOnTime(any(UUID.class), any(LocalDate.class)))
                .thenReturn(0L);
        when(payslipRepository.countByTenantIdAndYearAndMonth(any(UUID.class), anyInt(), anyInt())).thenReturn(0L);
        when(payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(any(UUID.class), anyInt(), anyInt()))
                .thenReturn(java.math.BigDecimal.ZERO);
    }

    @Nested
    @DisplayName("Dashboard Metrics Tests")
    class DashboardMetricsTests {

        @Test
        @DisplayName("Should get dashboard metrics successfully")
        void shouldGetDashboardMetricsSuccessfully() {
            // Setup mock data
            when(employeeRepository.countByTenantId(tenantId)).thenReturn(100L);
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(95L);

            List<Object[]> deptDistribution = new ArrayList<>();
            deptDistribution.add(new Object[]{"Engineering", 50L});
            deptDistribution.add(new Object[]{"HR", 20L});
            deptDistribution.add(new Object[]{"Sales", 30L});
            when(employeeRepository.getEmployeeCountByDepartment(tenantId)).thenReturn(deptDistribution);

            when(employeeRepository.countTerminatedAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(5L);
            when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(10L);

            DashboardMetrics result = analyticsService.getDashboardMetrics();

            assertThat(result).isNotNull();
            assertThat(result.getEmployeeMetrics()).isNotNull();
            assertThat(result.getAttendanceMetrics()).isNotNull();
            assertThat(result.getLeaveMetrics()).isNotNull();
            assertThat(result.getPayrollMetrics()).isNotNull();
            assertThat(result.getGeneratedAt()).isEqualTo(LocalDate.now());
        }
    }

    @Nested
    @DisplayName("Employee Metrics Tests")
    class EmployeeMetricsTests {

        @Test
        @DisplayName("Should get employee metrics successfully")
        void shouldGetEmployeeMetricsSuccessfully() {
            when(employeeRepository.countByTenantId(tenantId)).thenReturn(100L);
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(95L);

            List<Object[]> deptDistribution = new ArrayList<>();
            deptDistribution.add(new Object[]{"Engineering", 50L});
            deptDistribution.add(new Object[]{"HR", 20L});
            deptDistribution.add(new Object[]{null, 5L}); // Unassigned department
            when(employeeRepository.getEmployeeCountByDepartment(tenantId)).thenReturn(deptDistribution);

            when(employeeRepository.countTerminatedAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(5L);
            when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(10L);

            EmployeeMetrics result = analyticsService.getEmployeeMetrics(tenantId);

            assertThat(result).isNotNull();
            assertThat(result.getTotalEmployees()).isEqualTo(100L);
            assertThat(result.getActiveEmployees()).isEqualTo(95L);
            assertThat(result.getDepartmentDistribution()).isNotEmpty();
            assertThat(result.getDepartmentDistribution()).containsKey("Engineering");
            assertThat(result.getDepartmentDistribution()).containsKey("Unassigned");
            assertThat(result.getNewHiresThisMonth()).isEqualTo(10L);
            assertThat(result.getAttritionRate()).isGreaterThanOrEqualTo(0.0);
        }

        @Test
        @DisplayName("Should handle zero employees")
        void shouldHandleZeroEmployees() {
            when(employeeRepository.countByTenantId(tenantId)).thenReturn(0L);
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(0L);
            when(employeeRepository.getEmployeeCountByDepartment(tenantId)).thenReturn(new ArrayList<>());
            when(employeeRepository.countTerminatedAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(0L);
            when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(0L);

            EmployeeMetrics result = analyticsService.getEmployeeMetrics(tenantId);

            assertThat(result).isNotNull();
            assertThat(result.getTotalEmployees()).isEqualTo(0L);
            assertThat(result.getActiveEmployees()).isEqualTo(0L);
            assertThat(result.getAttritionRate()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("Attendance Metrics Tests")
    class AttendanceMetricsTests {

        @Test
        @DisplayName("Should get attendance metrics successfully")
        void shouldGetAttendanceMetricsSuccessfully() {
            LocalDate today = LocalDate.now();
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(100L);

            AttendanceMetrics result = analyticsService.getAttendanceMetrics(tenantId, today);

            assertThat(result).isNotNull();
            assertThat(result.getDate()).isEqualTo(today);
            assertThat(result.getPresentCount()).isGreaterThanOrEqualTo(0L);
            assertThat(result.getAbsentCount()).isGreaterThanOrEqualTo(0L);
            assertThat(result.getAttendanceRate()).isGreaterThanOrEqualTo(0.0);
            assertThat(result.getWeeklyTrend()).hasSize(7);
        }

        @Test
        @DisplayName("Should handle zero active employees for attendance")
        void shouldHandleZeroActiveEmployees() {
            LocalDate today = LocalDate.now();
            when(employeeRepository.countByTenantIdAndStatus(eq(tenantId), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(0L);

            AttendanceMetrics result = analyticsService.getAttendanceMetrics(tenantId, today);

            assertThat(result).isNotNull();
            assertThat(result.getAttendanceRate()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("Leave Metrics Tests")
    class LeaveMetricsTests {

        @Test
        @DisplayName("Should get leave metrics successfully")
        void shouldGetLeaveMetricsSuccessfully() {
            LocalDate startDate = LocalDate.now().withDayOfMonth(1);
            LocalDate endDate = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
            when(leaveRequestRepository.findLeaveTypeDistribution(tenantId))
                    .thenReturn(Collections.singletonList(new Object[]{"Casual Leave", 2L}));

            LeaveMetrics result = analyticsService.getLeaveMetrics(tenantId, startDate, endDate);

            assertThat(result).isNotNull();
            assertThat(result.getPendingRequests()).isNotNull();
            assertThat(result.getApprovedThisMonth()).isNotNull();
            assertThat(result.getRejectedThisMonth()).isNotNull();
            assertThat(result.getLeaveTypeDistribution()).containsKey("Casual Leave");
        }
    }

    @Nested
    @DisplayName("Payroll Metrics Tests")
    class PayrollMetricsTests {

        @Test
        @DisplayName("Should get payroll metrics successfully")
        void shouldGetPayrollMetricsSuccessfully() {
            int year = LocalDate.now().getYear();
            int month = LocalDate.now().getMonthValue();

            PayrollMetrics result = analyticsService.getPayrollMetrics(tenantId, year, month);

            assertThat(result).isNotNull();
            assertThat(result.getYear()).isEqualTo(year);
            assertThat(result.getMonth()).isEqualTo(month);
            assertThat(result.getTotalGrossSalary()).isNotNull();
            assertThat(result.getTotalNetSalary()).isNotNull();
            assertThat(result.getTotalDeductions()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Headcount Trend Tests")
    class HeadcountTrendTests {

        @Test
        @DisplayName("Should get headcount trend successfully")
        void shouldGetHeadcountTrendSuccessfully() {
            when(employeeRepository.countByTenantId(tenantId)).thenReturn(100L);

            List<HeadcountTrend> result = analyticsService.getHeadcountTrend(6);

            assertThat(result).isNotNull();
            assertThat(result).hasSize(6);
            assertThat(result.get(0).year()).isGreaterThan(0);
            assertThat(result.get(0).month()).isBetween(1, 12);
        }

        @Test
        @DisplayName("Should handle different month ranges")
        void shouldHandleDifferentMonthRanges() {
            when(employeeRepository.countByTenantId(tenantId)).thenReturn(50L);

            List<HeadcountTrend> result12 = analyticsService.getHeadcountTrend(12);
            List<HeadcountTrend> result3 = analyticsService.getHeadcountTrend(3);

            assertThat(result12).hasSize(12);
            assertThat(result3).hasSize(3);
        }
    }

    @Nested
    @DisplayName("Tenant Key Tests")
    class TenantKeyTests {

        @Test
        @DisplayName("Should get current tenant key")
        void shouldGetCurrentTenantKey() {
            String result = analyticsService.getCurrentTenantKey();

            assertThat(result).isEqualTo(tenantId.toString());
        }

        @Test
        @DisplayName("Should return default key when tenant is null")
        void shouldReturnDefaultKeyWhenTenantIsNull() {
            tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(null);

            String result = analyticsService.getCurrentTenantKey();

            assertThat(result).isEqualTo("default");
        }
    }
}
