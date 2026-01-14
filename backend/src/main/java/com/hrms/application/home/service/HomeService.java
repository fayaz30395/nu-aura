package com.hrms.application.home.service;

import com.hrms.api.home.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.Holiday;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class HomeService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final HolidayRepository holidayRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveTypeRepository leaveTypeRepository;

    /**
     * Get upcoming birthdays for the next N days (default 7 days)
     */
    public List<BirthdayResponse> getUpcomingBirthdays(int days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);

        List<Employee> employees = employeeRepository.findUpcomingBirthdays(tenantId, today, endDate);

        // Get all department IDs and fetch them in one query
        Set<UUID> departmentIds = employees.stream()
                .filter(e -> e.getDepartmentId() != null)
                .map(Employee::getDepartmentId)
                .collect(Collectors.toSet());
        Map<UUID, Department> departmentMap = getDepartmentMap(tenantId, departmentIds);

        return employees.stream()
                .filter(e -> e.getDateOfBirth() != null)
                .map(e -> {
                    LocalDate dob = e.getDateOfBirth();
                    LocalDate birthdayThisYear = dob.withYear(today.getYear());

                    // If birthday already passed this year, consider next year
                    if (birthdayThisYear.isBefore(today)) {
                        birthdayThisYear = dob.withYear(today.getYear() + 1);
                    }

                    long daysUntil = ChronoUnit.DAYS.between(today, birthdayThisYear);
                    boolean isToday = daysUntil == 0;

                    String departmentName = null;
                    if (e.getDepartmentId() != null) {
                        Department dept = departmentMap.get(e.getDepartmentId());
                        departmentName = dept != null ? dept.getName() : null;
                    }

                    return BirthdayResponse.builder()
                            .employeeId(e.getId())
                            .employeeName(e.getFullName())
                            .avatarUrl(null) // Employee entity doesn't have profile pic
                            .department(departmentName)
                            .dateOfBirth(dob)
                            .birthdayDate(birthdayThisYear)
                            .isToday(isToday)
                            .daysUntil((int) daysUntil)
                            .build();
                })
                .sorted(Comparator.comparingInt(BirthdayResponse::getDaysUntil))
                .collect(Collectors.toList());
    }

    /**
     * Get upcoming work anniversaries for the next N days (default 7 days)
     */
    public List<WorkAnniversaryResponse> getUpcomingWorkAnniversaries(int days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);

        List<Employee> employees = employeeRepository.findUpcomingAnniversaries(tenantId, today, endDate);

        // Get all department IDs and fetch them in one query
        Set<UUID> departmentIds = employees.stream()
                .filter(e -> e.getDepartmentId() != null)
                .map(Employee::getDepartmentId)
                .collect(Collectors.toSet());
        Map<UUID, Department> departmentMap = getDepartmentMap(tenantId, departmentIds);

        return employees.stream()
                .filter(e -> e.getJoiningDate() != null)
                .map(e -> {
                    LocalDate joiningDate = e.getJoiningDate();
                    LocalDate anniversaryThisYear = joiningDate.withYear(today.getYear());

                    // If anniversary already passed this year, consider next year
                    if (anniversaryThisYear.isBefore(today)) {
                        anniversaryThisYear = joiningDate.withYear(today.getYear() + 1);
                    }

                    long daysUntil = ChronoUnit.DAYS.between(today, anniversaryThisYear);
                    boolean isToday = daysUntil == 0;
                    int yearsCompleted = Period.between(joiningDate, anniversaryThisYear).getYears();

                    String departmentName = null;
                    if (e.getDepartmentId() != null) {
                        Department dept = departmentMap.get(e.getDepartmentId());
                        departmentName = dept != null ? dept.getName() : null;
                    }

                    return WorkAnniversaryResponse.builder()
                            .employeeId(e.getId())
                            .employeeName(e.getFullName())
                            .avatarUrl(null) // Employee entity doesn't have profile pic
                            .department(departmentName)
                            .designation(e.getDesignation()) // designation is a String field
                            .joiningDate(joiningDate)
                            .anniversaryDate(anniversaryThisYear)
                            .yearsCompleted(yearsCompleted)
                            .isToday(isToday)
                            .daysUntil((int) daysUntil)
                            .build();
                })
                .sorted(Comparator.comparingInt(WorkAnniversaryResponse::getDaysUntil))
                .collect(Collectors.toList());
    }

    /**
     * Get new joinees in the last N days (default 30 days)
     */
    public List<NewJoineeResponse> getNewJoinees(int days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(days);

        List<Employee> employees = employeeRepository.findByTenantId(tenantId);

        // Get all department IDs and fetch them in one query
        Set<UUID> departmentIds = employees.stream()
                .filter(e -> e.getDepartmentId() != null)
                .map(Employee::getDepartmentId)
                .collect(Collectors.toSet());
        Map<UUID, Department> departmentMap = getDepartmentMap(tenantId, departmentIds);

        return employees.stream()
                .filter(e -> e.getJoiningDate() != null &&
                             !e.getJoiningDate().isBefore(startDate) &&
                             !e.getJoiningDate().isAfter(today) &&
                             e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .map(e -> {
                    long daysSinceJoining = ChronoUnit.DAYS.between(e.getJoiningDate(), today);

                    String departmentName = null;
                    if (e.getDepartmentId() != null) {
                        Department dept = departmentMap.get(e.getDepartmentId());
                        departmentName = dept != null ? dept.getName() : null;
                    }

                    return NewJoineeResponse.builder()
                            .employeeId(e.getId())
                            .employeeName(e.getFullName())
                            .avatarUrl(null) // Employee entity doesn't have profile pic
                            .department(departmentName)
                            .designation(e.getDesignation()) // designation is a String field
                            .joiningDate(e.getJoiningDate())
                            .daysSinceJoining((int) daysSinceJoining)
                            .build();
                })
                .sorted(Comparator.comparingInt(NewJoineeResponse::getDaysSinceJoining))
                .collect(Collectors.toList());
    }

    /**
     * Get employees on leave today
     */
    public List<OnLeaveEmployeeResponse> getEmployeesOnLeaveToday() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();

        // Get leave requests where today falls between start and end date
        List<LeaveRequest> leaves = leaveRequestRepository.findByTenantIdAndStartDateBetween(tenantId, today.minusMonths(1), today);

        // Filter to only approved leaves that cover today
        List<LeaveRequest> approvedLeavesToday = leaves.stream()
                .filter(lr -> lr.getStatus() == LeaveRequest.LeaveRequestStatus.APPROVED)
                .filter(lr -> !lr.getStartDate().isAfter(today) && !lr.getEndDate().isBefore(today))
                .collect(Collectors.toList());

        if (approvedLeavesToday.isEmpty()) {
            return Collections.emptyList();
        }

        // Get employee IDs
        Set<UUID> employeeIds = approvedLeavesToday.stream()
                .map(LeaveRequest::getEmployeeId)
                .collect(Collectors.toSet());

        // Get leave type IDs
        Set<UUID> leaveTypeIds = approvedLeavesToday.stream()
                .map(LeaveRequest::getLeaveTypeId)
                .collect(Collectors.toSet());

        // Fetch employees and leave types in batch
        Map<UUID, Employee> employeeMap = employeeRepository.findAllById(employeeIds).stream()
                .collect(Collectors.toMap(Employee::getId, Function.identity()));

        Map<UUID, LeaveType> leaveTypeMap = leaveTypeRepository.findAllById(leaveTypeIds).stream()
                .collect(Collectors.toMap(LeaveType::getId, Function.identity()));

        // Get department IDs from employees
        Set<UUID> departmentIds = employeeMap.values().stream()
                .filter(e -> e.getDepartmentId() != null)
                .map(Employee::getDepartmentId)
                .collect(Collectors.toSet());
        Map<UUID, Department> departmentMap = getDepartmentMap(tenantId, departmentIds);

        return approvedLeavesToday.stream()
                .map(leave -> {
                    Employee employee = employeeMap.get(leave.getEmployeeId());
                    LeaveType leaveType = leaveTypeMap.get(leave.getLeaveTypeId());

                    if (employee == null) {
                        return null;
                    }

                    String departmentName = null;
                    if (employee.getDepartmentId() != null) {
                        Department dept = departmentMap.get(employee.getDepartmentId());
                        departmentName = dept != null ? dept.getName() : null;
                    }

                    return OnLeaveEmployeeResponse.builder()
                            .employeeId(employee.getId())
                            .employeeName(employee.getFullName())
                            .avatarUrl(null)
                            .department(departmentName)
                            .leaveType(leaveType != null ? leaveType.getLeaveName() : "Leave")
                            .startDate(leave.getStartDate())
                            .endDate(leave.getEndDate())
                            .reason(leave.getReason())
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Get today's attendance status for an employee
     */
    public AttendanceTodayResponse getAttendanceToday(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();

        // Check if today is a holiday
        Optional<Holiday> holidayOpt = holidayRepository.findByTenantIdAndDate(tenantId, today);
        if (holidayOpt.isPresent()) {
            return AttendanceTodayResponse.builder()
                    .employeeId(employeeId)
                    .date(today)
                    .status("HOLIDAY")
                    .isCheckedIn(false)
                    .canCheckIn(false)
                    .canCheckOut(false)
                    .build();
        }

        // Check if today is a weekend (can be customized based on company policy)
        DayOfWeek dayOfWeek = today.getDayOfWeek();
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return AttendanceTodayResponse.builder()
                    .employeeId(employeeId)
                    .date(today)
                    .status("WEEKLY_OFF")
                    .isCheckedIn(false)
                    .canCheckIn(true) // May allow check-in on weekends for some roles
                    .canCheckOut(false)
                    .build();
        }

        // Check if employee is on leave today
        Long leaveCount = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, employeeId);
        if (leaveCount != null && leaveCount > 0) {
            return AttendanceTodayResponse.builder()
                    .employeeId(employeeId)
                    .date(today)
                    .status("ON_LEAVE")
                    .isCheckedIn(false)
                    .canCheckIn(false)
                    .canCheckOut(false)
                    .build();
        }

        // Check attendance record using the tenant-aware method
        Optional<AttendanceRecord> attendanceOpt = attendanceRecordRepository.findByTenantIdAndEmployeeIdAndDate(
                tenantId, employeeId, today);

        if (attendanceOpt.isPresent()) {
            AttendanceRecord record = attendanceOpt.get();
            boolean isCheckedIn = record.getCheckInTime() != null;
            boolean isCheckedOut = record.getCheckOutTime() != null;

            // Convert workDurationMinutes to decimal hours
            Double totalWorkHours = null;
            if (record.getWorkDurationMinutes() != null && record.getWorkDurationMinutes() > 0) {
                totalWorkHours = record.getWorkDurationMinutes() / 60.0;
            }

            return AttendanceTodayResponse.builder()
                    .attendanceId(record.getId())
                    .employeeId(employeeId)
                    .date(today)
                    .status(record.getStatus().name())
                    .checkInTime(record.getCheckInTime())
                    .checkOutTime(record.getCheckOutTime())
                    .totalWorkHours(totalWorkHours)
                    .isCheckedIn(isCheckedIn && !isCheckedOut)
                    .canCheckIn(!isCheckedIn)
                    .canCheckOut(isCheckedIn && !isCheckedOut)
                    .source(record.getCheckInSource())
                    .location(record.getCheckInLocation())
                    .build();
        }

        // No attendance record - employee can check in
        return AttendanceTodayResponse.builder()
                .employeeId(employeeId)
                .date(today)
                .status("NOT_MARKED")
                .isCheckedIn(false)
                .canCheckIn(true)
                .canCheckOut(false)
                .build();
    }

    /**
     * Get upcoming holidays for the next N days (default 30 days)
     */
    public List<UpcomingHolidayResponse> getUpcomingHolidays(int days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);

        List<Holiday> holidays = holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, today, endDate);

        return holidays.stream()
                .map(h -> {
                    long daysUntil = ChronoUnit.DAYS.between(today, h.getHolidayDate());
                    String dayOfWeekStr = h.getHolidayDate().getDayOfWeek()
                            .getDisplayName(TextStyle.FULL, Locale.ENGLISH);

                    return UpcomingHolidayResponse.builder()
                            .id(h.getId())
                            .name(h.getHolidayName())
                            .date(h.getHolidayDate())
                            .type(h.getHolidayType() != null ? h.getHolidayType().name() : "COMPANY_EVENT")
                            .description(h.getDescription())
                            .isOptional(Boolean.TRUE.equals(h.getIsOptional()))
                            .daysUntil((int) daysUntil)
                            .dayOfWeek(dayOfWeekStr)
                            .build();
                })
                .sorted(Comparator.comparingInt(UpcomingHolidayResponse::getDaysUntil))
                .collect(Collectors.toList());
    }

    /**
     * Helper method to get departments as a map
     */
    private Map<UUID, Department> getDepartmentMap(UUID tenantId, Set<UUID> departmentIds) {
        if (departmentIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(Department::getId, Function.identity()));
    }
}
