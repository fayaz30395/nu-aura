package com.hrms.api.referral.controller;

import com.hrms.api.referral.dto.*;
import com.hrms.application.referral.service.ReferralService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.referral.EmployeeReferral.ReferralStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/referrals")
@RequiredArgsConstructor
@Tag(name = "Employee Referral Program", description = "Manage employee referrals, tracking, and bonuses")
public class ReferralController {

    private final ReferralService referralService;

    // ==================== Referral Submission ====================

    @PostMapping
    @RequiresPermission(Permission.REFERRAL_CREATE)
    @Operation(summary = "Submit a new employee referral")
    public ResponseEntity<ReferralResponse> submitReferral(@Valid @RequestBody ReferralRequest request) {
        UUID referrerId = SecurityContext.getCurrentUserId();
        log.info("Employee {} submitting referral for {}", referrerId, request.getCandidateEmail());
        return ResponseEntity.ok(referralService.submitReferral(referrerId, request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.REFERRAL_VIEW)
    @Operation(summary = "Get referral by ID")
    public ResponseEntity<ReferralResponse> getReferral(@PathVariable UUID id) {
        return ResponseEntity.ok(referralService.getReferral(id));
    }

    @GetMapping("/my-referrals")
    @RequiresPermission(Permission.REFERRAL_VIEW)
    @Operation(summary = "Get all referrals submitted by current user")
    public ResponseEntity<List<ReferralResponse>> getMyReferrals() {
        UUID referrerId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(referralService.getMyReferrals(referrerId));
    }

    @GetMapping
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Get all referrals (admin)")
    public ResponseEntity<Page<ReferralResponse>> getAllReferrals(Pageable pageable) {
        return ResponseEntity.ok(referralService.getAllReferrals(pageable));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Get referrals by status")
    public ResponseEntity<List<ReferralResponse>> getReferralsByStatus(@PathVariable ReferralStatus status) {
        return ResponseEntity.ok(referralService.getReferralsByStatus(status));
    }

    // ==================== Status Management ====================

    @PutMapping("/{id}/status")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Update referral status")
    public ResponseEntity<ReferralResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam ReferralStatus status,
            @RequestParam(required = false) String notes) {
        log.info("Updating referral {} to status {}", id, status);
        return ResponseEntity.ok(referralService.updateStatus(id, status, notes));
    }

    @PutMapping("/{id}/reject")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Reject a referral")
    public ResponseEntity<ReferralResponse> rejectReferral(
            @PathVariable UUID id,
            @RequestParam String reason,
            @RequestParam(required = false) String stage) {
        log.info("Rejecting referral {} with reason: {}", id, reason);
        return ResponseEntity.ok(referralService.rejectReferral(id, reason, stage));
    }

    @PutMapping("/{id}/link-employee")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Link referral to hired employee record")
    public ResponseEntity<ReferralResponse> linkToHiredEmployee(
            @PathVariable UUID id,
            @RequestParam UUID employeeId) {
        log.info("Linking referral {} to employee {}", id, employeeId);
        return ResponseEntity.ok(referralService.linkToHiredEmployee(id, employeeId));
    }

    // ==================== Bonus Management ====================

    @GetMapping("/bonus-eligible")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Get referrals eligible for bonus payment")
    public ResponseEntity<List<ReferralResponse>> getBonusEligibleReferrals() {
        return ResponseEntity.ok(referralService.getBonusEligibleReferrals());
    }

    @PostMapping("/{id}/process-bonus")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Start bonus processing for a referral")
    public ResponseEntity<ReferralResponse> processBonus(@PathVariable UUID id) {
        log.info("Processing bonus for referral {}", id);
        return ResponseEntity.ok(referralService.processBonus(id));
    }

    @PostMapping("/{id}/mark-bonus-paid")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Mark bonus as paid")
    public ResponseEntity<ReferralResponse> markBonusPaid(
            @PathVariable UUID id,
            @RequestParam String paymentReference) {
        log.info("Marking bonus paid for referral {} with reference {}", id, paymentReference);
        return ResponseEntity.ok(referralService.markBonusPaid(id, paymentReference));
    }

    @PostMapping("/check-bonus-eligibility")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Check and update bonus eligibility for all pending referrals")
    public ResponseEntity<Void> checkBonusEligibility() {
        log.info("Running bonus eligibility check");
        referralService.checkAndUpdateBonusEligibility();
        return ResponseEntity.ok().build();
    }

    // ==================== Policy Management ====================

    @PostMapping("/policies")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Create a new referral policy")
    public ResponseEntity<ReferralPolicyResponse> createPolicy(@Valid @RequestBody ReferralPolicyRequest request) {
        log.info("Creating referral policy: {}", request.getName());
        return ResponseEntity.ok(referralService.createPolicy(request));
    }

    @PutMapping("/policies/{id}")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Update a referral policy")
    public ResponseEntity<ReferralPolicyResponse> updatePolicy(
            @PathVariable UUID id,
            @Valid @RequestBody ReferralPolicyRequest request) {
        log.info("Updating referral policy: {}", id);
        return ResponseEntity.ok(referralService.updatePolicy(id, request));
    }

    @GetMapping("/policies/{id}")
    @RequiresPermission(Permission.REFERRAL_VIEW)
    @Operation(summary = "Get a referral policy by ID")
    public ResponseEntity<ReferralPolicyResponse> getPolicy(@PathVariable UUID id) {
        return ResponseEntity.ok(referralService.getPolicy(id));
    }

    @GetMapping("/policies")
    @RequiresPermission(Permission.REFERRAL_VIEW)
    @Operation(summary = "Get all active referral policies")
    public ResponseEntity<List<ReferralPolicyResponse>> getActivePolicies() {
        return ResponseEntity.ok(referralService.getActivePolicies());
    }

    @PutMapping("/policies/{id}/toggle")
    @RequiresPermission(Permission.REFERRAL_MANAGE)
    @Operation(summary = "Activate or deactivate a policy")
    public ResponseEntity<ReferralPolicyResponse> togglePolicyStatus(
            @PathVariable UUID id,
            @RequestParam boolean active) {
        log.info("Toggling policy {} active status to {}", id, active);
        return ResponseEntity.ok(referralService.togglePolicyStatus(id, active));
    }

    // ==================== Dashboard ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.REFERRAL_VIEW)
    @Operation(summary = "Get referral program dashboard")
    public ResponseEntity<ReferralDashboard> getDashboard() {
        return ResponseEntity.ok(referralService.getDashboard());
    }
}
