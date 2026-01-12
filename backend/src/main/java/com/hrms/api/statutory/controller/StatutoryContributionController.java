package com.hrms.api.statutory.controller;

import com.hrms.common.security.TenantContext;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.statutory.MonthlyStatutoryContribution;
import com.hrms.infrastructure.statutory.repository.MonthlyStatutoryContributionRepository;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/statutory/contributions")
@RequiredArgsConstructor
public class StatutoryContributionController {
    private final MonthlyStatutoryContributionRepository contributionRepository;

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<List<MonthlyStatutoryContribution>> getEmployeeContributions(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(contributionRepository.findByTenantIdAndEmployeeIdOrderByYearDescMonthDesc(
                TenantContext.getCurrentTenant(), employeeId));
    }

    @GetMapping("/month/{month}/year/{year}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<List<MonthlyStatutoryContribution>> getMonthlyContributions(
            @PathVariable Integer month,
            @PathVariable Integer year) {
        return ResponseEntity.ok(contributionRepository.findByTenantIdAndMonthAndYear(
                TenantContext.getCurrentTenant(), month, year));
    }

    @GetMapping("/payslip/{payslipId}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<MonthlyStatutoryContribution> getByPayslip(@PathVariable UUID payslipId) {
        return contributionRepository.findByPayslipId(payslipId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
