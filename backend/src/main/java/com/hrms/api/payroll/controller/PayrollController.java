package com.hrms.api.payroll.controller;

import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.payroll.service.PayrollComponentService;
import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.application.payroll.service.PayslipPdfService;
import com.hrms.application.payroll.service.PayslipService;
import com.hrms.application.payroll.service.SalaryStructureService;
import com.lowagie.text.DocumentException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.user.RoleScope;
import org.springframework.security.access.AccessDeniedException;
import com.hrms.domain.payroll.PayrollComponent;
import com.hrms.domain.payroll.PayrollComponent.ComponentType;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.payroll.SalaryStructure;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollComponentService payrollComponentService;
    private final PayrollRunService payrollRunService;
    private final PayslipService payslipService;
    private final PayslipPdfService payslipPdfService;
    private final SalaryStructureService salaryStructureService;
    private final EmployeeService employeeService;

    // ===== Payroll Run Endpoints =====

    @PostMapping("/runs")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<PayrollRun> createPayrollRun(@Valid @RequestBody PayrollRun payrollRun) {
        PayrollRun created = payrollRunService.createPayrollRun(payrollRun);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/runs/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<PayrollRun> updatePayrollRun(@PathVariable UUID id, @Valid @RequestBody PayrollRun payrollRun) {
        PayrollRun updated = payrollRunService.updatePayrollRun(id, payrollRun);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/runs/{id}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<PayrollRun> getPayrollRun(@PathVariable UUID id) {
        PayrollRun payrollRun = payrollRunService.getPayrollRunById(id);
        return ResponseEntity.ok(payrollRun);
    }

    @GetMapping("/runs")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<PayrollRun>> getAllPayrollRuns(Pageable pageable) {
        Page<PayrollRun> payrollRuns = payrollRunService.getAllPayrollRuns(pageable);
        return ResponseEntity.ok(payrollRuns);
    }

    @GetMapping("/runs/period")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<PayrollRun> getPayrollRunByPeriod(
            @RequestParam Integer year,
            @RequestParam Integer month) {
        PayrollRun payrollRun = payrollRunService.getPayrollRunByPeriod(year, month);
        return ResponseEntity.ok(payrollRun);
    }

    @GetMapping("/runs/year/{year}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PayrollRun>> getPayrollRunsByYear(@PathVariable Integer year) {
        List<PayrollRun> payrollRuns = payrollRunService.getPayrollRunsByYear(year);
        return ResponseEntity.ok(payrollRuns);
    }

    @GetMapping("/runs/status/{status}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<PayrollRun>> getPayrollRunsByStatus(
            @PathVariable PayrollStatus status,
            Pageable pageable) {
        Page<PayrollRun> payrollRuns = payrollRunService.getPayrollRunsByStatus(status, pageable);
        return ResponseEntity.ok(payrollRuns);
    }

    @PostMapping("/runs/{id}/process")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<PayrollRun> processPayrollRun(@PathVariable UUID id) {
        UUID processedBy = SecurityContext.getCurrentUserId();
        PayrollRun payrollRun = payrollRunService.processPayrollRun(id, processedBy);
        return ResponseEntity.ok(payrollRun);
    }

    @PostMapping("/runs/{id}/approve")
    @RequiresPermission(Permission.PAYROLL_APPROVE)
    public ResponseEntity<PayrollRun> approvePayrollRun(@PathVariable UUID id) {
        UUID approvedBy = SecurityContext.getCurrentUserId();
        PayrollRun payrollRun = payrollRunService.approvePayrollRun(id, approvedBy);
        return ResponseEntity.ok(payrollRun);
    }

    @PostMapping("/runs/{id}/lock")
    @RequiresPermission(Permission.PAYROLL_APPROVE)
    public ResponseEntity<PayrollRun> lockPayrollRun(@PathVariable UUID id) {
        PayrollRun payrollRun = payrollRunService.lockPayrollRun(id);
        return ResponseEntity.ok(payrollRun);
    }

    @DeleteMapping("/runs/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Void> deletePayrollRun(@PathVariable UUID id) {
        payrollRunService.deletePayrollRun(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Payslip Endpoints =====

    @PostMapping("/payslips")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Payslip> createPayslip(@Valid @RequestBody Payslip payslip) {
        Payslip created = payslipService.createPayslip(payslip);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/payslips/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Payslip> updatePayslip(@PathVariable UUID id, @Valid @RequestBody Payslip payslip) {
        Payslip updated = payslipService.updatePayslip(id, payslip);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/payslips/{id}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Payslip> getPayslip(@PathVariable UUID id) {
        Payslip payslip = payslipService.getPayslipById(id);
        return ResponseEntity.ok(payslip);
    }

    @GetMapping("/payslips")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<Payslip>> getAllPayslips(Pageable pageable) {
        Page<Payslip> payslips = payslipService.getAllPayslips(pageable);
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/payslips/employee/{employeeId}")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<Page<Payslip>> getPayslipsByEmployee(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        Page<Payslip> payslips = payslipService.getPayslipsByEmployeeId(employeeId, pageable);
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/payslips/employee/{employeeId}/period")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<Payslip> getPayslipByEmployeeAndPeriod(
            @PathVariable UUID employeeId,
            @RequestParam Integer year,
            @RequestParam Integer month) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        Payslip payslip = payslipService.getPayslipByEmployeeAndPeriod(employeeId, year, month);
        return ResponseEntity.ok(payslip);
    }

    @GetMapping("/payslips/employee/{employeeId}/year/{year}")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<List<Payslip>> getPayslipsByEmployeeAndYear(
            @PathVariable UUID employeeId,
            @PathVariable Integer year) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        List<Payslip> payslips = payslipService.getPayslipsByEmployeeAndYear(employeeId, year);
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/payslips/run/{payrollRunId}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<List<Payslip>> getPayslipsByPayrollRun(@PathVariable UUID payrollRunId) {
        List<Payslip> payslips = payslipService.getPayslipsByPayrollRun(payrollRunId);
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/payslips/run/{payrollRunId}/paged")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<Payslip>> getPayslipsByPayrollRunPaged(
            @PathVariable UUID payrollRunId,
            Pageable pageable) {
        Page<Payslip> payslips = payslipService.getPayslipsByPayrollRunPaged(payrollRunId, pageable);
        return ResponseEntity.ok(payslips);
    }

    @DeleteMapping("/payslips/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Void> deletePayslip(@PathVariable UUID id) {
        payslipService.deletePayslip(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Payslip PDF Download Endpoints =====

    @GetMapping("/payslips/{id}/pdf")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<byte[]> downloadPayslipPdf(@PathVariable UUID id) throws DocumentException {
        Payslip payslip = payslipService.getPayslipById(id);
        String permission = determineViewPermission();
        validateEmployeeAccess(payslip.getEmployeeId(), permission);
        byte[] pdfBytes = payslipPdfService.generatePayslipPdf(id);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=payslip_" + id + ".pdf")
                .header("Content-Type", "application/pdf")
                .body(pdfBytes);
    }

    @GetMapping("/payslips/employee/{employeeId}/period/pdf")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<byte[]> downloadPayslipPdfByPeriod(
            @PathVariable UUID employeeId,
            @RequestParam Integer year,
            @RequestParam Integer month) throws DocumentException {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        byte[] pdfBytes = payslipPdfService.generatePayslipPdf(employeeId, year, month);
        String monthStr = String.format("%02d", month);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=payslip_" + year + "_" + monthStr + ".pdf")
                .header("Content-Type", "application/pdf")
                .body(pdfBytes);
    }

    // ===== Salary Structure Endpoints =====

    @PostMapping("/salary-structures")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<SalaryStructure> createSalaryStructure(@Valid @RequestBody SalaryStructure salaryStructure) {
        SalaryStructure created = salaryStructureService.createSalaryStructure(salaryStructure);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/salary-structures/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<SalaryStructure> updateSalaryStructure(
            @PathVariable UUID id,
            @Valid @RequestBody SalaryStructure salaryStructure) {
        SalaryStructure updated = salaryStructureService.updateSalaryStructure(id, salaryStructure);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/salary-structures/{id}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<SalaryStructure> getSalaryStructure(@PathVariable UUID id) {
        SalaryStructure salaryStructure = salaryStructureService.getSalaryStructureById(id);
        return ResponseEntity.ok(salaryStructure);
    }

    @GetMapping("/salary-structures")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<SalaryStructure>> getAllSalaryStructures(Pageable pageable) {
        Page<SalaryStructure> salaryStructures = salaryStructureService.getAllSalaryStructures(pageable);
        return ResponseEntity.ok(salaryStructures);
    }

    @GetMapping("/salary-structures/employee/{employeeId}")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<List<SalaryStructure>> getSalaryStructuresByEmployee(
            @PathVariable UUID employeeId) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        List<SalaryStructure> salaryStructures = salaryStructureService.getSalaryStructuresByEmployeeId(employeeId);
        return ResponseEntity.ok(salaryStructures);
    }

    @GetMapping("/salary-structures/employee/{employeeId}/active")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<SalaryStructure> getActiveSalaryStructure(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) LocalDate date) {
        String permission = determineViewPermission();
        validateEmployeeAccess(employeeId, permission);
        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        SalaryStructure salaryStructure = salaryStructureService.getActiveSalaryStructure(employeeId, effectiveDate);
        return ResponseEntity.ok(salaryStructure);
    }

    @GetMapping("/salary-structures/active")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<SalaryStructure>> getActiveSalaryStructures(Pageable pageable) {
        Page<SalaryStructure> salaryStructures = salaryStructureService.getActiveSalaryStructures(pageable);
        return ResponseEntity.ok(salaryStructures);
    }

    @PostMapping("/salary-structures/{id}/deactivate")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<SalaryStructure> deactivateSalaryStructure(@PathVariable UUID id) {
        SalaryStructure salaryStructure = salaryStructureService.deactivateSalaryStructure(id);
        return ResponseEntity.ok(salaryStructure);
    }

    @DeleteMapping("/salary-structures/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Void> deleteSalaryStructure(@PathVariable UUID id) {
        salaryStructureService.deleteSalaryStructure(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Payroll Component Endpoints =====

    @PostMapping("/components")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<PayrollComponent> createComponent(
            @Valid @RequestBody PayrollComponent component) {
        PayrollComponent created = payrollComponentService.createComponent(component);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/components/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<PayrollComponent> updateComponent(
            @PathVariable UUID id,
            @Valid @RequestBody PayrollComponent component) {
        PayrollComponent updated = payrollComponentService.updateComponent(id, component);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/components/{id}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<PayrollComponent> getComponent(@PathVariable UUID id) {
        PayrollComponent component = payrollComponentService.getComponentById(id);
        return ResponseEntity.ok(component);
    }

    @GetMapping("/components")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<Page<PayrollComponent>> getAllComponents(Pageable pageable) {
        Page<PayrollComponent> components = payrollComponentService.getAllComponents(pageable);
        return ResponseEntity.ok(components);
    }

    @GetMapping("/components/active")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PayrollComponent>> getActiveComponents() {
        List<PayrollComponent> components = payrollComponentService.getActiveComponentsInOrder();
        return ResponseEntity.ok(components);
    }

    @GetMapping("/components/active/type/{type}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PayrollComponent>> getActiveComponentsByType(
            @PathVariable ComponentType type) {
        List<PayrollComponent> components = payrollComponentService.getActiveComponentsByType(type);
        return ResponseEntity.ok(components);
    }

    @GetMapping("/components/code/{code}")
    @RequiresPermission(Permission.PAYROLL_VIEW_ALL)
    public ResponseEntity<PayrollComponent> getComponentByCode(@PathVariable String code) {
        PayrollComponent component = payrollComponentService.getComponentByCode(code);
        return ResponseEntity.ok(component);
    }

    @DeleteMapping("/components/{id}")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Void> deleteComponent(@PathVariable UUID id) {
        payrollComponentService.deleteComponent(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/components/evaluate")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Map<String, BigDecimal>> evaluateComponents(
            @RequestBody Map<String, BigDecimal> inputValues) {
        Map<String, BigDecimal> results = payrollComponentService.evaluateComponents(inputValues);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/components/recompute-order")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<Void> recomputeEvaluationOrder() {
        payrollComponentService.recomputeEvaluationOrder();
        return ResponseEntity.noContent().build();
    }

    // ===== Employee Access Validation (matches LeaveRequestController / AttendanceController pattern) =====

    /**
     * Determines the highest payroll view permission the current user holds.
     * Used to resolve the scope (ALL, SELF, etc.) for employee data access checks.
     */
    private String determineViewPermission() {
        if (SecurityContext.getPermissionScope(Permission.PAYROLL_VIEW_ALL) != null) {
            return Permission.PAYROLL_VIEW_ALL;
        }
        return Permission.PAYROLL_VIEW_SELF;
    }

    /**
     * Validates that the current user can access payroll data for a specific employee
     * based on their permission scope. Throws AccessDeniedException if access is not allowed.
     */
    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // Super admin (includes system admin and SUPER_ADMIN role) bypasses all checks
        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new AccessDeniedException("No access to payroll records");
        }

        switch (scope) {
            case ALL:
                // ALL scope: can access any employee's payroll data
                return;

            case LOCATION:
                // LOCATION scope: target employee must be in same location
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;

            case DEPARTMENT:
                // DEPARTMENT scope: target employee must be in same department
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;

            case TEAM:
                // TEAM scope: target must be self or a reportee
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;

            case SELF:
                // SELF scope: can only access own payroll data
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;

            case CUSTOM:
                // CUSTOM scope: check if target is in custom targets
                if (targetEmployeeId.equals(currentEmployeeId) || isInCustomTargets(targetEmployeeId, permission)) {
                    return;
                }
                break;
        }

        throw new AccessDeniedException(
                "You do not have permission to access this employee's payroll records");
    }

    private boolean isReportee(UUID employeeId) {
        java.util.Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        java.util.Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeService.findByIdAndTenant(employeeId, tenantId)
                .map(emp -> emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId()))
                .orElse(false);
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeService.findByIdAndTenant(employeeId, tenantId)
                .map(emp -> departmentId.equals(emp.getDepartmentId()))
                .orElse(false);
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        // Check if employee is directly in custom employee targets
        java.util.Set<UUID> customEmployeeTargets = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeTargets != null && customEmployeeTargets.contains(employeeId)) {
            return true;
        }

        // Check if employee's department is in custom department targets
        java.util.Set<UUID> customDepartmentTargets = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentTargets != null && !customDepartmentTargets.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            java.util.Optional<com.hrms.domain.employee.Employee> empOpt = employeeService.findByIdAndTenant(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getDepartmentId() != null
                    && customDepartmentTargets.contains(empOpt.get().getDepartmentId())) {
                return true;
            }
        }

        // Check if employee's location is in custom location targets
        java.util.Set<UUID> customLocationTargets = SecurityContext.getCustomLocationIds(permission);
        if (customLocationTargets != null && !customLocationTargets.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            java.util.Optional<com.hrms.domain.employee.Employee> empOpt = employeeService.findByIdAndTenant(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getOfficeLocationId() != null
                    && customLocationTargets.contains(empOpt.get().getOfficeLocationId())) {
                return true;
            }
        }

        return false;
    }
}
