package com.hrms.api.payroll.controller;

import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.application.payroll.service.PayslipPdfService;
import com.hrms.application.payroll.service.PayslipService;
import com.hrms.application.payroll.service.SalaryStructureService;
import com.lowagie.text.DocumentException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollRunService payrollRunService;
    private final PayslipService payslipService;
    private final PayslipPdfService payslipPdfService;
    private final SalaryStructureService salaryStructureService;

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
        Page<Payslip> payslips = payslipService.getPayslipsByEmployeeId(employeeId, pageable);
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/payslips/employee/{employeeId}/period")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<Payslip> getPayslipByEmployeeAndPeriod(
            @PathVariable UUID employeeId,
            @RequestParam Integer year,
            @RequestParam Integer month) {
        Payslip payslip = payslipService.getPayslipByEmployeeAndPeriod(employeeId, year, month);
        return ResponseEntity.ok(payslip);
    }

    @GetMapping("/payslips/employee/{employeeId}/year/{year}")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<List<Payslip>> getPayslipsByEmployeeAndYear(
            @PathVariable UUID employeeId,
            @PathVariable Integer year) {
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
        List<SalaryStructure> salaryStructures = salaryStructureService.getSalaryStructuresByEmployeeId(employeeId);
        return ResponseEntity.ok(salaryStructures);
    }

    @GetMapping("/salary-structures/employee/{employeeId}/active")
    @RequiresPermission({Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_VIEW_SELF})
    public ResponseEntity<SalaryStructure> getActiveSalaryStructure(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) LocalDate date) {
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
}
