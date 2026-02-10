package com.hrms.api.exit.controller;

import com.hrms.api.exit.dto.*;
import com.hrms.application.exit.service.ExitManagementService;
import com.hrms.domain.exit.ExitProcess;
import com.hrms.domain.exit.FullAndFinalSettlement;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exit")
@RequiredArgsConstructor
@Tag(name = "Exit Management", description = "Offboarding and Exit Management APIs")
public class ExitManagementController {

    private final ExitManagementService exitService;

    // ==================== Exit Process Endpoints ====================

    @PostMapping("/processes")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<ExitProcessResponse> createExitProcess(@Valid @RequestBody ExitProcessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exitService.createExitProcess(request));
    }

    @PutMapping("/processes/{id}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<ExitProcessResponse> updateExitProcess(
            @PathVariable UUID id,
            @Valid @RequestBody ExitProcessRequest request) {
        return ResponseEntity.ok(exitService.updateExitProcess(id, request));
    }

    @PatchMapping("/processes/{id}/status")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    public ResponseEntity<ExitProcessResponse> updateExitStatus(
            @PathVariable UUID id,
            @RequestParam ExitProcess.ExitStatus status) {
        return ResponseEntity.ok(exitService.updateExitStatus(id, status));
    }

    @GetMapping("/processes/{id}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    public ResponseEntity<ExitProcessResponse> getExitProcessById(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.getExitProcessById(id));
    }

    @GetMapping("/processes/employee/{employeeId}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    public ResponseEntity<ExitProcessResponse> getExitProcessByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(exitService.getExitProcessByEmployee(employeeId));
    }

    @GetMapping("/processes")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    public ResponseEntity<Page<ExitProcessResponse>> getAllExitProcesses(Pageable pageable) {
        return ResponseEntity.ok(exitService.getAllExitProcesses(pageable));
    }

    @GetMapping("/processes/status/{status}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<ExitProcessResponse>> getExitProcessesByStatus(@PathVariable ExitProcess.ExitStatus status) {
        return ResponseEntity.ok(exitService.getExitProcessesByStatus(status));
    }

    @DeleteMapping("/processes/{id}")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    public ResponseEntity<Void> deleteExitProcess(@PathVariable UUID id) {
        exitService.deleteExitProcess(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Exit Clearance Endpoints ====================

    @PostMapping("/clearances")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<ExitClearanceResponse> createExitClearance(@Valid @RequestBody ExitClearanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exitService.createExitClearance(request));
    }

    @PutMapping("/clearances/{id}")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    public ResponseEntity<ExitClearanceResponse> updateExitClearance(
            @PathVariable UUID id,
            @Valid @RequestBody ExitClearanceRequest request) {
        return ResponseEntity.ok(exitService.updateExitClearance(id, request));
    }

    @GetMapping("/clearances/process/{exitProcessId}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<ExitClearanceResponse>> getClearancesByExitProcess(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(exitService.getClearancesByExitProcess(exitProcessId));
    }

    @GetMapping("/clearances/approver/{approverId}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<ExitClearanceResponse>> getClearancesByApprover(@PathVariable UUID approverId) {
        return ResponseEntity.ok(exitService.getClearancesByApprover(approverId));
    }

    @DeleteMapping("/clearances/{id}")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    public ResponseEntity<Void> deleteExitClearance(@PathVariable UUID id) {
        exitService.deleteExitClearance(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Full & Final Settlement Endpoints ====================

    @PostMapping("/settlements")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Create a new F&F settlement")
    public ResponseEntity<FullAndFinalSettlementResponse> createSettlement(@Valid @RequestBody FullAndFinalSettlementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exitService.createSettlement(request));
    }

    @PutMapping("/settlements/{id}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Update an F&F settlement")
    public ResponseEntity<FullAndFinalSettlementResponse> updateSettlement(
            @PathVariable UUID id,
            @Valid @RequestBody FullAndFinalSettlementRequest request) {
        return ResponseEntity.ok(exitService.updateSettlement(id, request));
    }

    @PostMapping("/settlements/{id}/submit")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Submit settlement for approval")
    public ResponseEntity<FullAndFinalSettlementResponse> submitSettlementForApproval(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.submitForApproval(id));
    }

    @PostMapping("/settlements/{id}/approve")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    @Operation(summary = "Approve an F&F settlement")
    public ResponseEntity<FullAndFinalSettlementResponse> approveSettlement(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.approveSettlement(id));
    }

    @PostMapping("/settlements/{id}/pay")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    @Operation(summary = "Process settlement payment")
    public ResponseEntity<FullAndFinalSettlementResponse> processSettlementPayment(
            @PathVariable UUID id,
            @RequestParam FullAndFinalSettlement.PaymentMode paymentMode,
            @RequestParam String paymentReference) {
        return ResponseEntity.ok(exitService.processPayment(id, paymentMode, paymentReference));
    }

    @GetMapping("/settlements/{id}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get settlement by ID")
    public ResponseEntity<FullAndFinalSettlementResponse> getSettlementById(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.getSettlementById(id));
    }

    @GetMapping("/settlements/process/{exitProcessId}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get settlement by exit process")
    public ResponseEntity<FullAndFinalSettlementResponse> getSettlementByExitProcess(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(exitService.getSettlementByExitProcess(exitProcessId));
    }

    @GetMapping("/settlements")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get all settlements")
    public ResponseEntity<Page<FullAndFinalSettlementResponse>> getAllSettlements(Pageable pageable) {
        return ResponseEntity.ok(exitService.getAllSettlements(pageable));
    }

    @GetMapping("/settlements/pending-approvals")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get settlements pending approval")
    public ResponseEntity<List<FullAndFinalSettlementResponse>> getPendingApprovals() {
        return ResponseEntity.ok(exitService.getPendingApprovals());
    }

    // ==================== Exit Interview Endpoints ====================

    @PostMapping("/interviews")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Schedule an exit interview")
    public ResponseEntity<ExitInterviewResponse> createExitInterview(@Valid @RequestBody ExitInterviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exitService.createExitInterview(request));
    }

    @PutMapping("/interviews/{id}/conduct")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Conduct and record exit interview feedback")
    public ResponseEntity<ExitInterviewResponse> conductExitInterview(
            @PathVariable UUID id,
            @Valid @RequestBody ExitInterviewRequest request) {
        return ResponseEntity.ok(exitService.conductExitInterview(id, request));
    }

    @PatchMapping("/interviews/{id}/reschedule")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Reschedule an exit interview")
    public ResponseEntity<ExitInterviewResponse> rescheduleInterview(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate) {
        return ResponseEntity.ok(exitService.rescheduleInterview(id, newDate));
    }

    @GetMapping("/interviews/{id}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get exit interview by ID")
    public ResponseEntity<ExitInterviewResponse> getExitInterviewById(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.getExitInterviewById(id));
    }

    @GetMapping("/interviews")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get all exit interviews")
    public ResponseEntity<Page<ExitInterviewResponse>> getAllExitInterviews(Pageable pageable) {
        return ResponseEntity.ok(exitService.getAllExitInterviews(pageable));
    }

    @GetMapping("/interviews/scheduled")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get scheduled interviews")
    public ResponseEntity<List<ExitInterviewResponse>> getScheduledInterviews() {
        return ResponseEntity.ok(exitService.getScheduledInterviews());
    }

    @GetMapping("/interviews/analytics")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get exit interview analytics")
    public ResponseEntity<Map<String, Object>> getExitInterviewAnalytics() {
        return ResponseEntity.ok(exitService.getExitInterviewAnalytics());
    }

    // ==================== Asset Recovery Endpoints ====================

    @PostMapping("/assets")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Create asset recovery record")
    public ResponseEntity<AssetRecoveryResponse> createAssetRecovery(@Valid @RequestBody AssetRecoveryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exitService.createAssetRecovery(request));
    }

    @PutMapping("/assets/{id}/return")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Record asset return")
    public ResponseEntity<AssetRecoveryResponse> recordAssetReturn(
            @PathVariable UUID id,
            @Valid @RequestBody AssetRecoveryRequest request) {
        return ResponseEntity.ok(exitService.recordAssetReturn(id, request));
    }

    @PatchMapping("/assets/{id}/lost")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Mark asset as lost")
    public ResponseEntity<AssetRecoveryResponse> markAssetAsLost(
            @PathVariable UUID id,
            @RequestParam(required = false) BigDecimal deductionAmount,
            @RequestParam(required = false) String remarks) {
        return ResponseEntity.ok(exitService.markAssetAsLost(id, deductionAmount, remarks));
    }

    @PatchMapping("/assets/{id}/waive")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    @Operation(summary = "Waive asset recovery")
    public ResponseEntity<AssetRecoveryResponse> waiveAssetRecovery(
            @PathVariable UUID id,
            @RequestParam String waiverReason) {
        return ResponseEntity.ok(exitService.waiveAssetRecovery(id, waiverReason));
    }

    @PatchMapping("/assets/{id}/verify")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Verify asset return")
    public ResponseEntity<AssetRecoveryResponse> verifyAssetReturn(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.verifyAssetReturn(id));
    }

    @GetMapping("/assets/process/{exitProcessId}")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get assets by exit process")
    public ResponseEntity<List<AssetRecoveryResponse>> getAssetsByExitProcess(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(exitService.getAssetsByExitProcess(exitProcessId));
    }

    @GetMapping("/assets/pending")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get pending asset recoveries")
    public ResponseEntity<List<AssetRecoveryResponse>> getPendingAssetRecoveries() {
        return ResponseEntity.ok(exitService.getPendingAssetRecoveries());
    }

    @GetMapping("/assets/process/{exitProcessId}/deductions")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get total deductions for exit process")
    public ResponseEntity<BigDecimal> getTotalDeductions(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(exitService.getTotalDeductionsForExitProcess(exitProcessId));
    }

    @GetMapping("/assets/process/{exitProcessId}/recovered")
    @RequiresPermission({Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Check if all assets are recovered")
    public ResponseEntity<Boolean> areAllAssetsRecovered(@PathVariable UUID exitProcessId) {
        return ResponseEntity.ok(exitService.areAllAssetsRecovered(exitProcessId));
    }

    // ==================== Dashboard Endpoint ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get exit management dashboard")
    public ResponseEntity<Map<String, Object>> getExitDashboard() {
        return ResponseEntity.ok(exitService.getExitDashboard());
    }
}
