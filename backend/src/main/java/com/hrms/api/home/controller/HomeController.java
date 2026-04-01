package com.hrms.api.home.controller;

import com.hrms.api.home.dto.*;
import com.hrms.application.home.service.HomeService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/home")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Home", description = "Home page APIs for dashboard widgets")
public class HomeController {

    private final HomeService homeService;

    @GetMapping("/birthdays")
    @Operation(summary = "Get upcoming birthdays", description = "Returns employees with birthdays in the next N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<BirthdayResponse>> getUpcomingBirthdays(
            @Parameter(description = "Number of days to look ahead (default 7)")
            @RequestParam(defaultValue = "7") int days,
            Pageable pageable) {
        log.debug("Getting upcoming birthdays for next {} days", days);
        List<BirthdayResponse> all = homeService.getUpcomingBirthdays(days);
        return ResponseEntity.ok(toPage(all, pageable));
    }

    @GetMapping("/anniversaries")
    @Operation(summary = "Get upcoming work anniversaries", description = "Returns employees with work anniversaries in the next N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<WorkAnniversaryResponse>> getUpcomingAnniversaries(
            @Parameter(description = "Number of days to look ahead (default 7)")
            @RequestParam(defaultValue = "7") int days,
            Pageable pageable) {
        log.debug("Getting upcoming work anniversaries for next {} days", days);
        List<WorkAnniversaryResponse> all = homeService.getUpcomingWorkAnniversaries(days);
        return ResponseEntity.ok(toPage(all, pageable));
    }

    @GetMapping("/new-joinees")
    @Operation(summary = "Get new joinees", description = "Returns employees who joined in the last N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<NewJoineeResponse>> getNewJoinees(
            @Parameter(description = "Number of days to look back (default 30)")
            @RequestParam(defaultValue = "30") int days,
            Pageable pageable) {
        log.debug("Getting new joinees for last {} days", days);
        List<NewJoineeResponse> all = homeService.getNewJoinees(days);
        return ResponseEntity.ok(toPage(all, pageable));
    }

    @GetMapping("/on-leave")
    @Operation(summary = "Get employees on leave today", description = "Returns employees who are on approved leave today")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<OnLeaveEmployeeResponse>> getEmployeesOnLeaveToday(Pageable pageable) {
        log.debug("Getting employees on leave today");
        List<OnLeaveEmployeeResponse> all = homeService.getEmployeesOnLeaveToday();
        return ResponseEntity.ok(toPage(all, pageable));
    }

    @GetMapping("/attendance/me")
    @Operation(summary = "Get today's attendance status", description = "Returns the current attendance status for the logged-in user")
    @RequiresPermission(ATTENDANCE_VIEW_SELF)
    public ResponseEntity<AttendanceTodayResponse> getAttendanceToday() {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        log.debug("Getting today's attendance for employee {}", employeeId);

        // SuperAdmin or users without an employee record may have null employeeId
        if (employeeId == null) {
            log.warn("Attendance requested by user without linked employee record (SuperAdmin?)");
            return ResponseEntity.ok(AttendanceTodayResponse.builder()
                    .date(java.time.LocalDate.now())
                    .status("NOT_APPLICABLE")
                    .isCheckedIn(false)
                    .canCheckIn(false)
                    .canCheckOut(false)
                    .build());
        }

        return ResponseEntity.ok(homeService.getAttendanceToday(employeeId));
    }

    @GetMapping("/remote-workers")
    @Operation(summary = "Get remote workers today", description = "Returns employees who checked in remotely today")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<RemoteWorkerResponse>> getRemoteWorkersToday(Pageable pageable) {
        log.debug("Getting remote workers today");
        List<RemoteWorkerResponse> all = homeService.getRemoteWorkersToday();
        return ResponseEntity.ok(toPage(all, pageable));
    }

    @GetMapping("/holidays")
    @Operation(summary = "Get upcoming holidays", description = "Returns holidays in the next N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<UpcomingHolidayResponse>> getUpcomingHolidays(
            @Parameter(description = "Number of days to look ahead (default 30)")
            @RequestParam(defaultValue = "30") int days,
            Pageable pageable) {
        log.debug("Getting upcoming holidays for next {} days", days);
        List<UpcomingHolidayResponse> all = homeService.getUpcomingHolidays(days);
        return ResponseEntity.ok(toPage(all, pageable));
    }

    /**
     * Helper to convert a List into a Page using the requested Pageable slice.
     */
    private <T> Page<T> toPage(List<T> list, Pageable pageable) {
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), list.size());
        List<T> subList = start >= list.size() ? List.of() : list.subList(start, end);
        return new PageImpl<>(subList, pageable, list.size());
    }
}
