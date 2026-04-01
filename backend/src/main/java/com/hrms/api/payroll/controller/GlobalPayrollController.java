package com.hrms.api.payroll.controller;

import com.hrms.api.payroll.dto.*;
import com.hrms.application.payroll.service.GlobalPayrollService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/global-payroll")
@RequiredArgsConstructor
@Validated
@Tag(name = "Global Payroll", description = "Multi-currency global payroll management APIs")
public class GlobalPayrollController {

    private final GlobalPayrollService payrollService;

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get global payroll dashboard", description = "Returns comprehensive overview of global payroll")
    public ResponseEntity<GlobalPayrollDashboard> getDashboard() {
        return ResponseEntity.ok(payrollService.getDashboard());
    }

    // ==================== CURRENCY MANAGEMENT ====================

    @PostMapping("/currencies")
    @RequiresPermission(Permission.CURRENCY_MANAGE)
    @Operation(summary = "Create currency", description = "Creates a new currency configuration")
    public ResponseEntity<CurrencyDto> createCurrency(@Valid @RequestBody CurrencyDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payrollService.createCurrency(request));
    }

    @GetMapping("/currencies")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get active currencies", description = "Returns all active currencies")
    public ResponseEntity<List<CurrencyDto>> getActiveCurrencies() {
        return ResponseEntity.ok(payrollService.getActiveCurrencies());
    }

    @GetMapping("/currencies/base")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get base currency", description = "Returns the base currency for consolidation")
    public ResponseEntity<CurrencyDto> getBaseCurrency() {
        return ResponseEntity.ok(payrollService.getBaseCurrency());
    }

    // ==================== EXCHANGE RATE MANAGEMENT ====================

    @PostMapping("/exchange-rates")
    @RequiresPermission(Permission.EXCHANGE_RATE_MANAGE)
    @Operation(summary = "Create exchange rate", description = "Creates a new exchange rate")
    public ResponseEntity<ExchangeRateDto> createExchangeRate(@Valid @RequestBody ExchangeRateDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payrollService.createExchangeRate(request));
    }

    @GetMapping("/exchange-rates/convert")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Convert amount", description = "Converts amount from one currency to another")
    public ResponseEntity<BigDecimal> convertAmount(
            @RequestParam BigDecimal amount,
            @RequestParam String fromCurrency,
            @RequestParam String toCurrency,
            @RequestParam(required = false) LocalDate date) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(payrollService.convertAmount(amount, fromCurrency, toCurrency, effectiveDate));
    }

    @GetMapping("/exchange-rates/rate")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get exchange rate", description = "Gets the exchange rate between two currencies")
    public ResponseEntity<BigDecimal> getExchangeRate(
            @RequestParam String fromCurrency,
            @RequestParam String toCurrency,
            @RequestParam(required = false) LocalDate date) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(payrollService.getExchangeRate(fromCurrency, toCurrency, effectiveDate));
    }

    // ==================== PAYROLL LOCATION MANAGEMENT ====================

    @PostMapping("/locations")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_MANAGE)
    @Operation(summary = "Create payroll location", description = "Creates a new payroll location with tax and compliance settings")
    public ResponseEntity<PayrollLocationDto> createLocation(@Valid @RequestBody PayrollLocationDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payrollService.createLocation(request));
    }

    @GetMapping("/locations")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get all locations", description = "Returns paginated list of payroll locations")
    public ResponseEntity<Page<PayrollLocationDto>> getAllLocations(Pageable pageable) {
        return ResponseEntity.ok(payrollService.getAllLocations(pageable));
    }

    @GetMapping("/locations/active")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get active locations", description = "Returns all active payroll locations")
    public ResponseEntity<List<PayrollLocationDto>> getActiveLocations() {
        return ResponseEntity.ok(payrollService.getActiveLocations());
    }

    // ==================== PAYROLL RUN MANAGEMENT ====================

    @PostMapping("/runs")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_MANAGE)
    @Operation(summary = "Create payroll run", description = "Creates a new global payroll run")
    public ResponseEntity<GlobalPayrollRunDto> createPayrollRun(
            @RequestParam LocalDate periodStart,
            @RequestParam LocalDate periodEnd,
            @RequestParam(required = false) LocalDate paymentDate,
            @Size(max = 1000) @RequestParam(required = false) String description) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payrollService.createPayrollRun(periodStart, periodEnd, paymentDate, description));
    }

    @PostMapping("/runs/{runId}/process")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_MANAGE)
    @Operation(summary = "Process payroll run", description = "Processes all employee records, calculates totals and applies exchange rates")
    public ResponseEntity<GlobalPayrollRunDto> processPayrollRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.processPayrollRun(runId));
    }

    @PostMapping("/runs/{runId}/approve")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_MANAGE)
    @Operation(summary = "Approve payroll run", description = "Approves a processed payroll run for payment")
    public ResponseEntity<GlobalPayrollRunDto> approvePayrollRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.approvePayrollRun(runId));
    }

    @GetMapping("/runs/{runId}")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get payroll run details", description = "Returns detailed payroll run with currency and location breakdowns")
    public ResponseEntity<GlobalPayrollRunDto> getPayrollRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.getPayrollRun(runId));
    }

    @GetMapping("/runs")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get all payroll runs", description = "Returns paginated list of all payroll runs")
    public ResponseEntity<Page<GlobalPayrollRunDto>> getAllPayrollRuns(Pageable pageable) {
        return ResponseEntity.ok(payrollService.getAllPayrollRuns(pageable));
    }

    // ==================== EMPLOYEE PAYROLL RECORDS ====================

    @PostMapping("/runs/{runId}/employees")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_MANAGE)
    @Operation(summary = "Add employee to payroll run", description = "Adds an employee's payroll record to a run")
    public ResponseEntity<EmployeePayrollRecordDto> addEmployeeToPayroll(
            @PathVariable UUID runId,
            @Valid @RequestBody EmployeePayrollRecordDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payrollService.addEmployeeToPayroll(runId, request));
    }

    @GetMapping("/runs/{runId}/employees")
    @RequiresPermission(Permission.GLOBAL_PAYROLL_VIEW)
    @Operation(summary = "Get employee records for payroll run", description = "Returns all employee payroll records for a run")
    public ResponseEntity<List<EmployeePayrollRecordDto>> getEmployeeRecords(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.getEmployeeRecords(runId));
    }
}
