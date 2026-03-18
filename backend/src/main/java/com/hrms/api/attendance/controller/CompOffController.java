package com.hrms.api.attendance.controller;

import com.hrms.application.attendance.service.CompOffService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.CompOffRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * REST controller for compensatory off (comp-off) management.
 * Handles comp-off requests, approvals, and balance tracking.
 */
@RestController
@RequestMapping("/api/v1/comp-off")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Compensatory Off", description = "Manage comp-off requests for overtime work compensation")
public class CompOffController {

    private final CompOffService compOffService;

    // ========== Employee: request comp-off ==========

    @Operation(summary = "Request comp-off for overtime work",
            description = "Creates a comp-off request for a specific date when overtime was worked. " +
                    "Requires minimum overtime threshold (configurable, default 60 min) to qualify.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Comp-off request created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request or overtime below threshold"),
            @ApiResponse(responseCode = "404", description = "Attendance record not found for the date"),
            @ApiResponse(responseCode = "409", description = "Comp-off request already exists for this date")
    })
    @PostMapping("/request")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<CompOffRequest> requestCompOff(
            @Valid @RequestBody CompOffRequestDto dto) {
        log.info("Comp-off request for employee={} date={}", dto.getEmployeeId(), dto.getAttendanceDate());
        CompOffRequest request = compOffService.requestCompOff(
                dto.getEmployeeId(), dto.getAttendanceDate(), dto.getReason());
        return ResponseEntity.status(HttpStatus.CREATED).body(request);
    }

    @Operation(summary = "Get employee's comp-off history",
            description = "Retrieves paginated comp-off request history for a specific employee.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "History retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM})
    public ResponseEntity<Page<CompOffRequest>> getEmployeeHistory(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(compOffService.getEmployeeCompOffHistory(
                employeeId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "attendanceDate"))));
    }

    @Operation(summary = "Get my pending comp-off requests",
            description = "Retrieves all pending comp-off requests for the specified employee.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pending requests retrieved successfully")
    })
    @GetMapping("/my-pending/{employeeId}")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<List<CompOffRequest>> getMyPending(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        return ResponseEntity.ok(compOffService.getMyPendingRequests(employeeId));
    }

    // ========== Manager/HR: review ==========

    @Operation(summary = "Get all pending comp-off requests",
            description = "Retrieves paginated list of all pending comp-off requests for review. " +
                    "Used by managers and HR to process comp-off approvals.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pending requests retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
    @GetMapping("/pending")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<Page<CompOffRequest>> getPendingRequests(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(compOffService.getPendingRequests(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "attendanceDate"))));
    }

    @Operation(summary = "Approve a comp-off request",
            description = "Approves a pending comp-off request and credits the leave balance. " +
                    "The comp-off days are added to the employee's COMP_OFF leave type balance.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Request approved and leave credited"),
            @ApiResponse(responseCode = "400", description = "Request is not in PENDING state"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Request not found")
    })
    @PostMapping("/{requestId}/approve")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<CompOffRequest> approve(
            @Parameter(description = "Comp-off request UUID") @PathVariable UUID requestId,
            @Valid @RequestBody ReviewDto dto) {
        log.info("Approving comp-off request {}", requestId);
        return ResponseEntity.ok(compOffService.approveCompOff(requestId, dto.getReviewerId(), dto.getNote()));
    }

    @Operation(summary = "Reject a comp-off request",
            description = "Rejects a pending comp-off request. No leave balance is credited.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Request rejected successfully"),
            @ApiResponse(responseCode = "400", description = "Request is not in PENDING state"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Request not found")
    })
    @PostMapping("/{requestId}/reject")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<CompOffRequest> reject(
            @Parameter(description = "Comp-off request UUID") @PathVariable UUID requestId,
            @Valid @RequestBody ReviewDto dto) {
        log.info("Rejecting comp-off request {}", requestId);
        return ResponseEntity.ok(compOffService.rejectCompOff(requestId, dto.getReviewerId(), dto.getNote()));
    }

    // ========== DTOs ==========

    @Data
    @Schema(description = "Request payload for creating a comp-off request")
    public static class CompOffRequestDto {
        @NotNull
        @Schema(description = "Employee requesting comp-off", example = "550e8400-e29b-41d4-a716-446655440000")
        private UUID employeeId;

        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        @Schema(description = "Date when overtime was worked", example = "2024-03-15")
        private LocalDate attendanceDate;

        @Schema(description = "Reason for comp-off request", example = "Worked on critical production deployment")
        private String reason;
    }

    @Data
    @Schema(description = "Request payload for approving or rejecting a comp-off request")
    public static class ReviewDto {
        @NotNull
        @Schema(description = "UUID of the reviewer (manager/HR)", example = "550e8400-e29b-41d4-a716-446655440001")
        private UUID reviewerId;

        @Schema(description = "Optional note from reviewer", example = "Approved as per project requirements")
        private String note;
    }
}
