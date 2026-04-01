package com.hrms.api.statutory.controller;

import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.statutory.MonthlyStatutoryContribution;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statutory/contributions")
@RequiredArgsConstructor
public class StatutoryContributionController {

    private final StatutoryService statutoryService;

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<List<MonthlyStatutoryContribution>> getEmployeeContributions(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(statutoryService.getEmployeeContributions(employeeId));
    }

    @GetMapping("/month/{month}/year/{year}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<List<MonthlyStatutoryContribution>> getMonthlyContributions(
            @PathVariable Integer month,
            @PathVariable Integer year) {
        return ResponseEntity.ok(statutoryService.getMonthlyContributions(month, year));
    }

    @GetMapping("/payslip/{payslipId}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<MonthlyStatutoryContribution> getByPayslip(@PathVariable UUID payslipId) {
        return statutoryService.getContributionByPayslip(payslipId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
