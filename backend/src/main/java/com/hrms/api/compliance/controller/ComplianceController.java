package com.hrms.api.compliance.controller;

import com.hrms.api.compliance.dto.ComplianceAlertResponse;
import com.hrms.api.compliance.dto.ComplianceChecklistResponse;
import com.hrms.api.compliance.dto.CompliancePolicyResponse;
import com.hrms.application.compliance.service.ComplianceService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.compliance.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/compliance")
@RequiredArgsConstructor
@Tag(name = "Compliance", description = "Compliance and Audit Management APIs")
public class ComplianceController {

    private final ComplianceService complianceService;

    // ==================== Policy Endpoints ====================

    @PostMapping("/policies")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Create a new compliance policy")
    public ResponseEntity<CompliancePolicyResponse> createPolicy(@Valid @RequestBody CompliancePolicy policy) {
        return ResponseEntity.ok(CompliancePolicyResponse.from(complianceService.createPolicy(policy)));
    }

    @PutMapping("/policies/{id}")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Update an existing policy")
    public ResponseEntity<CompliancePolicyResponse> updatePolicy(
            @PathVariable UUID id,
            @Valid @RequestBody CompliancePolicy policy) {
        return ResponseEntity.ok(CompliancePolicyResponse.from(complianceService.updatePolicy(id, policy)));
    }

    @PostMapping("/policies/{id}/publish")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Publish a draft policy")
    public ResponseEntity<CompliancePolicyResponse> publishPolicy(@PathVariable UUID id) {
        return ResponseEntity.ok(CompliancePolicyResponse.from(complianceService.publishPolicy(id)));
    }

    @PostMapping("/policies/{id}/archive")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Archive a policy")
    public ResponseEntity<CompliancePolicyResponse> archivePolicy(@PathVariable UUID id) {
        return ResponseEntity.ok(CompliancePolicyResponse.from(complianceService.archivePolicy(id)));
    }

    @PostMapping("/policies/{id}/new-version")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Create a new version of an existing policy")
    public ResponseEntity<CompliancePolicyResponse> createNewVersion(@PathVariable UUID id) {
        return ResponseEntity.ok(CompliancePolicyResponse.from(complianceService.createNewVersion(id)));
    }

    @GetMapping("/policies")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get all policies")
    public ResponseEntity<Page<CompliancePolicyResponse>> getAllPolicies(Pageable pageable) {
        return ResponseEntity.ok(complianceService.getAllPolicies(pageable).map(CompliancePolicyResponse::from));
    }

    @GetMapping("/policies/{id}")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get a specific policy")
    public ResponseEntity<CompliancePolicyResponse> getPolicy(@PathVariable UUID id) {
        return ResponseEntity.ok(CompliancePolicyResponse.from(complianceService.getPolicy(id)));
    }

    @GetMapping("/policies/active")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get all active policies")
    public ResponseEntity<List<CompliancePolicyResponse>> getActivePolicies() {
        return ResponseEntity.ok(complianceService.getActivePolicies().stream()
                .map(CompliancePolicyResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/policies/category/{category}")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get policies by category")
    public ResponseEntity<List<CompliancePolicyResponse>> getPoliciesByCategory(
            @PathVariable CompliancePolicy.PolicyCategory category) {
        return ResponseEntity.ok(complianceService.getPoliciesByCategory(category).stream()
                .map(CompliancePolicyResponse::from).collect(Collectors.toList()));
    }

    // ==================== Policy Acknowledgment Endpoints ====================

    @PostMapping("/policies/{policyId}/acknowledge")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Acknowledge a policy")
    public ResponseEntity<PolicyAcknowledgment> acknowledgePolicy(
            @PathVariable UUID policyId,
            @Valid @RequestBody Map<String, String> request) {
        String signature = request.get("signature");
        String ipAddress = request.get("ipAddress");
        return ResponseEntity.ok(complianceService.acknowledgePolicy(policyId, signature, ipAddress));
    }

    @GetMapping("/acknowledgments/employee/{employeeId}")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get acknowledgments for an employee")
    public ResponseEntity<List<PolicyAcknowledgment>> getEmployeeAcknowledgments(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(complianceService.getEmployeeAcknowledgments(employeeId));
    }

    @GetMapping("/policies/{policyId}/acknowledgments")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get acknowledgments for a policy")
    public ResponseEntity<List<PolicyAcknowledgment>> getPolicyAcknowledgments(@PathVariable UUID policyId) {
        return ResponseEntity.ok(complianceService.getPolicyAcknowledgments(policyId));
    }

    @GetMapping("/acknowledgments/pending/{employeeId}")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get pending policy acknowledgments for an employee")
    public ResponseEntity<List<CompliancePolicyResponse>> getPendingAcknowledgments(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(complianceService.getPendingAcknowledgments(employeeId).stream()
                .map(CompliancePolicyResponse::from).collect(Collectors.toList()));
    }

    // ==================== Checklist Endpoints ====================

    @PostMapping("/checklists")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Create a new compliance checklist")
    public ResponseEntity<ComplianceChecklistResponse> createChecklist(@Valid @RequestBody ComplianceChecklist checklist) {
        return ResponseEntity.ok(ComplianceChecklistResponse.from(complianceService.createChecklist(checklist)));
    }

    @PutMapping("/checklists/{id}")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Update a checklist")
    public ResponseEntity<ComplianceChecklistResponse> updateChecklist(
            @PathVariable UUID id,
            @Valid @RequestBody ComplianceChecklist checklist) {
        return ResponseEntity.ok(ComplianceChecklistResponse.from(complianceService.updateChecklist(id, checklist)));
    }

    @PostMapping("/checklists/{id}/complete")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Complete a checklist")
    public ResponseEntity<ComplianceChecklistResponse> completeChecklist(@PathVariable UUID id) {
        return ResponseEntity.ok(ComplianceChecklistResponse.from(complianceService.completeChecklist(id)));
    }

    @GetMapping("/checklists")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get all checklists")
    public ResponseEntity<Page<ComplianceChecklistResponse>> getAllChecklists(Pageable pageable) {
        return ResponseEntity.ok(complianceService.getAllChecklists(pageable).map(ComplianceChecklistResponse::from));
    }

    @GetMapping("/checklists/active")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get active checklists")
    public ResponseEntity<List<ComplianceChecklistResponse>> getActiveChecklists() {
        return ResponseEntity.ok(complianceService.getActiveChecklists().stream()
                .map(ComplianceChecklistResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/checklists/my")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get my assigned checklists")
    public ResponseEntity<List<ComplianceChecklistResponse>> getMyChecklists() {
        return ResponseEntity.ok(complianceService.getMyChecklists().stream()
                .map(ComplianceChecklistResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/checklists/overdue")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get overdue checklists")
    public ResponseEntity<List<ComplianceChecklistResponse>> getOverdueChecklists() {
        return ResponseEntity.ok(complianceService.getOverdueChecklists().stream()
                .map(ComplianceChecklistResponse::from).collect(Collectors.toList()));
    }

    // ==================== Audit Log Endpoints ====================

    @GetMapping("/audit-logs")
    @RequiresPermission(Permission.AUDIT_VIEW)
    @Operation(summary = "Get all audit logs")
    public ResponseEntity<Page<AuditLog>> getAuditLogs(Pageable pageable) {
        return ResponseEntity.ok(complianceService.getAuditLogs(pageable));
    }

    @GetMapping("/audit-logs/entity/{entityType}/{entityId}")
    @RequiresPermission(Permission.AUDIT_VIEW)
    @Operation(summary = "Get audit history for an entity")
    public ResponseEntity<List<AuditLog>> getEntityAuditHistory(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        return ResponseEntity.ok(complianceService.getEntityAuditHistory(entityType, entityId));
    }

    @GetMapping("/audit-logs/user/{userId}")
    @RequiresPermission(Permission.AUDIT_VIEW)
    @Operation(summary = "Get audit history for a user")
    public ResponseEntity<Page<AuditLog>> getUserAuditHistory(
            @PathVariable UUID userId,
            Pageable pageable) {
        return ResponseEntity.ok(complianceService.getUserAuditHistory(userId, pageable));
    }

    @GetMapping("/audit-logs/date-range")
    @RequiresPermission(Permission.AUDIT_VIEW)
    @Operation(summary = "Get audit logs by date range")
    public ResponseEntity<Page<AuditLog>> getAuditLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        return ResponseEntity.ok(complianceService.getAuditLogsByDateRange(startDate, endDate, pageable));
    }

    // ==================== Alert Endpoints ====================

    @PostMapping("/alerts")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Create a new compliance alert")
    public ResponseEntity<ComplianceAlertResponse> createAlert(@Valid @RequestBody ComplianceAlert alert) {
        return ResponseEntity.ok(ComplianceAlertResponse.from(complianceService.createAlert(alert)));
    }

    @PutMapping("/alerts/{id}/status")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Update alert status")
    public ResponseEntity<ComplianceAlertResponse> updateAlertStatus(
            @PathVariable UUID id,
            @Valid @RequestBody Map<String, String> request) {
        ComplianceAlert.AlertStatus status = ComplianceAlert.AlertStatus.valueOf(request.get("status"));
        String resolution = request.get("resolution");
        return ResponseEntity.ok(ComplianceAlertResponse.from(complianceService.updateAlertStatus(id, status, resolution)));
    }

    @PutMapping("/alerts/{id}/assign")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Assign an alert to a user")
    public ResponseEntity<ComplianceAlertResponse> assignAlert(
            @PathVariable UUID id,
            @Valid @RequestBody Map<String, UUID> request) {
        return ResponseEntity.ok(ComplianceAlertResponse.from(complianceService.assignAlert(id, request.get("assigneeId"))));
    }

    @PostMapping("/alerts/{id}/escalate")
    @RequiresPermission(Permission.COMPLIANCE_MANAGE)
    @Operation(summary = "Escalate an alert")
    public ResponseEntity<ComplianceAlertResponse> escalateAlert(@PathVariable UUID id) {
        return ResponseEntity.ok(ComplianceAlertResponse.from(complianceService.escalateAlert(id)));
    }

    @GetMapping("/alerts")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get all alerts")
    public ResponseEntity<Page<ComplianceAlertResponse>> getAllAlerts(Pageable pageable) {
        return ResponseEntity.ok(complianceService.getAllAlerts(pageable).map(ComplianceAlertResponse::from));
    }

    @GetMapping("/alerts/active")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get active alerts")
    public ResponseEntity<List<ComplianceAlertResponse>> getActiveAlerts() {
        return ResponseEntity.ok(complianceService.getActiveAlerts().stream()
                .map(ComplianceAlertResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/alerts/my")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get my assigned alerts")
    public ResponseEntity<List<ComplianceAlertResponse>> getMyAlerts() {
        return ResponseEntity.ok(complianceService.getMyAlerts().stream()
                .map(ComplianceAlertResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/alerts/critical")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get critical and high priority alerts")
    public ResponseEntity<List<ComplianceAlertResponse>> getCriticalAlerts() {
        return ResponseEntity.ok(complianceService.getCriticalAlerts().stream()
                .map(ComplianceAlertResponse::from).collect(Collectors.toList()));
    }

    // ==================== Dashboard ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.COMPLIANCE_VIEW)
    @Operation(summary = "Get compliance dashboard data")
    public ResponseEntity<Map<String, Object>> getComplianceDashboard() {
        return ResponseEntity.ok(complianceService.getComplianceDashboard());
    }
}
