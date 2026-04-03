package com.hrms.api.psa.controller;

import com.hrms.application.psa.service.PSAService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.psa.PSATimeEntry;
import com.hrms.domain.psa.PSATimesheet;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

/**
 * REST controller for PSA Timesheet management.
 *
 * <p><strong>SECURITY:</strong> All operations enforce tenant isolation through the PSAService layer.
 * Timesheets are always scoped to the current tenant from TenantContext.</p>
 */
@RestController
@RequestMapping("/api/v1/psa/timesheets")
@RequiredArgsConstructor
public class PSATimesheetController {
    private final PSAService psaService;

    @PostMapping
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<PSATimesheet> createTimesheet(@Valid @RequestBody PSATimesheet timesheet) {
        return ResponseEntity.ok(psaService.createTimesheet(timesheet));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<PSATimesheet>> getEmployeeTimesheets(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(psaService.getEmployeeTimesheets(employeeId));
    }

    @GetMapping("/{id}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<PSATimesheet> getTimesheet(@PathVariable UUID id) {
        return psaService.getTimesheet(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/submit")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<PSATimesheet> submitTimesheet(@PathVariable UUID id) {
        return psaService.submitTimesheet(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<PSATimesheet> approveTimesheet(@PathVariable UUID id, @NotNull @Valid @RequestBody UUID approverId) {
        return psaService.approveTimesheet(id, approverId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<PSATimesheet> rejectTimesheet(@PathVariable UUID id, @NotBlank @Valid @RequestBody String reason) {
        return psaService.rejectTimesheet(id, reason)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/entries")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<PSATimeEntry> addTimeEntry(@PathVariable UUID id, @Valid @RequestBody PSATimeEntry entry) {
        return ResponseEntity.ok(psaService.addTimeEntry(id, entry));
    }

    @GetMapping("/{id}/entries")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<PSATimeEntry>> getTimesheetEntries(@PathVariable UUID id) {
        return ResponseEntity.ok(psaService.getTimesheetEntries(id));
    }
}
