# RBAC Controller Implementation Examples

This document shows how to apply RBAC to all controllers in the HRMS system.

## Pattern 1: Employee Directory Controller (with Data Scope)

```java
package com.hrms.api.employee.controller;

import com.hrms.common.security.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
public class EmployeeDirectoryController {

    private final EmployeeRepository employeeRepository;

    /**
     * Get all employees - filtered by data scope
     * - SUPER_ADMIN/TENANT_ADMIN/HR_MANAGER: See all employees
     * - DEPARTMENT_MANAGER: See only department employees
     * - TEAM_LEAD: See only team employees
     * - EMPLOYEE: See only self
     */
    @GetMapping
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    public ResponseEntity<List<Employee>> getAllEmployees() {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Apply data scope filtering
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return ResponseEntity.ok(employeeRepository.findByTenantId(tenantId));
        }

        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_DEPARTMENT)) {
            UUID deptId = SecurityContext.getCurrentDepartmentId();
            return ResponseEntity.ok(employeeRepository.findByTenantIdAndDepartmentId(tenantId, deptId));
        }

        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            UUID teamId = SecurityContext.getCurrentTeamId();
            return ResponseEntity.ok(employeeRepository.findByTenantIdAndTeamId(tenantId, teamId));
        }

        // Can only see self
        UUID empId = SecurityContext.getCurrentEmployeeId();
        Employee self = employeeRepository.findById(empId).orElseThrow();
        return ResponseEntity.ok(Collections.singletonList(self));
    }

    /**
     * Create employee - Only HR Manager and Admins
     */
    @PostMapping
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
        employee.setId(UUID.randomUUID());
        employee.setTenantId(TenantContext.getCurrentTenant());
        employee.setCreatedBy(SecurityContext.getCurrentUserId());

        Employee created = employeeRepository.save(employee);

        // Audit log
        logAudit("EMPLOYEE_CREATED", created.getId());

        return ResponseEntity.ok(created);
    }

    /**
     * Update employee - Only HR Manager and Admins
     */
    @PutMapping("/{id}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<Employee> updateEmployee(@PathVariable UUID id, @RequestBody Employee employee) {
        // Verify employee exists and is accessible
        if (!canAccessEmployee(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        employee.setId(id);
        employee.setUpdatedBy(SecurityContext.getCurrentUserId());

        Employee updated = employeeRepository.save(employee);
        logAudit("EMPLOYEE_UPDATED", id);

        return ResponseEntity.ok(updated);
    }

    /**
     * Delete employee - Only Admins with explicit permission
     */
    @DeleteMapping("/{id}")
    @RequiresPermission(allOf = {Permission.EMPLOYEE_DELETE, Permission.SYSTEM_ADMIN})
    public ResponseEntity<Void> deleteEmployee(@PathVariable UUID id) {
        if (!canAccessEmployee(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        employeeRepository.deleteById(id);
        logAudit("EMPLOYEE_DELETED", id);

        return ResponseEntity.noContent().build();
    }

    private boolean canAccessEmployee(UUID employeeId) {
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return true;
        }

        Employee emp = employeeRepository.findById(employeeId).orElse(null);
        if (emp == null) return false;

        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_DEPARTMENT)) {
            return emp.getDepartmentId().equals(SecurityContext.getCurrentDepartmentId());
        }

        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            return emp.getTeamId().equals(SecurityContext.getCurrentTeamId());
        }

        return employeeId.equals(SecurityContext.getCurrentEmployeeId());
    }

    private void logAudit(String action, UUID resourceId) {
        // Log to audit table
        System.out.printf("[AUDIT] %s by user %s on resource %s%n",
            action, SecurityContext.getCurrentUserId(), resourceId);
    }
}
```

---

## Pattern 2: Leave Request Controller (with Approval Workflow)

```java
package com.hrms.api.leave.controller;

import com.hrms.common.security.*;
import com.hrms.domain.leave.*;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/leave")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestRepository leaveRepository;

    /**
     * Employee requests leave
     */
    @PostMapping("/request")
    @RequiresPermission(Permission.LEAVE_REQUEST)
    public ResponseEntity<LeaveRequest> requestLeave(@RequestBody LeaveRequest request) {
        request.setId(UUID.randomUUID());
        request.setTenantId(TenantContext.getCurrentTenant());
        request.setEmployeeId(SecurityContext.getCurrentEmployeeId());
        request.setStatus(LeaveStatus.PENDING);
        request.setRequestedAt(LocalDateTime.now());

        LeaveRequest created = leaveRepository.save(request);
        logAudit("LEAVE_REQUESTED", created.getId());

        return ResponseEntity.ok(created);
    }

    /**
     * View leave requests - Scope-based
     */
    @GetMapping
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_TEAM})
    public ResponseEntity<List<LeaveRequest>> getLeaveRequests() {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (SecurityContext.hasPermission(Permission.LEAVE_VIEW_ALL)) {
            return ResponseEntity.ok(leaveRepository.findByTenantId(tenantId));
        }

        if (SecurityContext.hasPermission(Permission.LEAVE_VIEW_TEAM)) {
            // Get team members' leave requests
            UUID managerId = SecurityContext.getCurrentEmployeeId();
            return ResponseEntity.ok(leaveRepository.findByTenantIdAndManagerId(tenantId, managerId));
        }

        // Can only see own requests
        UUID empId = SecurityContext.getCurrentEmployeeId();
        return ResponseEntity.ok(leaveRepository.findByTenantIdAndEmployeeId(tenantId, empId));
    }

    /**
     * Approve leave - Only managers
     */
    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<LeaveRequest> approveLeave(@PathVariable UUID id) {
        LeaveRequest leave = leaveRepository.findById(id).orElseThrow();

        // Verify this employee is under manager's scope
        if (!canManageEmployee(leave.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        leave.setStatus(LeaveStatus.APPROVED);
        leave.setApprovedBy(SecurityContext.getCurrentEmployeeId());
        leave.setApprovedAt(LocalDateTime.now());

        LeaveRequest updated = leaveRepository.save(leave);
        logAudit("LEAVE_APPROVED", id);

        return ResponseEntity.ok(updated);
    }

    /**
     * Reject leave - Only managers
     */
    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.LEAVE_REJECT)
    public ResponseEntity<LeaveRequest> rejectLeave(
            @PathVariable UUID id,
            @RequestBody String reason) {

        LeaveRequest leave = leaveRepository.findById(id).orElseThrow();

        if (!canManageEmployee(leave.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        leave.setStatus(LeaveStatus.REJECTED);
        leave.setRejectedBy(SecurityContext.getCurrentEmployeeId());
        leave.setRejectionReason(reason);

        LeaveRequest updated = leaveRepository.save(leave);
        logAudit("LEAVE_REJECTED", id);

        return ResponseEntity.ok(updated);
    }

    /**
     * Cancel own leave request
     */
    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.LEAVE_CANCEL)
    public ResponseEntity<LeaveRequest> cancelLeave(@PathVariable UUID id) {
        LeaveRequest leave = leaveRepository.findById(id).orElseThrow();

        // Can only cancel own leave
        if (!leave.getEmployeeId().equals(SecurityContext.getCurrentEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        leave.setStatus(LeaveStatus.CANCELLED);
        LeaveRequest updated = leaveRepository.save(leave);
        logAudit("LEAVE_CANCELLED", id);

        return ResponseEntity.ok(updated);
    }

    private boolean canManageEmployee(UUID employeeId) {
        // Similar logic to Employee controller
        return SecurityContext.hasPermission(Permission.LEAVE_APPROVE) &&
               (SecurityContext.hasPermission(Permission.LEAVE_VIEW_ALL) ||
                isInMyTeam(employeeId));
    }

    private boolean isInMyTeam(UUID employeeId) {
        // Check if employee reports to current user
        // Implementation depends on your org structure
        return true; // Simplified
    }

    private void logAudit(String action, UUID resourceId) {
        System.out.printf("[AUDIT] %s by user %s on resource %s%n",
            action, SecurityContext.getCurrentUserId(), resourceId);
    }
}
```

---

## Pattern 3: Payroll Controller (Highly Sensitive Data)

```java
package com.hrms.api.payroll.controller;

import com.hrms.common.security.*;
import com.hrms.domain.payroll.*;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayslipRepository payslipRepository;

    /**
     * View all payslips - HR Manager and Admins only
     */
    @GetMapping("/payslips")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<List<Payslip>> getAllPayslips() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Payslip> payslips = payslipRepository.findByTenantId(tenantId);

        logAudit("PAYROLL_VIEW_ALL", null); // Sensitive operation
        return ResponseEntity.ok(payslips);
    }

    /**
     * View own payslip - All employees
     */
    @GetMapping("/my-payslips")
    @RequiresPermission(Permission.PAYROLL_VIEW_SELF)
    public ResponseEntity<List<Payslip>> getMyPayslips() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID empId = SecurityContext.getCurrentEmployeeId();

        List<Payslip> payslips = payslipRepository.findByTenantIdAndEmployeeId(tenantId, empId);

        return ResponseEntity.ok(payslips);
    }

    /**
     * Process payroll - Only authorized HR
     */
    @PostMapping("/process")
    @RequiresPermission(allOf = {Permission.PAYROLL_PROCESS, Permission.PAYROLL_VIEW_ALL})
    public ResponseEntity<String> processPayroll(@RequestBody PayrollRunRequest request) {
        logAudit("PAYROLL_PROCESS_STARTED", null); // Critical operation

        // Payroll processing logic...
        String result = "Payroll processed for " + request.getMonth();

        logAudit("PAYROLL_PROCESS_COMPLETED", null);
        return ResponseEntity.ok(result);
    }

    /**
     * Approve payroll run - Only Admins
     */
    @PostMapping("/approve/{runId}")
    @RequiresPermission(Permission.PAYROLL_APPROVE)
    public ResponseEntity<Void> approvePayroll(@PathVariable UUID runId) {
        // Only TENANT_ADMIN or higher can approve
        if (!SecurityContext.isTenantAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        logAudit("PAYROLL_APPROVED", runId); // Critical operation
        return ResponseEntity.ok().build();
    }

    private void logAudit(String action, UUID resourceId) {
        System.out.printf("[AUDIT-SENSITIVE] %s by user %s on resource %s%n",
            action, SecurityContext.getCurrentUserId(), resourceId);
    }
}
```

---

## Pattern 4: Recruitment Controller (HR-Only Module)

```java
package com.hrms.api.recruitment.controller;

import com.hrms.common.security.*;
import com.hrms.domain.recruitment.*;
import com.hrms.infrastructure.recruitment.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/recruitment")
@RequiredArgsConstructor
public class RecruitmentController {

    private final JobOpeningRepository jobOpeningRepository;
    private final JobApplicationRepository applicationRepository;

    /**
     * View job openings - HR and Managers
     */
    @GetMapping("/jobs")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<List<JobOpening>> getJobOpenings() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(jobOpeningRepository.findByTenantId(tenantId));
    }

    /**
     * Create job opening - HR Manager only
     */
    @PostMapping("/jobs")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<JobOpening> createJobOpening(@RequestBody JobOpening job) {
        job.setId(UUID.randomUUID());
        job.setTenantId(TenantContext.getCurrentTenant());
        job.setCreatedBy(SecurityContext.getCurrentUserId());

        JobOpening created = jobOpeningRepository.save(job);
        logAudit("JOB_OPENING_CREATED", created.getId());

        return ResponseEntity.ok(created);
    }

    /**
     * View candidates - HR only
     */
    @GetMapping("/jobs/{jobId}/applications")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<List<JobApplication>> getApplications(@PathVariable UUID jobId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ResponseEntity.ok(applicationRepository.findByTenantIdAndJobOpeningId(tenantId, jobId));
    }

    /**
     * Evaluate candidate - HR Manager
     */
    @PostMapping("/applications/{id}/evaluate")
    @RequiresPermission(Permission.CANDIDATE_EVALUATE)
    public ResponseEntity<JobApplication> evaluateCandidate(
            @PathVariable UUID id,
            @RequestBody EvaluationRequest evaluation) {

        JobApplication application = applicationRepository.findById(id).orElseThrow();
        application.setEvaluationScore(evaluation.getScore());
        application.setEvaluatedBy(SecurityContext.getCurrentEmployeeId());

        JobApplication updated = applicationRepository.save(application);
        logAudit("CANDIDATE_EVALUATED", id);

        return ResponseEntity.ok(updated);
    }

    private void logAudit(String action, UUID resourceId) {
        System.out.printf("[AUDIT] %s by user %s on resource %s%n",
            action, SecurityContext.getCurrentUserId(), resourceId);
    }
}
```

---

## Pattern 5: Reports Controller (Dynamic Access)

```java
package com.hrms.api.report.controller;

import com.hrms.common.security.*;
import com.hrms.domain.analytics.*;
import com.hrms.infrastructure.analytics.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportDefinitionRepository reportRepository;
    private final ReportExecutionRepository executionRepository;

    /**
     * View available reports - Based on access level
     */
    @GetMapping
    @RequiresPermission(Permission.REPORT_VIEW)
    public ResponseEntity<List<ReportDefinition>> getReports() {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Filter reports by user's access level
        List<ReportDefinition> reports = reportRepository.findByTenantIdAndIsActiveTrue(tenantId);

        // Filter based on report access level
        reports = reports.stream()
            .filter(this::canAccessReport)
            .toList();

        return ResponseEntity.ok(reports);
    }

    /**
     * Create custom report - HR Manager and Admins
     */
    @PostMapping
    @RequiresPermission(Permission.REPORT_CREATE)
    public ResponseEntity<ReportDefinition> createReport(@RequestBody ReportDefinition report) {
        report.setId(UUID.randomUUID());
        report.setTenantId(TenantContext.getCurrentTenant());
        report.setCreatedBy(SecurityContext.getCurrentUserId());

        ReportDefinition created = reportRepository.save(report);
        logAudit("REPORT_CREATED", created.getId());

        return ResponseEntity.ok(created);
    }

    /**
     * Execute report - Permission-based
     */
    @PostMapping("/{id}/execute")
    @RequiresPermission(Permission.REPORT_VIEW)
    public ResponseEntity<ReportExecution> executeReport(@PathVariable UUID id) {
        ReportDefinition report = reportRepository.findById(id).orElseThrow();

        if (!canAccessReport(report)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Execute report...
        ReportExecution execution = new ReportExecution();
        execution.setId(UUID.randomUUID());
        execution.setReportDefinitionId(id);
        execution.setExecutedBy(SecurityContext.getCurrentUserId());
        execution.setStatus(ReportExecution.ExecutionStatus.RUNNING);

        ReportExecution created = executionRepository.save(execution);
        logAudit("REPORT_EXECUTED", id);

        return ResponseEntity.ok(created);
    }

    /**
     * Export report - Requires export permission
     */
    @GetMapping("/{executionId}/export")
    @RequiresPermission(allOf = {Permission.REPORT_VIEW, Permission.ANALYTICS_EXPORT})
    public ResponseEntity<byte[]> exportReport(@PathVariable UUID executionId) {
        logAudit("REPORT_EXPORTED", executionId);

        // Export logic...
        byte[] reportData = new byte[0];

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(reportData);
    }

    private boolean canAccessReport(ReportDefinition report) {
        return switch (report.getAccessLevel()) {
            case ADMIN_ONLY -> SecurityContext.isTenantAdmin();
            case HR -> SecurityContext.isHRManager();
            case MANAGER -> SecurityContext.isManager();
            case EMPLOYEE -> true; // All employees
            case PUBLIC -> true;
        };
    }

    private void logAudit(String action, UUID resourceId) {
        System.out.printf("[AUDIT] %s by user %s on resource %s%n",
            action, SecurityContext.getCurrentUserId(), resourceId);
    }
}
```

---

## Summary - Apply These Patterns to ALL Controllers

1. **Always use @RequiresPermission** on controller methods
2. **Check data scope** before returning data
3. **Verify ownership** before allowing updates/deletes
4. **Log sensitive operations** (payroll, deletions, exports)
5. **Return 403 Forbidden** for unauthorized access
6. **Use SecurityContext** for current user info
7. **Never bypass security** in service layer

Apply these patterns to all 35 controllers in the system!
