package com.hrms.api.attendance.controller;

import com.hrms.application.attendance.service.CompOffService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.CompOffRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/comp-off")
@RequiredArgsConstructor
@Slf4j
public class CompOffController {

    private final CompOffService compOffService;

    // ========== Employee: request comp-off ==========

    @PostMapping("/request")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<CompOffRequest> requestCompOff(
            @Valid @RequestBody CompOffRequestDto dto) {
        log.info("Comp-off request for employee={} date={}", dto.getEmployeeId(), dto.getAttendanceDate());
        CompOffRequest request = compOffService.requestCompOff(
                dto.getEmployeeId(), dto.getAttendanceDate(), dto.getReason());
        return ResponseEntity.status(HttpStatus.CREATED).body(request);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<CompOffRequest>> getEmployeeHistory(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(compOffService.getEmployeeCompOffHistory(
                employeeId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "attendanceDate"))));
    }

    @GetMapping("/my-pending/{employeeId}")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<List<CompOffRequest>> getMyPending(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(compOffService.getMyPendingRequests(employeeId));
    }

    // ========== Manager/HR: review ==========

    @GetMapping("/pending")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Page<CompOffRequest>> getPendingRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(compOffService.getPendingRequests(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "attendanceDate"))));
    }

    @PostMapping("/{requestId}/approve")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<CompOffRequest> approve(
            @PathVariable UUID requestId,
            @Valid @RequestBody ReviewDto dto) {
        log.info("Approving comp-off request {}", requestId);
        return ResponseEntity.ok(compOffService.approveCompOff(requestId, dto.getReviewerId(), dto.getNote()));
    }

    @PostMapping("/{requestId}/reject")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<CompOffRequest> reject(
            @PathVariable UUID requestId,
            @Valid @RequestBody ReviewDto dto) {
        log.info("Rejecting comp-off request {}", requestId);
        return ResponseEntity.ok(compOffService.rejectCompOff(requestId, dto.getReviewerId(), dto.getNote()));
    }

    // ========== DTOs ==========

    @Data
    public static class CompOffRequestDto {
        @NotNull
        private UUID employeeId;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate attendanceDate;
        private String reason;
    }

    @Data
    public static class ReviewDto {
        @NotNull
        private UUID reviewerId;
        private String note;
    }
}
