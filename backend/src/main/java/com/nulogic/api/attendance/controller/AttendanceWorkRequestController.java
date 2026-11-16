package com.nulogic.api.attendance.controller;

import com.nulogic.application.attendance.service.AttendanceWorkRequestService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.attendance.AttendanceWorkRequest;
import com.nulogic.domain.attendance.AttendanceWorkRequest.RequestType;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

/** Work-from-home, on-duty and remote clock-in requests. */
@RestController
@RequestMapping("/api/v1/attendance/work-requests")
@RequiredArgsConstructor
@Validated
@Tag(name = "Attendance Work Requests", description = "WFH, on-duty and remote clock-in requests")
public class AttendanceWorkRequestController {

    private final AttendanceWorkRequestService service;

    @PostMapping
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<AttendanceWorkRequest> create(@Valid @RequestBody CreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(dto.getRequestType(), dto.getStartDate(), dto.getEndDate(), dto.getReason()));
    }

    @GetMapping("/my")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<Page<AttendanceWorkRequest>> mine(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(service.getMine(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<AttendanceWorkRequest> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(service.cancel(id));
    }

    @GetMapping("/pending")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Page<AttendanceWorkRequest>> pending(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(service.getPending(PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "startDate"))));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<AttendanceWorkRequest> approve(@PathVariable UUID id, @Valid @RequestBody ReviewDto dto) {
        return ResponseEntity.ok(service.approve(id, dto.getNote()));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<AttendanceWorkRequest> reject(@PathVariable UUID id, @Valid @RequestBody ReviewDto dto) {
        return ResponseEntity.ok(service.reject(id, dto.getNote()));
    }

    @Data
    public static class CreateDto {
        @NotNull
        private RequestType requestType;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate startDate;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate endDate;
        @NotBlank
        @Size(max = 500)
        private String reason;
    }

    @Data
    public static class ReviewDto {
        @Size(max = 500)
        private String note;
    }
}
