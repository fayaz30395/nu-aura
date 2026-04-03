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
import org.junit.jupiter.api.AfterEach;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
class HomeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private HolidayRepository holidayRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @InjectMocks
    private HomeService homeService;

    private MockedStatic<TenantContext> tenantContextMock;
    private UUID tenantId;
    private UUID employeeId;
    private UUID departmentId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        departmentId = UUID.randomUUID();

        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    // ==================== Birthday Tests ====================

    private Employee createTestEmployee(UUID id, String firstName, String lastName, LocalDate dob) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        employee.setDateOfBirth(dob);
        employee.setJoiningDate(LocalDate.now().minusYears(1));
        employee.setDepartmentId(departmentId);
        employee.setDesignation("Software Engineer");
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
        return employee;
    }

    // ==================== Work Anniversary Tests ====================

    private Department createTestDepartment(UUID id, String name) {
        Department department = new Department();
        department.setId(id);
        department.setName(name);
        department.setCode(name.toUpperCase().substring(0, Math.min(3, name.length())));
        return department;
    }

    // ==================== New Joinee Tests ====================

    private LeaveRequest createTestLeaveRequest(UUID employeeId, UUID leaveTypeId, LocalDate startDate, LocalDate endDate) {
        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setId(UUID.randomUUID());
        leaveRequest.setEmployeeId(employeeId);
        leaveRequest.setLeaveTypeId(leaveTypeId);
        leaveRequest.setStartDate(startDate);
        leaveRequest.setEndDate(endDate);
        leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.APPROVED);
        leaveRequest.setReason("Personal");
        return leaveRequest;
    }

    // ==================== On Leave Today Tests ====================

    private LeaveType createTestLeaveType(UUID id, String name) {
        LeaveType leaveType = new LeaveType();
        leaveType.setId(id);
        leaveType.setLeaveName(name);
        leaveType.setLeaveCode(name.toUpperCase().replace(" ", "_"));
        return leaveType;
    }

    // ==================== Attendance Today Tests ====================

    private Holiday createTestHoliday(String name, LocalDate date) {
        Holiday holiday = new Holiday();
        holiday.setId(UUID.randomUUID());
        holiday.setHolidayName(name);
        holiday.setHolidayDate(date);
        holiday.setDescription("Test holiday");
        holiday.setIsOptional(false);
        return holiday;
    }

    // ==================== Holiday Tests ====================

    private AttendanceRecord createTestAttendanceRecord(UUID employeeId, LocalDate date) {
        AttendanceRecord record = new AttendanceRecord();
        record.setId(UUID.randomUUID());
        record.setEmployeeId(employeeId);
        record.setAttendanceDate(date);
        record.setWorkDurationMinutes(0);
        return record;
    }

    // ==================== Helper Methods ====================

    @Nested
    @DisplayName("Birthday Tests")
    class BirthdayTests {

        @Test
        @DisplayName("should return employees with upcoming birthdays")
        void getUpcomingBirthdays_shouldReturnEmployeesWithBirthdays() {
            // Given
            Employee employee = createTestEmployee(employeeId, "John", "Doe", LocalDate.now());
            Department department = createTestDepartment(departmentId, "Engineering");

            when(employeeRepository.findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee));
            when(departmentRepository.findAllById(anySet()))
                    .thenReturn(List.of(department));

            // When
            List<BirthdayResponse> result = homeService.getUpcomingBirthdays(7);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeName()).isEqualTo("John Doe");
            assertThat(result.get(0).isToday()).isTrue();
            assertThat(result.get(0).getDaysUntil()).isEqualTo(0);

            verify(employeeRepository).findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class));
        }

        @Test
        @DisplayName("should handle employees without departments")
        void getUpcomingBirthdays_shouldHandleNoDepartment() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Jane", "Smith", LocalDate.now().plusDays(2));
            employee.setDepartmentId(null);

            when(employeeRepository.findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee));

            // When
            List<BirthdayResponse> result = homeService.getUpcomingBirthdays(7);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getDepartment()).isNull();
        }

        @Test
        @DisplayName("should return empty list when no birthdays in range")
        void getUpcomingBirthdays_shouldReturnEmptyWhenNoBirthdays() {
            // Given
            when(employeeRepository.findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // When
            List<BirthdayResponse> result = homeService.getUpcomingBirthdays(7);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should sort birthdays by days until")
        void getUpcomingBirthdays_shouldSortByDaysUntil() {
            // Given
            Employee employee1 = createTestEmployee(UUID.randomUUID(), "Far", "Birthday", LocalDate.now().plusDays(5));
            Employee employee2 = createTestEmployee(UUID.randomUUID(), "Near", "Birthday", LocalDate.now().plusDays(1));
            Employee employee3 = createTestEmployee(UUID.randomUUID(), "Today", "Birthday", LocalDate.now());

            when(employeeRepository.findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee1, employee2, employee3));

            // When
            List<BirthdayResponse> result = homeService.getUpcomingBirthdays(7);

            // Then
            assertThat(result).hasSize(3);
            assertThat(result.get(0).getEmployeeName()).isEqualTo("Today Birthday");
            assertThat(result.get(1).getEmployeeName()).isEqualTo("Near Birthday");
            assertThat(result.get(2).getEmployeeName()).isEqualTo("Far Birthday");
        }

        @Test
        @DisplayName("should handle multiple employees with same birthday")
        void getUpcomingBirthdays_shouldHandleMultipleSameDayBirthdays() {
            // Given
            LocalDate sameBirthday = LocalDate.now().plusDays(3);
            Employee employee1 = createTestEmployee(UUID.randomUUID(), "Alice", "Wonder", sameBirthday);
            Employee employee2 = createTestEmployee(UUID.randomUUID(), "Bob", "Builder", sameBirthday);

            when(employeeRepository.findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee1, employee2));

            // When
            List<BirthdayResponse> result = homeService.getUpcomingBirthdays(7);

            // Then
            assertThat(result).hasSize(2);
            assertThat(result).allMatch(b -> b.getDaysUntil() == 3);
        }

        @ParameterizedTest
        @ValueSource(ints = {1, 7, 14, 30, 90})
        @DisplayName("should respect different day ranges")
        void getUpcomingBirthdays_shouldRespectDayRange(int days) {
            // Given
            when(employeeRepository.findUpcomingBirthdays(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // When
            homeService.getUpcomingBirthdays(days);

            // Then
            verify(employeeRepository).findUpcomingBirthdays(
                    eq(tenantId),
                    eq(LocalDate.now()),
                    eq(LocalDate.now().plusDays(days))
            );
        }
    }

    @Nested
    @DisplayName("Work Anniversary Tests")
    class WorkAnniversaryTests {

        @Test
        @DisplayName("should return employees with anniversaries")
        void getUpcomingWorkAnniversaries_shouldReturnAnniversaries() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Bob", "Wilson", LocalDate.of(1990, 1, 1));
            employee.setJoiningDate(LocalDate.now().minusYears(3));
            Department department = createTestDepartment(departmentId, "HR");

            when(employeeRepository.findUpcomingAnniversaries(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee));
            when(departmentRepository.findAllById(anySet()))
                    .thenReturn(List.of(department));

            // When
            List<WorkAnniversaryResponse> result = homeService.getUpcomingWorkAnniversaries(7);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeName()).isEqualTo("Bob Wilson");
            assertThat(result.get(0).getYearsCompleted()).isGreaterThan(0);

            verify(employeeRepository).findUpcomingAnniversaries(eq(tenantId), any(LocalDate.class), any(LocalDate.class));
        }

        @Test
        @DisplayName("should calculate correct years completed")
        void getUpcomingWorkAnniversaries_shouldCalculateCorrectYears() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Veteran", "Employee", LocalDate.of(1985, 5, 15));
            employee.setJoiningDate(LocalDate.now().minusYears(10)); // 10 year anniversary

            when(employeeRepository.findUpcomingAnniversaries(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee));

            // When
            List<WorkAnniversaryResponse> result = homeService.getUpcomingWorkAnniversaries(7);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getYearsCompleted()).isEqualTo(10);
        }

        @Test
        @DisplayName("should include designation in response")
        void getUpcomingWorkAnniversaries_shouldIncludeDesignation() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Senior", "Dev", LocalDate.of(1990, 1, 1));
            employee.setJoiningDate(LocalDate.now().minusYears(5));
            employee.setDesignation("Senior Software Engineer");

            when(employeeRepository.findUpcomingAnniversaries(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(employee));

            // When
            List<WorkAnniversaryResponse> result = homeService.getUpcomingWorkAnniversaries(7);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getDesignation()).isEqualTo("Senior Software Engineer");
        }

        @Test
        @DisplayName("should return empty list when no anniversaries")
        void getUpcomingWorkAnniversaries_shouldReturnEmptyWhenNoAnniversaries() {
            // Given
            when(employeeRepository.findUpcomingAnniversaries(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // When
            List<WorkAnniversaryResponse> result = homeService.getUpcomingWorkAnniversaries(7);

            // Then
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("New Joinee Tests")
    class NewJoineeTests {

        @Test
        @DisplayName("should return recently joined employees")
        void getNewJoinees_shouldReturnRecentJoinees() {
            // Given
            Employee employee = createTestEmployee(employeeId, "New", "Employee", LocalDate.of(1995, 5, 15));
            employee.setJoiningDate(LocalDate.now().minusDays(5));
            employee.setStatus(Employee.EmployeeStatus.ACTIVE);
            Department department = createTestDepartment(departmentId, "Engineering");

            when(employeeRepository.findByTenantIdAndJoiningDateBetweenAndStatus(
                    eq(tenantId), any(LocalDate.class), any(LocalDate.class), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(List.of(employee));
            when(departmentRepository.findAllById(anySet())).thenReturn(List.of(department));

            // When
            List<NewJoineeResponse> result = homeService.getNewJoinees(30);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeName()).isEqualTo("New Employee");
            assertThat(result.get(0).getDaysSinceJoining()).isEqualTo(5);
        }

        @Test
        @DisplayName("should exclude employees who joined before the date range")
        void getNewJoinees_shouldExcludeOldJoinees() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Old", "Employee", LocalDate.of(1990, 1, 1));
            employee.setJoiningDate(LocalDate.now().minusDays(60)); // Older than 30 days
            employee.setStatus(Employee.EmployeeStatus.ACTIVE);

            when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));

            // When
            List<NewJoineeResponse> result = homeService.getNewJoinees(30);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should exclude terminated employees")
        void getNewJoinees_shouldExcludeTerminatedEmployees() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Terminated", "Employee", LocalDate.of(1990, 1, 1));
            employee.setJoiningDate(LocalDate.now().minusDays(5));
            employee.setStatus(Employee.EmployeeStatus.TERMINATED);

            when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));

            // When
            List<NewJoineeResponse> result = homeService.getNewJoinees(30);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should sort by days since joining")
        void getNewJoinees_shouldSortByDaysSinceJoining() {
            // Given
            Employee employee1 = createTestEmployee(UUID.randomUUID(), "Old", "New", LocalDate.of(1990, 1, 1));
            employee1.setJoiningDate(LocalDate.now().minusDays(20));
            employee1.setStatus(Employee.EmployeeStatus.ACTIVE);

            Employee employee2 = createTestEmployee(UUID.randomUUID(), "Recent", "New", LocalDate.of(1992, 1, 1));
            employee2.setJoiningDate(LocalDate.now().minusDays(5));
            employee2.setStatus(Employee.EmployeeStatus.ACTIVE);

            Employee employee3 = createTestEmployee(UUID.randomUUID(), "Today", "New", LocalDate.of(1995, 1, 1));
            employee3.setJoiningDate(LocalDate.now());
            employee3.setStatus(Employee.EmployeeStatus.ACTIVE);

            when(employeeRepository.findByTenantIdAndJoiningDateBetweenAndStatus(
                    eq(tenantId), any(LocalDate.class), any(LocalDate.class), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(List.of(employee1, employee2, employee3));

            // When
            List<NewJoineeResponse> result = homeService.getNewJoinees(30);

            // Then
            assertThat(result).hasSize(3);
            assertThat(result.get(0).getDaysSinceJoining()).isEqualTo(0);
            assertThat(result.get(1).getDaysSinceJoining()).isEqualTo(5);
            assertThat(result.get(2).getDaysSinceJoining()).isEqualTo(20);
        }

        @Test
        @DisplayName("should handle employee who joined today")
        void getNewJoinees_shouldHandleEmployeeJoinedToday() {
            // Given
            Employee employee = createTestEmployee(employeeId, "Brand", "New", LocalDate.of(1998, 8, 8));
            employee.setJoiningDate(LocalDate.now());
            employee.setStatus(Employee.EmployeeStatus.ACTIVE);

            when(employeeRepository.findByTenantIdAndJoiningDateBetweenAndStatus(
                    eq(tenantId), any(LocalDate.class), any(LocalDate.class), eq(Employee.EmployeeStatus.ACTIVE)))
                    .thenReturn(List.of(employee));

            // When
            List<NewJoineeResponse> result = homeService.getNewJoinees(30);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getDaysSinceJoining()).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("On Leave Today Tests")
    class OnLeaveTodayTests {

        @Test
        @DisplayName("should return employees on approved leave")
        void getEmployeesOnLeaveToday_shouldReturnOnLeaveEmployees() {
            // Given
            UUID leaveTypeId = UUID.randomUUID();
            LeaveRequest leaveRequest = createTestLeaveRequest(employeeId, leaveTypeId, LocalDate.now(), LocalDate.now().plusDays(2));
            Employee employee = createTestEmployee(employeeId, "Leave", "Employee", LocalDate.of(1992, 3, 20));
            LeaveType leaveType = createTestLeaveType(leaveTypeId, "Sick Leave");
            Department department = createTestDepartment(departmentId, "Sales");

            when(leaveRequestRepository.findByTenantIdAndStartDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(leaveRequest));
            when(employeeRepository.findAllById(anySet())).thenReturn(List.of(employee));
            when(leaveTypeRepository.findAllById(anySet())).thenReturn(List.of(leaveType));
            when(departmentRepository.findAllById(anySet())).thenReturn(List.of(department));

            // When
            List<OnLeaveEmployeeResponse> result = homeService.getEmployeesOnLeaveToday();

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeName()).isEqualTo("Leave Employee");
            assertThat(result.get(0).getLeaveType()).isEqualTo("Sick Leave");
        }

        @Test
        @DisplayName("should return empty list when no approved leaves")
        void getEmployeesOnLeaveToday_shouldReturnEmptyWhenNoLeaves() {
            // Given
            when(leaveRequestRepository.findByTenantIdAndStartDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // When
            List<OnLeaveEmployeeResponse> result = homeService.getEmployeesOnLeaveToday();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should exclude pending leave requests")
        void getEmployeesOnLeaveToday_shouldExcludePendingLeaves() {
            // Given
            UUID leaveTypeId = UUID.randomUUID();
            LeaveRequest pendingLeave = createTestLeaveRequest(employeeId, leaveTypeId, LocalDate.now(), LocalDate.now().plusDays(2));
            pendingLeave.setStatus(LeaveRequest.LeaveRequestStatus.PENDING);

            when(leaveRequestRepository.findByTenantIdAndStartDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(pendingLeave));

            // When
            List<OnLeaveEmployeeResponse> result = homeService.getEmployeesOnLeaveToday();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should exclude rejected leave requests")
        void getEmployeesOnLeaveToday_shouldExcludeRejectedLeaves() {
            // Given
            UUID leaveTypeId = UUID.randomUUID();
            LeaveRequest rejectedLeave = createTestLeaveRequest(employeeId, leaveTypeId, LocalDate.now(), LocalDate.now().plusDays(2));
            rejectedLeave.setStatus(LeaveRequest.LeaveRequestStatus.REJECTED);

            when(leaveRequestRepository.findByTenantIdAndStartDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(rejectedLeave));

            // When
            List<OnLeaveEmployeeResponse> result = homeService.getEmployeesOnLeaveToday();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should include leave that started before today but covers today")
        void getEmployeesOnLeaveToday_shouldIncludeOngoingLeave() {
            // Given
            UUID leaveTypeId = UUID.randomUUID();
            LeaveRequest ongoingLeave = createTestLeaveRequest(employeeId, leaveTypeId,
                    LocalDate.now().minusDays(2), LocalDate.now().plusDays(2));
            Employee employee = createTestEmployee(employeeId, "Ongoing", "Leave", LocalDate.of(1990, 1, 1));
            LeaveType leaveType = createTestLeaveType(leaveTypeId, "Annual Leave");

            when(leaveRequestRepository.findByTenantIdAndStartDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(ongoingLeave));
            when(employeeRepository.findAllById(anySet())).thenReturn(List.of(employee));
            when(leaveTypeRepository.findAllById(anySet())).thenReturn(List.of(leaveType));

            // When
            List<OnLeaveEmployeeResponse> result = homeService.getEmployeesOnLeaveToday();

            // Then
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should handle multiple employees on leave")
        void getEmployeesOnLeaveToday_shouldHandleMultipleEmployees() {
            // Given
            UUID leaveTypeId = UUID.randomUUID();
            UUID employee1Id = UUID.randomUUID();
            UUID employee2Id = UUID.randomUUID();

            LeaveRequest leave1 = createTestLeaveRequest(employee1Id, leaveTypeId, LocalDate.now(), LocalDate.now());
            LeaveRequest leave2 = createTestLeaveRequest(employee2Id, leaveTypeId, LocalDate.now(), LocalDate.now().plusDays(1));

            Employee emp1 = createTestEmployee(employee1Id, "First", "OnLeave", LocalDate.of(1990, 1, 1));
            Employee emp2 = createTestEmployee(employee2Id, "Second", "OnLeave", LocalDate.of(1991, 2, 2));
            LeaveType leaveType = createTestLeaveType(leaveTypeId, "Casual Leave");

            when(leaveRequestRepository.findByTenantIdAndStartDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(leave1, leave2));
            when(employeeRepository.findAllById(anySet())).thenReturn(List.of(emp1, emp2));
            when(leaveTypeRepository.findAllById(anySet())).thenReturn(List.of(leaveType));

            // When
            List<OnLeaveEmployeeResponse> result = homeService.getEmployeesOnLeaveToday();

            // Then
            assertThat(result).hasSize(2);
        }
    }

    @Nested
    @DisplayName("Attendance Today Tests")
    class AttendanceTodayTests {

        @Test
        @DisplayName("should return holiday status when it's a holiday")
        void getAttendanceToday_shouldReturnHolidayStatus() {
            // Given
            Holiday holiday = createTestHoliday("New Year", LocalDate.now());

            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now()))
                    .thenReturn(Optional.of(holiday));

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            assertThat(result.getStatus()).isEqualTo("HOLIDAY");
            assertThat(result.isCanCheckIn()).isFalse();
            assertThat(result.isCanCheckOut()).isFalse();
        }

        @Test
        @DisplayName("should return attendance record when employee has checked in")
        void getAttendanceToday_shouldReturnAttendanceWhenCheckedIn() {
            // Given
            AttendanceRecord attendance = createTestAttendanceRecord(employeeId, LocalDate.now());
            attendance.setCheckInTime(LocalDateTime.now().minusHours(4));
            attendance.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);

            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now())).thenReturn(Optional.empty());
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED), eq(employeeId)))
                    .thenReturn(0L);
            when(attendanceRecordRepository.findByTenantIdAndEmployeeIdAndDate(tenantId, employeeId, LocalDate.now()))
                    .thenReturn(Optional.of(attendance));

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            assertThat(result.getStatus()).isEqualTo("PRESENT");
            assertThat(result.isCheckedIn()).isTrue();
            assertThat(result.isCanCheckIn()).isFalse();
            assertThat(result.isCanCheckOut()).isTrue();
        }

        @Test
        @DisplayName("should return NOT_MARKED when no attendance record exists")
        void getAttendanceToday_shouldReturnNotMarkedWhenNoRecord() {
            // Given
            LocalDate today = LocalDate.now();
            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now())).thenReturn(Optional.empty());
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED), eq(employeeId)))
                    .thenReturn(0L);
            when(attendanceRecordRepository.findByTenantIdAndEmployeeIdAndDate(tenantId, employeeId, LocalDate.now()))
                    .thenReturn(Optional.empty());

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            boolean isWeekend = today.getDayOfWeek() == java.time.DayOfWeek.SATURDAY
                    || today.getDayOfWeek() == java.time.DayOfWeek.SUNDAY;
            assertThat(result.getStatus()).isEqualTo(isWeekend ? "WEEKLY_OFF" : "NOT_MARKED");
            assertThat(result.isCanCheckIn()).isTrue();
            assertThat(result.isCanCheckOut()).isFalse();
        }

        @Test
        @DisplayName("should return ON_LEAVE when employee is on approved leave")
        void getAttendanceToday_shouldReturnOnLeaveStatus() {
            // Given
            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now())).thenReturn(Optional.empty());
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED), eq(employeeId)))
                    .thenReturn(1L);

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            assertThat(result.getStatus()).isEqualTo("ON_LEAVE");
            assertThat(result.isCanCheckIn()).isFalse();
            assertThat(result.isCanCheckOut()).isFalse();
        }

        @Test
        @DisplayName("should return completed status when already checked out")
        void getAttendanceToday_shouldReturnCompletedWhenCheckedOut() {
            // Given
            AttendanceRecord attendance = createTestAttendanceRecord(employeeId, LocalDate.now());
            attendance.setCheckInTime(LocalDateTime.now().minusHours(8));
            attendance.setCheckOutTime(LocalDateTime.now().minusHours(1));
            attendance.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
            attendance.setWorkDurationMinutes(420); // 7 hours

            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now())).thenReturn(Optional.empty());
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED), eq(employeeId)))
                    .thenReturn(0L);
            when(attendanceRecordRepository.findByTenantIdAndEmployeeIdAndDate(tenantId, employeeId, LocalDate.now()))
                    .thenReturn(Optional.of(attendance));

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            assertThat(result.getStatus()).isEqualTo("PRESENT");
            assertThat(result.isCheckedIn()).isFalse();
            assertThat(result.isCanCheckIn()).isTrue();
            assertThat(result.isCanCheckOut()).isFalse();
            assertThat(result.getTotalWorkHours()).isEqualTo(7.0);
        }

        @Test
        @DisplayName("should include check-in and check-out times in response")
        void getAttendanceToday_shouldIncludeTimes() {
            // Given
            LocalDateTime checkInTime = LocalDateTime.now().minusHours(4);
            AttendanceRecord attendance = createTestAttendanceRecord(employeeId, LocalDate.now());
            attendance.setCheckInTime(checkInTime);
            attendance.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);

            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now())).thenReturn(Optional.empty());
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED), eq(employeeId)))
                    .thenReturn(0L);
            when(attendanceRecordRepository.findByTenantIdAndEmployeeIdAndDate(tenantId, employeeId, LocalDate.now()))
                    .thenReturn(Optional.of(attendance));

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            assertThat(result.getCheckInTime()).isEqualTo(checkInTime);
            assertThat(result.getCheckOutTime()).isNull();
        }

        @Test
        @DisplayName("should include source and location in response")
        void getAttendanceToday_shouldIncludeSourceAndLocation() {
            // Given
            AttendanceRecord attendance = createTestAttendanceRecord(employeeId, LocalDate.now());
            attendance.setCheckInTime(LocalDateTime.now().minusHours(2));
            attendance.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
            attendance.setCheckInSource("WEB");
            attendance.setCheckInLocation("Office - Chennai");

            when(holidayRepository.findByTenantIdAndDate(tenantId, LocalDate.now())).thenReturn(Optional.empty());
            when(leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    eq(tenantId), any(LocalDate.class), eq(LeaveRequest.LeaveRequestStatus.APPROVED), eq(employeeId)))
                    .thenReturn(0L);
            when(attendanceRecordRepository.findByTenantIdAndEmployeeIdAndDate(tenantId, employeeId, LocalDate.now()))
                    .thenReturn(Optional.of(attendance));

            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(employeeId);

            // Then
            assertThat(result.getSource()).isEqualTo("WEB");
            assertThat(result.getLocation()).isEqualTo("Office - Chennai");
        }

        @Test
        @DisplayName("should handle null employeeId (SuperAdmin without employee record)")
        void getAttendanceToday_shouldHandleNullEmployeeId() {
            // Given - null employeeId (SuperAdmin case)
            // When
            AttendanceTodayResponse result = homeService.getAttendanceToday(null);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo("NOT_APPLICABLE");
            assertThat(result.getEmployeeId()).isNull();
            assertThat(result.getDate()).isEqualTo(LocalDate.now());
            assertThat(result.isCheckedIn()).isFalse();
            assertThat(result.isCanCheckIn()).isFalse();
            assertThat(result.isCanCheckOut()).isFalse();

            // Verify repositories were not called
            verifyNoInteractions(holidayRepository);
            verifyNoInteractions(leaveRequestRepository);
            verifyNoInteractions(attendanceRecordRepository);
        }
    }

    @Nested
    @DisplayName("Holiday Tests")
    class HolidayTests {

        @Test
        @DisplayName("should return holidays within date range")
        void getUpcomingHolidays_shouldReturnHolidaysInRange() {
            // Given
            Holiday holiday1 = createTestHoliday("Christmas", LocalDate.now().plusDays(10));
            Holiday holiday2 = createTestHoliday("New Year", LocalDate.now().plusDays(20));

            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(holiday1, holiday2));

            // When
            List<UpcomingHolidayResponse> result = homeService.getUpcomingHolidays(30);

            // Then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getName()).isEqualTo("Christmas");
            assertThat(result.get(0).getDaysUntil()).isEqualTo(10);
            assertThat(result.get(1).getName()).isEqualTo("New Year");
            assertThat(result.get(1).getDaysUntil()).isEqualTo(20);
        }

        @Test
        @DisplayName("should return empty list when no holidays")
        void getUpcomingHolidays_shouldReturnEmptyWhenNoHolidays() {
            // Given
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // When
            List<UpcomingHolidayResponse> result = homeService.getUpcomingHolidays(30);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should sort holidays by days until")
        void getUpcomingHolidays_shouldSortByDaysUntil() {
            // Given
            Holiday holiday1 = createTestHoliday("Far Holiday", LocalDate.now().plusDays(30));
            Holiday holiday2 = createTestHoliday("Near Holiday", LocalDate.now().plusDays(5));
            Holiday holiday3 = createTestHoliday("Today Holiday", LocalDate.now());

            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(holiday1, holiday2, holiday3));

            // When
            List<UpcomingHolidayResponse> result = homeService.getUpcomingHolidays(30);

            // Then
            assertThat(result).hasSize(3);
            assertThat(result.get(0).getName()).isEqualTo("Today Holiday");
            assertThat(result.get(1).getName()).isEqualTo("Near Holiday");
            assertThat(result.get(2).getName()).isEqualTo("Far Holiday");
        }

        @Test
        @DisplayName("should include day of week in response")
        void getUpcomingHolidays_shouldIncludeDayOfWeek() {
            // Given
            Holiday holiday = createTestHoliday("Test Holiday", LocalDate.now().plusDays(5));

            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(holiday));

            // When
            List<UpcomingHolidayResponse> result = homeService.getUpcomingHolidays(30);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getDayOfWeek()).isNotNull();
            assertThat(result.get(0).getDayOfWeek()).isNotEmpty();
        }

        @Test
        @DisplayName("should flag optional holidays")
        void getUpcomingHolidays_shouldFlagOptionalHolidays() {
            // Given
            Holiday optionalHoliday = createTestHoliday("Optional Holiday", LocalDate.now().plusDays(10));
            optionalHoliday.setIsOptional(true);

            Holiday mandatoryHoliday = createTestHoliday("Mandatory Holiday", LocalDate.now().plusDays(15));
            mandatoryHoliday.setIsOptional(false);

            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(optionalHoliday, mandatoryHoliday));

            // When
            List<UpcomingHolidayResponse> result = homeService.getUpcomingHolidays(30);

            // Then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).isOptional()).isTrue();
            assertThat(result.get(1).isOptional()).isFalse();
        }

        @ParameterizedTest
        @ValueSource(ints = {7, 30, 60, 90})
        @DisplayName("should respect different day ranges")
        void getUpcomingHolidays_shouldRespectDayRange(int days) {
            // Given
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // When
            homeService.getUpcomingHolidays(days);

            // Then
            verify(holidayRepository).findAllByTenantIdAndHolidayDateBetween(
                    eq(tenantId),
                    eq(LocalDate.now()),
                    eq(LocalDate.now().plusDays(days))
            );
        }
    }
}
