package com.hrms.api.attendance.controller;

import com.hrms.api.attendance.dto.RestrictedHolidayDTOs.*;
import com.hrms.application.attendance.service.RestrictedHolidayService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.RestrictedHolidaySelection.SelectionStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Restricted Holidays feature.
 *
 * Restricted holidays are optional holidays that employees can choose from a predefined list.
 * Each employee gets a configurable quota per year.
 *
 * <ul>
 *   <li>Admin: CRUD holidays, manage policy</li>
 *   <li>Employee: browse & select holidays, view own selections</li>
 *   <li>Manager: approve/reject selections</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/restricted-holidays")
@RequiredArgsConstructor
@Tag(name = "Restricted Holidays", description = "Manage optional/restricted holidays and employee selections")
public class RestrictedHolidayController {

    private final RestrictedHolidayService service;

    // ═══════════════════════════ Holiday CRUD (Admin) ═══════════════════════════

    @Operation(summary = "List restricted holidays",
            description = "Returns all restricted holidays. Optionally filter by year.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Holidays retrieved successfully")
    })
    @GetMapping
    public ResponseEntity<Page<HolidayResponse>> listHolidays(
            @Parameter(description = "Filter by year") @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getAllHolidays(year,
                PageRequest.of(page, size, Sort.by("holidayDate").ascending())));
    }

    @Operation(summary = "Get available restricted holidays for a year",
            description = "Returns only active restricted holidays for the given year. Used by employees to browse.")
    @GetMapping("/available")
    public ResponseEntity<List<HolidayResponse>> getAvailableHolidays(
            @Parameter(description = "Year", example = "2026")
            @RequestParam(defaultValue = "#{T(java.time.Year).now().getValue()}") Integer year) {
        return ResponseEntity.ok(service.getAvailableHolidays(year));
    }

    @Operation(summary = "Get restricted holiday by ID")
    @GetMapping("/{id}")
    public ResponseEntity<HolidayResponse> getHoliday(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getHolidayById(id));
    }

    @Operation(summary = "Create a restricted holiday",
            description = "Admin: Create a new restricted holiday entry. Requires LEAVE:MANAGE permission.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Holiday created"),
            @ApiResponse(responseCode = "400", description = "Invalid data or duplicate date"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    @PostMapping
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<HolidayResponse> createHoliday(@Valid @RequestBody HolidayRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createHoliday(request));
    }

    @Operation(summary = "Update a restricted holiday")
    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<HolidayResponse> updateHoliday(
            @PathVariable UUID id,
            @Valid @RequestBody HolidayRequest request) {
        return ResponseEntity.ok(service.updateHoliday(id, request));
    }

    @Operation(summary = "Delete a restricted holiday (soft-delete)")
    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Void> deleteHoliday(@PathVariable UUID id) {
        service.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════ Selections ═══════════════════════════

    @Operation(summary = "Select a restricted holiday",
            description = "Employee selects a restricted holiday. Subject to quota and approval policy.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Selection created"),
            @ApiResponse(responseCode = "400", description = "Quota exceeded, duplicate, or holiday not available")
    })
    @PostMapping("/{holidayId}/select")
    public ResponseEntity<SelectionResponse> selectHoliday(@PathVariable UUID holidayId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.selectHoliday(holidayId));
    }

    @Operation(summary = "Get my restricted holiday selections",
            description = "Returns the current employee's selections for the given year.")
    @GetMapping("/selections/me")
    public ResponseEntity<List<SelectionResponse>> getMySelections(
            @RequestParam(defaultValue = "#{T(java.time.Year).now().getValue()}") Integer year) {
        return ResponseEntity.ok(service.getMySelections(year));
    }

    @Operation(summary = "Get my restricted holiday summary",
            description = "Returns quota usage summary for the current employee.")
    @GetMapping("/summary/me")
    public ResponseEntity<EmployeeSummaryResponse> getMySummary(
            @RequestParam(defaultValue = "#{T(java.time.Year).now().getValue()}") Integer year) {
        return ResponseEntity.ok(service.getEmployeeSummary(year));
    }

    @Operation(summary = "Cancel a selection",
            description = "Employee cancels their own pending or approved selection.")
    @PostMapping("/selections/{selectionId}/cancel")
    public ResponseEntity<SelectionResponse> cancelSelection(@PathVariable UUID selectionId) {
        return ResponseEntity.ok(service.cancelSelection(selectionId));
    }

    @Operation(summary = "List selections by status (manager/admin view)",
            description = "Returns selections filtered by status. Requires LEAVE:APPROVE permission.")
    @GetMapping("/selections")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<Page<SelectionResponse>> getSelectionsByStatus(
            @RequestParam(defaultValue = "PENDING") SelectionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getSelectionsByStatus(status,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @Operation(summary = "List selections for a specific holiday",
            description = "Returns all employee selections for a specific restricted holiday.")
    @GetMapping("/{holidayId}/selections")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<Page<SelectionResponse>> getSelectionsByHoliday(
            @PathVariable UUID holidayId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getSelectionsByHoliday(holidayId,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @Operation(summary = "Approve a selection",
            description = "Manager approves a pending restricted holiday selection. Requires LEAVE:APPROVE permission.")
    @PostMapping("/selections/{selectionId}/approve")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<SelectionResponse> approveSelection(@PathVariable UUID selectionId) {
        return ResponseEntity.ok(service.approveSelection(selectionId));
    }

    @Operation(summary = "Reject a selection",
            description = "Manager rejects a pending restricted holiday selection. Requires LEAVE:APPROVE permission.")
    @PostMapping("/selections/{selectionId}/reject")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<SelectionResponse> rejectSelection(
            @PathVariable UUID selectionId,
            @RequestBody(required = false) SelectionActionRequest request) {
        String reason = request != null ? request.getRejectionReason() : null;
        return ResponseEntity.ok(service.rejectSelection(selectionId, reason));
    }

    // ═══════════════════════════ Policy ═══════════════════════════════

    @Operation(summary = "Get restricted holiday policy for a year",
            description = "Returns the tenant's policy (quota, approval required). Returns defaults if not configured.")
    @GetMapping("/policy")
    public ResponseEntity<PolicyResponse> getPolicy(
            @RequestParam(defaultValue = "#{T(java.time.Year).now().getValue()}") Integer year) {
        return ResponseEntity.ok(service.getPolicy(year));
    }

    @Operation(summary = "Create or update restricted holiday policy",
            description = "Admin sets the policy for a given year. Requires LEAVE:MANAGE permission.")
    @PutMapping("/policy")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<PolicyResponse> savePolicy(@Valid @RequestBody PolicyRequest request) {
        return ResponseEntity.ok(service.savePolicy(request));
    }
}
