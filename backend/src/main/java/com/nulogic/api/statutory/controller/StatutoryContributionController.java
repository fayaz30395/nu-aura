package com.nulogic.api.statutory.controller;

import com.nulogic.application.statutory.service.StatutoryService;
import com.nulogic.common.api.response.WrapResponse;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.statutory.MonthlyStatutoryContribution;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statutory/contributions")
@RequiredArgsConstructor
@WrapResponse
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
