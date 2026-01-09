package com.nulogic.hrms.analytics;

import com.nulogic.hrms.analytics.dto.DashboardAnalyticsResponse;
import com.nulogic.hrms.attendance.AttendanceDayRepository;
import com.nulogic.hrms.attendance.AttendanceStatus;
import com.nulogic.hrms.config.HrmsProperties;
import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.leave.LeaveRequestRepository;
import com.nulogic.hrms.leave.LeaveRequestStatus;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsService {
    private static final Set<AttendanceStatus> PRESENT_STATUSES =
            Set.of(AttendanceStatus.PRESENT, AttendanceStatus.REGULARIZED);

    private final OrgService orgService;
    private final EmployeeRepository employeeRepository;
    private final AttendanceDayRepository attendanceDayRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AuthorizationService authorizationService;
    private final HrmsProperties properties;

    public AnalyticsService(OrgService orgService,
                            EmployeeRepository employeeRepository,
                            AttendanceDayRepository attendanceDayRepository,
                            LeaveRequestRepository leaveRequestRepository,
                            AuthorizationService authorizationService,
                            HrmsProperties properties) {
        this.orgService = orgService;
        this.employeeRepository = employeeRepository;
        this.attendanceDayRepository = attendanceDayRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.authorizationService = authorizationService;
        this.properties = properties;
    }

    public DashboardAnalyticsResponse getDashboardAnalytics(UUID userId) {
        Org org = orgService.getOrCreateOrg();
        PermissionScope scope = authorizationService.resolveScope(userId, "EMP", "VIEW");
        Employee self = scope == PermissionScope.ORG ? null : getCurrentEmployee(org, userId);
        LocalDate today = LocalDate.now(ZoneId.of(properties.getAttendance().getTimezone()));

        long totalEmployees = countEmployees(scope, org, self, userId);
        long present = countAttendance(scope, org, self, userId, today, PRESENT_STATUSES);
        long onLeave = countApprovedLeaveOnDate(scope, org, self, userId, today);
        long absent = Math.max(0, totalEmployees - present - onLeave);
        long onTime = present;
        long late = 0;
        double attendancePercentage = calculateAttendancePercentage(totalEmployees, present, onLeave);

        long pendingLeaves = countLeaveByStatus(scope, org, self, userId, LeaveRequestStatus.PENDING);
        long approvedLeaves = countLeaveByStatus(scope, org, self, userId, LeaveRequestStatus.APPROVED);
        long rejectedLeaves = countLeaveByStatus(scope, org, self, userId, LeaveRequestStatus.REJECTED);

        LocalDate monthStart = today.withDayOfMonth(1);
        long newJoinees = countJoiners(scope, org, self, userId, monthStart, today);
        long previousTotal = countJoinersBefore(scope, org, self, userId, monthStart);
        double growthPercentage = previousTotal > 0
                ? roundOneDecimal(((double) (totalEmployees - previousTotal) / previousTotal) * 100)
                : 0.0;

        String viewType = resolveViewType(scope);
        String viewLabel = resolveViewLabel(scope);
        long teamSize = scope == PermissionScope.SELF ? 1L : totalEmployees;

        return DashboardAnalyticsResponse.builder()
                .viewType(viewType)
                .viewLabel(viewLabel)
                .teamSize(teamSize)
                .attendance(DashboardAnalyticsResponse.AttendanceAnalytics.builder()
                        .present(present)
                        .absent(absent)
                        .onLeave(onLeave)
                        .onTime(onTime)
                        .late(late)
                        .attendancePercentage(attendancePercentage)
                        .trend(List.of())
                        .build())
                .leave(DashboardAnalyticsResponse.LeaveAnalytics.builder()
                        .pending(pendingLeaves)
                        .approved(approvedLeaves)
                        .rejected(rejectedLeaves)
                        .utilizationPercentage(0.0)
                        .trend(List.of())
                        .distribution(List.of())
                        .build())
                .headcount(DashboardAnalyticsResponse.HeadcountAnalytics.builder()
                        .total(totalEmployees)
                        .newJoinees(newJoinees)
                        .exits(0L)
                        .growthPercentage(growthPercentage)
                        .trend(List.of())
                        .departmentDistribution(List.of())
                        .build())
                .upcomingEvents(DashboardAnalyticsResponse.UpcomingEvents.builder()
                        .birthdays(List.of())
                        .anniversaries(List.of())
                        .holidays(List.of())
                        .build())
                .payroll(null)
                .build();
    }

    private Employee getCurrentEmployee(Org org, UUID userId) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
    }

    private long countEmployees(PermissionScope scope, Org org, Employee self, UUID userId) {
        return switch (scope) {
            case ORG -> employeeRepository.countByOrg_Id(org.getId());
            case DEPARTMENT -> self != null && self.getDepartmentId() != null
                    ? employeeRepository.countByOrg_IdAndDepartmentId(org.getId(), self.getDepartmentId())
                    : 0L;
            case TEAM -> self != null
                    ? employeeRepository.countByOrg_IdAndManager_Id(org.getId(), self.getId())
                    : 0L;
            case SELF -> employeeRepository.countByOrg_IdAndUser_Id(org.getId(), userId);
        };
    }

    private long countAttendance(PermissionScope scope, Org org, Employee self, UUID userId,
                                 LocalDate date, Set<AttendanceStatus> statuses) {
        return switch (scope) {
            case ORG -> attendanceDayRepository.countByOrgAndDateAndStatusIn(org.getId(), date, statuses);
            case DEPARTMENT -> self != null && self.getDepartmentId() != null
                    ? attendanceDayRepository.countByOrgAndDateAndDepartmentAndStatusIn(
                            org.getId(), self.getDepartmentId(), date, statuses)
                    : 0L;
            case TEAM -> self != null
                    ? attendanceDayRepository.countByOrgAndDateAndManagerAndStatusIn(
                            org.getId(), self.getId(), date, statuses)
                    : 0L;
            case SELF -> {
                if (self == null) {
                    yield 0L;
                }
                yield attendanceDayRepository.countByOrgAndDateAndEmployeeAndStatusIn(
                        org.getId(), self.getId(), date, statuses);
            }
        };
    }

    private long countApprovedLeaveOnDate(PermissionScope scope, Org org, Employee self, UUID userId, LocalDate date) {
        return switch (scope) {
            case ORG -> leaveRequestRepository.countByOrgAndStatusOverlappingDate(
                    org.getId(), LeaveRequestStatus.APPROVED, date);
            case DEPARTMENT -> self != null && self.getDepartmentId() != null
                    ? leaveRequestRepository.countByOrgAndDepartmentAndStatusOverlappingDate(
                            org.getId(), self.getDepartmentId(), LeaveRequestStatus.APPROVED, date)
                    : 0L;
            case TEAM -> self != null
                    ? leaveRequestRepository.countByOrgAndManagerAndStatusOverlappingDate(
                            org.getId(), self.getId(), LeaveRequestStatus.APPROVED, date)
                    : 0L;
            case SELF -> self != null
                    ? leaveRequestRepository.countByOrgAndEmployeeAndStatusOverlappingDate(
                            org.getId(), self.getId(), LeaveRequestStatus.APPROVED, date)
                    : 0L;
        };
    }

    private long countLeaveByStatus(PermissionScope scope, Org org, Employee self, UUID userId,
                                    LeaveRequestStatus status) {
        return switch (scope) {
            case ORG -> leaveRequestRepository.countByOrg_IdAndStatus(org.getId(), status);
            case DEPARTMENT -> self != null && self.getDepartmentId() != null
                    ? leaveRequestRepository.countByOrg_IdAndEmployee_DepartmentIdAndStatus(
                            org.getId(), self.getDepartmentId(), status)
                    : 0L;
            case TEAM -> self != null
                    ? leaveRequestRepository.countByOrg_IdAndEmployee_Manager_IdAndStatus(
                            org.getId(), self.getId(), status)
                    : 0L;
            case SELF -> self != null
                    ? leaveRequestRepository.countByOrg_IdAndEmployee_IdAndStatus(
                            org.getId(), self.getId(), status)
                    : 0L;
        };
    }

    private long countJoiners(PermissionScope scope, Org org, Employee self, UUID userId,
                              LocalDate startDate, LocalDate endDate) {
        return switch (scope) {
            case ORG -> employeeRepository.countByOrg_IdAndJoinDateBetween(org.getId(), startDate, endDate);
            case DEPARTMENT -> self != null && self.getDepartmentId() != null
                    ? employeeRepository.countByOrg_IdAndDepartmentIdAndJoinDateBetween(
                            org.getId(), self.getDepartmentId(), startDate, endDate)
                    : 0L;
            case TEAM -> self != null
                    ? employeeRepository.countByOrg_IdAndManager_IdAndJoinDateBetween(
                            org.getId(), self.getId(), startDate, endDate)
                    : 0L;
            case SELF -> self != null && self.getJoinDate() != null
                    && !self.getJoinDate().isBefore(startDate) && !self.getJoinDate().isAfter(endDate)
                    ? 1L
                    : 0L;
        };
    }

    private long countJoinersBefore(PermissionScope scope, Org org, Employee self, UUID userId, LocalDate beforeDate) {
        return switch (scope) {
            case ORG -> employeeRepository.countByOrg_IdAndJoinDateBefore(org.getId(), beforeDate);
            case DEPARTMENT -> self != null && self.getDepartmentId() != null
                    ? employeeRepository.countByOrg_IdAndDepartmentIdAndJoinDateBefore(
                            org.getId(), self.getDepartmentId(), beforeDate)
                    : 0L;
            case TEAM -> self != null
                    ? employeeRepository.countByOrg_IdAndManager_IdAndJoinDateBefore(
                            org.getId(), self.getId(), beforeDate)
                    : 0L;
            case SELF -> self != null && self.getJoinDate() != null
                    && self.getJoinDate().isBefore(beforeDate)
                    ? 1L
                    : 0L;
        };
    }

    private double calculateAttendancePercentage(long totalEmployees, long present, long onLeave) {
        long denominator = Math.max(totalEmployees - onLeave, 0);
        if (denominator == 0) {
            return 0.0;
        }
        return roundOneDecimal((double) present / denominator * 100.0);
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String resolveViewType(PermissionScope scope) {
        return switch (scope) {
            case ORG -> "ADMIN";
            case DEPARTMENT, TEAM -> "MANAGER";
            case SELF -> "EMPLOYEE";
        };
    }

    private String resolveViewLabel(PermissionScope scope) {
        return switch (scope) {
            case ORG -> "Organization View";
            case DEPARTMENT -> "Department View";
            case TEAM -> "Team View";
            case SELF -> "My View";
        };
    }
}
