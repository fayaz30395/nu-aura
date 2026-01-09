package com.nulogic.hrms.attendance;

import com.nulogic.hrms.attendance.dto.AttendanceDayResponse;
import com.nulogic.hrms.attendance.dto.RegularizationRequestCreateRequest;
import com.nulogic.hrms.attendance.dto.RegularizationResponse;
import com.nulogic.hrms.attendance.dto.TimeEntryResponse;
import com.nulogic.hrms.common.SecurityUtils;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/check-in")
    public ResponseEntity<AttendanceDayResponse> checkIn() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.checkIn(userId));
    }

    @PostMapping("/check-out")
    public ResponseEntity<AttendanceDayResponse> checkOut() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.checkOut(userId));
    }

    @GetMapping("/days")
    public ResponseEntity<Page<AttendanceDayResponse>> listDays(@PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.listDays(userId, pageable));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<Page<AttendanceDayResponse>> listByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.listByDate(userId, date, pageable));
    }

    @GetMapping("/my-attendance")
    public ResponseEntity<List<AttendanceDayResponse>> listMyAttendance(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "employeeId", required = false) UUID employeeId) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.listDaysInRange(userId, startDate, endDate));
    }

    @GetMapping("/my-time-entries")
    public ResponseEntity<List<TimeEntryResponse>> listMyTimeEntries(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "employeeId", required = false) UUID employeeId) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.listTimeEntries(userId, date));
    }

    @PostMapping("/regularizations")
    public ResponseEntity<RegularizationResponse> requestRegularization(
            @Valid @RequestBody RegularizationRequestCreateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.requestRegularization(userId, request));
    }

    @GetMapping("/regularizations")
    public ResponseEntity<Page<RegularizationResponse>> listRegularizations(
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.listRegularizations(userId, pageable));
    }

    @PutMapping("/regularizations/{id}/approve")
    public ResponseEntity<RegularizationResponse> approve(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.approve(userId, id));
    }

    @PutMapping("/regularizations/{id}/reject")
    public ResponseEntity<RegularizationResponse> reject(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(attendanceService.reject(userId, id));
    }
}
