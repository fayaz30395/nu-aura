package com.nulogic.api.project.controller;

import com.nulogic.api.project.dto.ProjectMemberRequest;
import com.nulogic.api.project.dto.ProjectMemberResponse;
import com.nulogic.api.project.dto.TimeEntryRequest;
import com.nulogic.api.project.dto.TimeEntryResponse;
import com.nulogic.application.project.service.ProjectTimesheetService;
import com.nulogic.application.project.service.TimeTrackingReportService;
import com.nulogic.application.project.service.TimeTrackingReportService.*;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.project.TimeEntry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static com.nulogic.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/project-timesheets")
@RequiredArgsConstructor
@Validated
@Tag(name = "Project Timesheets", description = "Project time entries, project member management, and timesheet reporting")
public class ProjectTimesheetController {

    private final ProjectTimesheetService projectTimesheetService;
    private final TimeTrackingReportService reportService;

    // ==================== Time Entry Endpoints ====================

    @PostMapping("/entries")
    @RequiresPermission(TIMESHEET_SUBMIT)
    @Operation(summary = "Create time entry", description = "Log a new time entry against a project task")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Time entry created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires TIMESHEET:SUBMIT permission")
    })
    public ResponseEntity<TimeEntryResponse> createTimeEntry(@Valid @RequestBody TimeEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectTimesheetService.createTimeEntry(request));
    }

    @PutMapping("/entries/{id}")
    @RequiresPermission(TIMESHEET_SUBMIT)
    @Operation(summary = "Update time entry", description = "Mutate a draft time entry (only owner)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Time entry updated successfully"),
            @ApiResponse(responseCode = "404", description = "Time entry not found"),
            @ApiResponse(responseCode = "409", description = "Entry cannot be edited in current status")
    })
    public ResponseEntity<TimeEntryResponse> updateTimeEntry(
            @Parameter(description = "Time entry UUID") @PathVariable UUID id,
            @Valid @RequestBody TimeEntryRequest request) {
        return ResponseEntity.ok(projectTimesheetService.updateTimeEntry(id, request));
    }

    @PatchMapping("/entries/{id}/submit")
    @RequiresPermission(TIMESHEET_SUBMIT)
    @Operation(summary = "Submit time entry for approval",
            description = "Transition the entry to SUBMITTED, locking edits and queuing it for approval")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Time entry submitted successfully"),
            @ApiResponse(responseCode = "404", description = "Time entry not found")
    })
    public ResponseEntity<TimeEntryResponse> submitTimeEntry(
            @Parameter(description = "Time entry UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(projectTimesheetService.submitTimeEntry(id));
    }

    @PatchMapping("/entries/{id}/approve")
    @RequiresPermission(TIMESHEET_APPROVE)
    @Operation(summary = "Approve time entry",
            description = "Approve a submitted time entry (manager / approver only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Time entry approved successfully"),
            @ApiResponse(responseCode = "404", description = "Time entry not found")
    })
    public ResponseEntity<TimeEntryResponse> approveTimeEntry(
            @Parameter(description = "Time entry UUID") @PathVariable UUID id) {
        UUID approverId = SecurityContext.getCurrentEmployeeId() != null
                ? SecurityContext.getCurrentEmployeeId() : SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(projectTimesheetService.approveTimeEntry(id, approverId));
    }

    @PatchMapping("/entries/{id}/reject")
    @RequiresPermission(TIMESHEET_APPROVE)
    @Operation(summary = "Reject time entry",
            description = "Reject a submitted time entry with a mandatory reason")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Time entry rejected successfully"),
            @ApiResponse(responseCode = "404", description = "Time entry not found")
    })
    public ResponseEntity<TimeEntryResponse> rejectTimeEntry(
            @Parameter(description = "Time entry UUID") @PathVariable UUID id,
            @Parameter(description = "Rejection reason (max 1000 chars)") @NotBlank @Size(max = 1000) @RequestParam String reason) {
        UUID approverId = SecurityContext.getCurrentEmployeeId() != null
                ? SecurityContext.getCurrentEmployeeId() : SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(projectTimesheetService.rejectTimeEntry(id, approverId, reason));
    }

    @GetMapping("/entries/{id}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "Get time entry by ID", description = "Returns a single time entry by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Time entry found"),
            @ApiResponse(responseCode = "404", description = "Time entry not found")
    })
    public ResponseEntity<TimeEntryResponse> getTimeEntryById(
            @Parameter(description = "Time entry UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntryById(id));
    }

    @GetMapping("/entries")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List all time entries",
            description = "Returns a paginated list of all time entries the caller can view")
    @ApiResponse(responseCode = "200", description = "Time entries retrieved successfully")
    public ResponseEntity<Page<TimeEntryResponse>> getAllTimeEntries(Pageable pageable) {
        return ResponseEntity.ok(projectTimesheetService.getAllTimeEntries(pageable));
    }

    @GetMapping("/entries/employee/{employeeId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List time entries by employee",
            description = "Returns all time entries logged by the specified employee")
    @ApiResponse(responseCode = "200", description = "Time entries retrieved successfully")
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByEmployee(employeeId));
    }

    @GetMapping("/entries/project/{projectId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List time entries by project",
            description = "Returns all time entries logged against the specified project")
    @ApiResponse(responseCode = "200", description = "Time entries retrieved successfully")
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByProject(
            @Parameter(description = "Project UUID") @PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByProject(projectId));
    }

    @GetMapping("/entries/employee/{employeeId}/date-range")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List time entries by employee and date range",
            description = "Filter an employee's time entries by [startDate, endDate]")
    @ApiResponse(responseCode = "200", description = "Time entries retrieved successfully")
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByDateRange(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Range start date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Range end date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByDateRange(employeeId, startDate, endDate));
    }

    @GetMapping("/entries/status/{status}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List time entries by status",
            description = "Filter time entries by status (DRAFT, SUBMITTED, APPROVED, REJECTED)")
    @ApiResponse(responseCode = "200", description = "Time entries retrieved successfully")
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByStatus(
            @Parameter(description = "Time entry status") @PathVariable TimeEntry.TimeEntryStatus status) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByStatus(status));
    }

    @DeleteMapping("/entries/{id}")
    @RequiresPermission(TIMESHEET_SUBMIT)
    @Operation(summary = "Delete time entry", description = "Soft-delete a draft time entry (owner only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Time entry deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Time entry not found"),
            @ApiResponse(responseCode = "409", description = "Entry cannot be deleted in current status")
    })
    public ResponseEntity<Void> deleteTimeEntry(
            @Parameter(description = "Time entry UUID") @PathVariable UUID id) {
        projectTimesheetService.deleteTimeEntry(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Project Member Endpoints ====================

    @PostMapping("/members")
    @RequiresPermission(PROJECT_CREATE)
    @Operation(summary = "Add project member", description = "Assign an employee as a project team member")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Member added successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public ResponseEntity<ProjectMemberResponse> addProjectMember(@Valid @RequestBody ProjectMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectTimesheetService.addProjectMember(request));
    }

    @PutMapping("/members/{id}")
    @RequiresPermission(PROJECT_CREATE)
    @Operation(summary = "Update project member", description = "Mutate role, allocation, or end date for a project member")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Member updated successfully"),
            @ApiResponse(responseCode = "404", description = "Member not found")
    })
    public ResponseEntity<ProjectMemberResponse> updateProjectMember(
            @Parameter(description = "Project member UUID") @PathVariable UUID id,
            @Valid @RequestBody ProjectMemberRequest request) {
        return ResponseEntity.ok(projectTimesheetService.updateProjectMember(id, request));
    }

    @GetMapping("/members/{id}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "Get project member by ID", description = "Returns a single project member by their UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Member found"),
            @ApiResponse(responseCode = "404", description = "Member not found")
    })
    public ResponseEntity<ProjectMemberResponse> getProjectMemberById(
            @Parameter(description = "Project member UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(projectTimesheetService.getProjectMemberById(id));
    }

    @GetMapping("/members/project/{projectId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List members of a project",
            description = "Returns all members (active and inactive) of the specified project")
    @ApiResponse(responseCode = "200", description = "Members retrieved successfully")
    public ResponseEntity<List<ProjectMemberResponse>> getProjectMembers(
            @Parameter(description = "Project UUID") @PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTimesheetService.getProjectMembers(projectId));
    }

    @GetMapping("/members/employee/{employeeId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List projects for an employee",
            description = "Returns all projects the specified employee is a member of")
    @ApiResponse(responseCode = "200", description = "Projects retrieved successfully")
    public ResponseEntity<List<ProjectMemberResponse>> getEmployeeProjects(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        return ResponseEntity.ok(projectTimesheetService.getEmployeeProjects(employeeId));
    }

    @GetMapping("/members/project/{projectId}/active")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "List active members of a project",
            description = "Returns only currently active members of the specified project")
    @ApiResponse(responseCode = "200", description = "Active members retrieved successfully")
    public ResponseEntity<List<ProjectMemberResponse>> getActiveProjectMembers(
            @Parameter(description = "Project UUID") @PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTimesheetService.getActiveProjectMembers(projectId));
    }

    @DeleteMapping("/members/{id}")
    @RequiresPermission(PROJECT_CREATE)
    @Operation(summary = "Remove project member", description = "Remove an employee from a project's team")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Member removed successfully"),
            @ApiResponse(responseCode = "404", description = "Member not found")
    })
    public ResponseEntity<Void> removeProjectMember(
            @Parameter(description = "Project member UUID") @PathVariable UUID id) {
        projectTimesheetService.removeProjectMember(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Report Endpoints ====================

    @GetMapping("/reports/employee/{employeeId}/summary")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "Get employee time summary",
            description = "Aggregate time-tracking summary for an employee over a date range")
    @ApiResponse(responseCode = "200", description = "Summary retrieved successfully")
    public ResponseEntity<TimeSummaryReport> getEmployeeTimeSummary(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Range start date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Range end date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getEmployeeTimeSummary(employeeId, startDate, endDate));
    }

    @GetMapping("/reports/employee/{employeeId}/weekly")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "Get weekly time report",
            description = "Returns a per-day breakdown for the week starting at the given Monday")
    @ApiResponse(responseCode = "200", description = "Weekly report retrieved successfully")
    public ResponseEntity<WeeklyTimeReport> getWeeklyTimeReport(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Week start date (ISO, Monday)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        return ResponseEntity.ok(reportService.getWeeklyTimeReport(employeeId, weekStartDate));
    }

    @GetMapping("/reports/employee/{employeeId}/monthly")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "Get monthly time report",
            description = "Returns a per-week breakdown for the specified year and month")
    @ApiResponse(responseCode = "200", description = "Monthly report retrieved successfully")
    public ResponseEntity<MonthlyTimeReport> getMonthlyTimeReport(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Calendar year", example = "2026") @RequestParam int year,
            @Parameter(description = "Calendar month (1-12)", example = "5") @RequestParam int month) {
        return ResponseEntity.ok(reportService.getMonthlyTimeReport(employeeId, year, month));
    }

    @GetMapping("/reports/project/{projectId}")
    @RequiresPermission({REPORT_VIEW, PROJECT_VIEW})
    @Operation(summary = "Get project time report",
            description = "Aggregate time-tracking metrics for a project over a date range")
    @ApiResponse(responseCode = "200", description = "Project report retrieved successfully")
    public ResponseEntity<ProjectTimeReport> getProjectTimeReport(
            @Parameter(description = "Project UUID") @PathVariable UUID projectId,
            @Parameter(description = "Range start date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Range end date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getProjectTimeReport(projectId, startDate, endDate));
    }

    @GetMapping("/reports/employee/{employeeId}/utilization")
    @RequiresPermission({REPORT_VIEW, ANALYTICS_VIEW})
    @Operation(summary = "Get employee utilization report",
            description = "Returns billable vs non-billable utilization metrics for an employee over a date range")
    @ApiResponse(responseCode = "200", description = "Utilization report retrieved successfully")
    public ResponseEntity<UtilizationReport> getUtilizationReport(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Range start date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Range end date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getUtilizationReport(employeeId, startDate, endDate));
    }

    @GetMapping("/reports/pending-approvals")
    @RequiresPermission(TIMESHEET_APPROVE)
    @Operation(summary = "List pending approval entries",
            description = "Returns all submitted time entries awaiting the current approver's action")
    @ApiResponse(responseCode = "200", description = "Pending approvals retrieved successfully")
    public ResponseEntity<List<TimeEntry>> getPendingApprovals() {
        return ResponseEntity.ok(reportService.getPendingApprovals());
    }

    @GetMapping("/overtime/{employeeId}")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    @Operation(summary = "Calculate overtime for date",
            description = "Returns calculated overtime hours for an employee on a specific work date")
    @ApiResponse(responseCode = "200", description = "Overtime calculated successfully")
    public ResponseEntity<BigDecimal> calculateOvertimeForDate(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            @Parameter(description = "Work date (ISO)") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDate) {
        return ResponseEntity.ok(projectTimesheetService.calculateOvertimeForDate(employeeId, workDate));
    }
}
