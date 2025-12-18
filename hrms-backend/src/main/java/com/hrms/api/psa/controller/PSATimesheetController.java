package com.hrms.api.psa.controller;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.psa.*;
import com.hrms.infrastructure.psa.repository.*;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/psa/timesheets")
@RequiredArgsConstructor
public class PSATimesheetController {
    private final PSATimesheetRepository timesheetRepository;
    private final PSATimeEntryRepository timeEntryRepository;

    @PostMapping
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<PSATimesheet> createTimesheet(@RequestBody PSATimesheet timesheet) {
        timesheet.setId(UUID.randomUUID());
        timesheet.setTenantId(TenantContext.getCurrentTenant());
        timesheet.setStatus(PSATimesheet.TimesheetStatus.DRAFT);
        return ResponseEntity.ok(timesheetRepository.save(timesheet));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<PSATimesheet>> getEmployeeTimesheets(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(timesheetRepository.findByTenantIdAndEmployeeIdOrderByWeekStartDateDesc(
            TenantContext.getCurrentTenant(), employeeId));
    }

    @GetMapping("/{id}")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<PSATimesheet> getTimesheet(@PathVariable UUID id) {
        return timesheetRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/submit")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<PSATimesheet> submitTimesheet(@PathVariable UUID id) {
        return timesheetRepository.findById(id)
            .map(ts -> {
                ts.setStatus(PSATimesheet.TimesheetStatus.SUBMITTED);
                ts.setSubmittedAt(LocalDateTime.now());
                return ResponseEntity.ok(timesheetRepository.save(ts));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<PSATimesheet> approveTimesheet(@PathVariable UUID id, @RequestBody UUID approverId) {
        return timesheetRepository.findById(id)
            .map(ts -> {
                ts.setStatus(PSATimesheet.TimesheetStatus.APPROVED);
                ts.setApprovedAt(LocalDateTime.now());
                ts.setApprovedBy(approverId);
                return ResponseEntity.ok(timesheetRepository.save(ts));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(TIMESHEET_APPROVE)
    public ResponseEntity<PSATimesheet> rejectTimesheet(@PathVariable UUID id, @RequestBody String reason) {
        return timesheetRepository.findById(id)
            .map(ts -> {
                ts.setStatus(PSATimesheet.TimesheetStatus.REJECTED);
                ts.setRejectionReason(reason);
                return ResponseEntity.ok(timesheetRepository.save(ts));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/entries")
    @RequiresPermission(TIMESHEET_SUBMIT)
    public ResponseEntity<PSATimeEntry> addTimeEntry(@PathVariable UUID id, @RequestBody PSATimeEntry entry) {
        entry.setId(UUID.randomUUID());
        entry.setTenantId(TenantContext.getCurrentTenant());
        entry.setTimesheetId(id);
        return ResponseEntity.ok(timeEntryRepository.save(entry));
    }

    @GetMapping("/{id}/entries")
    @RequiresPermission({PROJECT_VIEW, TIMESHEET_SUBMIT})
    public ResponseEntity<List<PSATimeEntry>> getTimesheetEntries(@PathVariable UUID id) {
        return ResponseEntity.ok(timeEntryRepository.findByTimesheetIdOrderByEntryDateAsc(id));
    }
}
