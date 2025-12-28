package com.hrms.api.timetracking.controller;

import com.hrms.api.timetracking.dto.CreateTimeEntryRequest;
import com.hrms.api.timetracking.dto.TimeEntryDto;
import com.hrms.application.timetracking.service.TimeTrackingService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.timetracking.TimeEntry.TimeEntryStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/time-tracking")
@RequiredArgsConstructor
@Tag(name = "Time Tracking", description = "Time entry and billing management")
public class TimeTrackingController {

    private final TimeTrackingService timeTrackingService;

    @PostMapping("/entries")
    @RequiresPermission(Permission.TIME_TRACKING_CREATE)
    @Operation(summary = "Create time entry", description = "Log a new time entry")
    public ResponseEntity<TimeEntryDto> createEntry(
            @Valid @RequestBody CreateTimeEntryRequest request
    ) {
        return ResponseEntity.ok(timeTrackingService.createEntry(request));
    }

    @PutMapping("/entries/{id}")
    @RequiresPermission(Permission.TIME_TRACKING_UPDATE)
    @Operation(summary = "Update time entry", description = "Update an existing time entry")
    public ResponseEntity<TimeEntryDto> updateEntry(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTimeEntryRequest request
    ) {
        return ResponseEntity.ok(timeTrackingService.updateEntry(id, request));
    }

    @GetMapping("/entries/{id}")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW)
    @Operation(summary = "Get time entry", description = "Get time entry by ID")
    public ResponseEntity<TimeEntryDto> getEntry(@PathVariable UUID id) {
        return ResponseEntity.ok(timeTrackingService.getById(id));
    }

    @DeleteMapping("/entries/{id}")
    @RequiresPermission(Permission.TIME_TRACKING_UPDATE)
    @Operation(summary = "Delete time entry", description = "Delete a draft time entry")
    public ResponseEntity<Void> deleteEntry(@PathVariable UUID id) {
        timeTrackingService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/entries/{id}/submit")
    @RequiresPermission(Permission.TIME_TRACKING_CREATE)
    @Operation(summary = "Submit time entry", description = "Submit time entry for approval")
    public ResponseEntity<TimeEntryDto> submitEntry(@PathVariable UUID id) {
        return ResponseEntity.ok(timeTrackingService.submitEntry(id));
    }

    @PostMapping("/entries/submit-bulk")
    @RequiresPermission(Permission.TIME_TRACKING_CREATE)
    @Operation(summary = "Submit multiple entries", description = "Submit multiple time entries for approval")
    public ResponseEntity<List<TimeEntryDto>> submitMultiple(@RequestBody List<UUID> entryIds) {
        return ResponseEntity.ok(timeTrackingService.submitMultiple(entryIds));
    }

    @PostMapping("/entries/{id}/approve")
    @RequiresPermission(Permission.TIME_TRACKING_APPROVE)
    @Operation(summary = "Approve time entry", description = "Approve a submitted time entry")
    public ResponseEntity<TimeEntryDto> approveEntry(@PathVariable UUID id) {
        return ResponseEntity.ok(timeTrackingService.approveEntry(id));
    }

    @PostMapping("/entries/approve-bulk")
    @RequiresPermission(Permission.TIME_TRACKING_APPROVE)
    @Operation(summary = "Approve multiple entries", description = "Approve multiple time entries")
    public ResponseEntity<List<TimeEntryDto>> approveMultiple(@RequestBody List<UUID> entryIds) {
        return ResponseEntity.ok(timeTrackingService.approveMultiple(entryIds));
    }

    @PostMapping("/entries/{id}/reject")
    @RequiresPermission(Permission.TIME_TRACKING_APPROVE)
    @Operation(summary = "Reject time entry", description = "Reject a submitted time entry")
    public ResponseEntity<TimeEntryDto> rejectEntry(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body
    ) {
        String reason = body.get("reason");
        return ResponseEntity.ok(timeTrackingService.rejectEntry(id, reason));
    }

    @GetMapping("/entries/my")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW)
    @Operation(summary = "Get my time entries", description = "Get current user's time entries")
    public ResponseEntity<Page<TimeEntryDto>> getMyEntries(Pageable pageable) {
        return ResponseEntity.ok(timeTrackingService.getMyEntries(pageable));
    }

    @GetMapping("/entries/my/range")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW)
    @Operation(summary = "Get my entries for date range", description = "Get current user's time entries for a date range")
    public ResponseEntity<List<TimeEntryDto>> getMyEntriesForRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(timeTrackingService.getMyEntriesForDateRange(startDate, endDate));
    }

    @GetMapping("/entries/pending")
    @RequiresPermission(Permission.TIME_TRACKING_APPROVE)
    @Operation(summary = "Get pending approvals", description = "Get time entries pending approval")
    public ResponseEntity<Page<TimeEntryDto>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(timeTrackingService.getPendingApprovals(pageable));
    }

    @GetMapping("/entries")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW_ALL)
    @Operation(summary = "Get all time entries", description = "Get all time entries with optional status filter")
    public ResponseEntity<Page<TimeEntryDto>> getAllEntries(
            @RequestParam(required = false) TimeEntryStatus status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(timeTrackingService.getAllEntries(status, pageable));
    }

    @GetMapping("/entries/project/{projectId}")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW_ALL)
    @Operation(summary = "Get entries by project", description = "Get all time entries for a project")
    public ResponseEntity<List<TimeEntryDto>> getEntriesByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(timeTrackingService.getEntriesByProject(projectId));
    }

    @GetMapping("/summary")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW)
    @Operation(summary = "Get time summary", description = "Get time summary for current user")
    public ResponseEntity<Map<String, Object>> getTimeSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(timeTrackingService.getTimeSummary(startDate, endDate));
    }

    @GetMapping("/summary/project/{projectId}")
    @RequiresPermission(Permission.TIME_TRACKING_VIEW_ALL)
    @Operation(summary = "Get project time summary", description = "Get billing summary for a project")
    public ResponseEntity<Map<String, Object>> getProjectTimeSummary(@PathVariable UUID projectId) {
        return ResponseEntity.ok(timeTrackingService.getProjectTimeSummary(projectId));
    }
}
