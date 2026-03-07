package com.hrms.api.shift.controller;

import com.hrms.application.shift.service.ShiftSwapService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.shift.ShiftSwapRequest;
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
@RequestMapping("/api/v1/shift-swaps")
@RequiredArgsConstructor
@Slf4j
public class ShiftSwapController {

    private final ShiftSwapService shiftSwapService;

    // ========== Employee endpoints ==========

    @PostMapping
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<ShiftSwapRequest> submitRequest(
            @Valid @RequestBody SwapRequestDto dto) {
        log.info("Shift swap request from employee {}", dto.getRequesterEmployeeId());
        ShiftSwapRequest result = shiftSwapService.submitSwapRequest(
                dto.getRequesterEmployeeId(),
                dto.getRequesterAssignmentId(),
                dto.getRequesterShiftDate(),
                dto.getTargetEmployeeId(),
                dto.getTargetAssignmentId(),
                dto.getTargetShiftDate(),
                ShiftSwapRequest.SwapType.valueOf(dto.getSwapType()),
                dto.getReason());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/{requestId}/accept")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<ShiftSwapRequest> acceptRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody TargetResponseDto dto) {
        return ResponseEntity.ok(shiftSwapService.acceptByTarget(requestId, dto.getEmployeeId()));
    }

    @PostMapping("/{requestId}/decline")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<ShiftSwapRequest> declineRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody TargetResponseDto dto) {
        return ResponseEntity.ok(shiftSwapService.declineByTarget(requestId, dto.getEmployeeId()));
    }

    @PostMapping("/{requestId}/cancel")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<ShiftSwapRequest> cancelRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody TargetResponseDto dto) {
        return ResponseEntity.ok(shiftSwapService.cancelRequest(requestId, dto.getEmployeeId()));
    }

    @GetMapping("/my-requests/{employeeId}")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<Page<ShiftSwapRequest>> getMyRequests(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(shiftSwapService.getMyRequests(
                employeeId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "requestedAt"))));
    }

    @GetMapping("/incoming/{employeeId}")
    @RequiresPermission(Permission.ATTENDANCE_REGULARIZE)
    public ResponseEntity<List<ShiftSwapRequest>> getIncomingRequests(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(shiftSwapService.getIncomingRequests(employeeId));
    }

    // ========== Manager endpoints ==========

    @GetMapping("/pending-approval")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<List<ShiftSwapRequest>> getPendingApproval() {
        return ResponseEntity.ok(shiftSwapService.getRequestsPendingApproval());
    }

    @GetMapping
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    public ResponseEntity<Page<ShiftSwapRequest>> getAllRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(shiftSwapService.getAllRequests(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "requestedAt"))));
    }

    @PostMapping("/{requestId}/approve")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftSwapRequest> approve(
            @PathVariable UUID requestId,
            @Valid @RequestBody ManagerActionDto dto) {
        log.info("Manager {} approving shift swap {}", dto.getManagerId(), requestId);
        return ResponseEntity.ok(shiftSwapService.approveByManager(requestId, dto.getManagerId()));
    }

    @PostMapping("/{requestId}/reject")
    @RequiresPermission(Permission.ATTENDANCE_APPROVE)
    public ResponseEntity<ShiftSwapRequest> reject(
            @PathVariable UUID requestId,
            @Valid @RequestBody ManagerActionDto dto) {
        log.info("Manager {} rejecting shift swap {}", dto.getManagerId(), requestId);
        return ResponseEntity.ok(shiftSwapService.rejectByManager(requestId, dto.getManagerId(), dto.getReason()));
    }

    // ========== DTOs ==========

    @Data
    public static class SwapRequestDto {
        @NotNull private UUID requesterEmployeeId;
        @NotNull private UUID requesterAssignmentId;
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) private LocalDate requesterShiftDate;
        private UUID targetEmployeeId;
        private UUID targetAssignmentId;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) private LocalDate targetShiftDate;
        @NotNull private String swapType;  // SWAP, GIVE_AWAY, PICK_UP
        private String reason;
    }

    @Data
    public static class TargetResponseDto {
        @NotNull private UUID employeeId;
    }

    @Data
    public static class ManagerActionDto {
        @NotNull private UUID managerId;
        private String reason;
    }
}
