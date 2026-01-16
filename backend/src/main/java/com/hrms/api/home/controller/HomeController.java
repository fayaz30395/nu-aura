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
    public ResponseEntity<List<BirthdayResponse>> getUpcomingBirthdays(
            @Parameter(description = "Number of days to look ahead (default 7)")
            @RequestParam(defaultValue = "7") int days) {
        log.debug("Getting upcoming birthdays for next {} days", days);
        return ResponseEntity.ok(homeService.getUpcomingBirthdays(days));
    }

    @GetMapping("/anniversaries")
    @Operation(summary = "Get upcoming work anniversaries", description = "Returns employees with work anniversaries in the next N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<WorkAnniversaryResponse>> getUpcomingAnniversaries(
            @Parameter(description = "Number of days to look ahead (default 7)")
            @RequestParam(defaultValue = "7") int days) {
        log.debug("Getting upcoming work anniversaries for next {} days", days);
        return ResponseEntity.ok(homeService.getUpcomingWorkAnniversaries(days));
    }

    @GetMapping("/new-joinees")
    @Operation(summary = "Get new joinees", description = "Returns employees who joined in the last N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<NewJoineeResponse>> getNewJoinees(
            @Parameter(description = "Number of days to look back (default 30)")
            @RequestParam(defaultValue = "30") int days) {
        log.debug("Getting new joinees for last {} days", days);
        return ResponseEntity.ok(homeService.getNewJoinees(days));
    }

    @GetMapping("/on-leave")
    @Operation(summary = "Get employees on leave today", description = "Returns employees who are on approved leave today")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<OnLeaveEmployeeResponse>> getEmployeesOnLeaveToday() {
        log.debug("Getting employees on leave today");
        return ResponseEntity.ok(homeService.getEmployeesOnLeaveToday());
    }

    @GetMapping("/attendance/me")
    @Operation(summary = "Get today's attendance status", description = "Returns the current attendance status for the logged-in user")
    @RequiresPermission(ATTENDANCE_VIEW_SELF)
    public ResponseEntity<AttendanceTodayResponse> getAttendanceToday() {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        log.debug("Getting today's attendance for employee {}", employeeId);
        return ResponseEntity.ok(homeService.getAttendanceToday(employeeId));
    }

    @GetMapping("/holidays")
    @Operation(summary = "Get upcoming holidays", description = "Returns holidays in the next N days")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<UpcomingHolidayResponse>> getUpcomingHolidays(
            @Parameter(description = "Number of days to look ahead (default 30)")
            @RequestParam(defaultValue = "30") int days) {
        log.debug("Getting upcoming holidays for next {} days", days);
        return ResponseEntity.ok(homeService.getUpcomingHolidays(days));
    }
}
