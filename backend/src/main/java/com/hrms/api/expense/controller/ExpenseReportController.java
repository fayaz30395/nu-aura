package com.hrms.api.expense.controller;

import com.hrms.application.expense.service.ExpenseReportService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses/reports")
@RequiredArgsConstructor
@Slf4j
public class ExpenseReportController {

    private final ExpenseReportService reportService;

    @GetMapping
    @RequiresPermission({Permission.EXPENSE_VIEW_ALL, Permission.EXPENSE_MANAGE})
    public ResponseEntity<Map<String, Object>> getExpenseReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        log.info("Generating expense report from {} to {}", startDate, endDate);
        return ResponseEntity.ok(reportService.generateReport(startDate, endDate, departmentId, category, status));
    }
}
