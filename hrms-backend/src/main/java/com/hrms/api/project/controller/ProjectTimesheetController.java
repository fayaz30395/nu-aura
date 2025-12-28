package com.hrms.api.project.controller;

import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ProjectTimesheetService;
import com.hrms.application.project.service.TimeTrackingReportService;
import com.hrms.application.project.service.TimeTrackingReportService.*;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.project.TimeEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/project-timesheets")
@RequiredArgsConstructor
public class ProjectTimesheetController {

    private final ProjectTimesheetService projectTimesheetService;
    private final TimeTrackingReportService reportService;

    // ==================== Time Entry Endpoints ====================

    @PostMapping("/entries")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<TimeEntryResponse> createTimeEntry(@RequestBody TimeEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectTimesheetService.createTimeEntry(request));
    }

    @PutMapping("/entries/{id}")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<TimeEntryResponse> updateTimeEntry(
            @PathVariable UUID id,
            @RequestBody TimeEntryRequest request) {
        return ResponseEntity.ok(projectTimesheetService.updateTimeEntry(id, request));
    }

    @PatchMapping("/entries/{id}/submit")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<TimeEntryResponse> submitTimeEntry(@PathVariable UUID id) {
        return ResponseEntity.ok(projectTimesheetService.submitTimeEntry(id));
    }

    @PatchMapping("/entries/{id}/approve")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<TimeEntryResponse> approveTimeEntry(
            @PathVariable UUID id,
            @RequestParam UUID approverId) {
        return ResponseEntity.ok(projectTimesheetService.approveTimeEntry(id, approverId));
    }

    @PatchMapping("/entries/{id}/reject")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<TimeEntryResponse> rejectTimeEntry(
            @PathVariable UUID id,
            @RequestParam UUID approverId,
            @RequestParam String reason) {
        return ResponseEntity.ok(projectTimesheetService.rejectTimeEntry(id, approverId, reason));
    }

    @GetMapping("/entries/{id}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<TimeEntryResponse> getTimeEntryById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntryById(id));
    }

    @GetMapping("/entries")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<Page<TimeEntryResponse>> getAllTimeEntries(Pageable pageable) {
        return ResponseEntity.ok(projectTimesheetService.getAllTimeEntries(pageable));
    }

    @GetMapping("/entries/employee/{employeeId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByEmployee(employeeId));
    }

    @GetMapping("/entries/project/{projectId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByProject(projectId));
    }

    @GetMapping("/entries/employee/{employeeId}/date-range")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByDateRange(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByDateRange(employeeId, startDate, endDate));
    }

    @GetMapping("/entries/status/{status}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<TimeEntryResponse>> getTimeEntriesByStatus(
            @PathVariable TimeEntry.TimeEntryStatus status) {
        return ResponseEntity.ok(projectTimesheetService.getTimeEntriesByStatus(status));
    }

    @DeleteMapping("/entries/{id}")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<Void> deleteTimeEntry(@PathVariable UUID id) {
        projectTimesheetService.deleteTimeEntry(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Project Member Endpoints ====================

    @PostMapping("/members")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<ProjectMemberResponse> addProjectMember(@RequestBody ProjectMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectTimesheetService.addProjectMember(request));
    }

    @PutMapping("/members/{id}")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<ProjectMemberResponse> updateProjectMember(
            @PathVariable UUID id,
            @RequestBody ProjectMemberRequest request) {
        return ResponseEntity.ok(projectTimesheetService.updateProjectMember(id, request));
    }

    @GetMapping("/members/{id}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<ProjectMemberResponse> getProjectMemberById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectTimesheetService.getProjectMemberById(id));
    }

    @GetMapping("/members/project/{projectId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<ProjectMemberResponse>> getProjectMembers(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTimesheetService.getProjectMembers(projectId));
    }

    @GetMapping("/members/employee/{employeeId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<ProjectMemberResponse>> getEmployeeProjects(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(projectTimesheetService.getEmployeeProjects(employeeId));
    }

    @GetMapping("/members/project/{projectId}/active")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<ProjectMemberResponse>> getActiveProjectMembers(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTimesheetService.getActiveProjectMembers(projectId));
    }

    @DeleteMapping("/members/{id}")
    @RequiresPermission(PROJECT_CREATE)
    public ResponseEntity<Void> removeProjectMember(@PathVariable UUID id) {
        projectTimesheetService.removeProjectMember(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Report Endpoints ====================

    @GetMapping("/reports/employee/{employeeId}/summary")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<TimeSummaryReport> getEmployeeTimeSummary(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getEmployeeTimeSummary(employeeId, startDate, endDate));
    }

    @GetMapping("/reports/employee/{employeeId}/weekly")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<WeeklyTimeReport> getWeeklyTimeReport(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        return ResponseEntity.ok(reportService.getWeeklyTimeReport(employeeId, weekStartDate));
    }

    @GetMapping("/reports/employee/{employeeId}/monthly")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<MonthlyTimeReport> getMonthlyTimeReport(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(reportService.getMonthlyTimeReport(employeeId, year, month));
    }

    @GetMapping("/reports/project/{projectId}")
    @RequiresPermission({REPORT_VIEW, PROJECT_VIEW})
    public ResponseEntity<ProjectTimeReport> getProjectTimeReport(
            @PathVariable UUID projectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getProjectTimeReport(projectId, startDate, endDate));
    }

    @GetMapping("/reports/employee/{employeeId}/utilization")
    @RequiresPermission({REPORT_VIEW, ANALYTICS_VIEW})
    public ResponseEntity<UtilizationReport> getUtilizationReport(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getUtilizationReport(employeeId, startDate, endDate));
    }

    @GetMapping("/reports/pending-approvals")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<List<TimeEntry>> getPendingApprovals() {
        return ResponseEntity.ok(reportService.getPendingApprovals());
    }

    @GetMapping("/overtime/{employeeId}")
    @RequiresPermission({REPORT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<BigDecimal> calculateOvertimeForDate(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDate) {
        return ResponseEntity.ok(projectTimesheetService.calculateOvertimeForDate(employeeId, workDate));
    }
}
