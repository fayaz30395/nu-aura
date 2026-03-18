package com.hrms.api.benefits.controller;

import com.hrms.api.benefits.dto.*;
import com.hrms.application.benefits.service.BenefitEnhancedService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.benefits.BenefitPlanEnhanced;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/benefits-enhanced")
@RequiredArgsConstructor
@Validated
@Tag(name = "Enhanced Benefits", description = "Comprehensive benefits administration APIs")
public class BenefitEnhancedController {

    private final BenefitEnhancedService benefitService;

    // ==================== BENEFIT PLANS ====================

    @PostMapping("/plans")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Create a new benefit plan")
    public ResponseEntity<BenefitPlanEnhancedResponse> createPlan(
            @Valid @RequestBody BenefitPlanEnhancedRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(benefitService.createPlan(request));
    }

    @PutMapping("/plans/{planId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Update a benefit plan")
    public ResponseEntity<BenefitPlanEnhancedResponse> updatePlan(
            @PathVariable UUID planId,
            @Valid @RequestBody BenefitPlanEnhancedRequest request) {
        return ResponseEntity.ok(benefitService.updatePlan(planId, request));
    }

    @GetMapping("/plans")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get all benefit plans with pagination")
    public ResponseEntity<Page<BenefitPlanEnhancedResponse>> getAllPlans(Pageable pageable) {
        return ResponseEntity.ok(benefitService.getAllPlans(pageable));
    }

    @GetMapping("/plans/{planId}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get a specific benefit plan")
    public ResponseEntity<BenefitPlanEnhancedResponse> getPlan(@PathVariable UUID planId) {
        return ResponseEntity.ok(benefitService.getPlan(planId));
    }

    @GetMapping("/plans/active")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get all active benefit plans")
    public ResponseEntity<List<BenefitPlanEnhancedResponse>> getActivePlans() {
        return ResponseEntity.ok(benefitService.getActivePlans());
    }

    @GetMapping("/plans/type/{planType}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get benefit plans by type")
    public ResponseEntity<List<BenefitPlanEnhancedResponse>> getPlansByType(
            @PathVariable BenefitPlanEnhanced.PlanType planType) {
        return ResponseEntity.ok(benefitService.getPlansByType(planType));
    }

    @GetMapping("/plans/category/{category}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get benefit plans by category")
    public ResponseEntity<List<BenefitPlanEnhancedResponse>> getPlansByCategory(
            @PathVariable BenefitPlanEnhanced.PlanCategory category) {
        return ResponseEntity.ok(benefitService.getPlansByCategory(category));
    }

    @GetMapping("/plans/eligible")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get eligible benefit plans for employee grade")
    public ResponseEntity<List<BenefitPlanEnhancedResponse>> getEligiblePlans(
            @RequestParam String grade) {
        return ResponseEntity.ok(benefitService.getEligiblePlansForEmployee(grade));
    }

    // ==================== ENROLLMENTS ====================

    @PostMapping("/enrollments")
    @RequiresPermission(Permission.BENEFIT_ENROLL)
    @Operation(summary = "Enroll employee in a benefit plan")
    public ResponseEntity<EnrollmentResponse> enrollEmployee(
            @Valid @RequestBody EnrollmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(benefitService.enrollEmployee(request));
    }

    @PostMapping("/enrollments/{enrollmentId}/approve")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Approve an enrollment")
    public ResponseEntity<EnrollmentResponse> approveEnrollment(
            @PathVariable UUID enrollmentId,
            @Size(max = 1000) @RequestParam(required = false) String comments) {
        return ResponseEntity.ok(benefitService.approveEnrollment(enrollmentId, comments));
    }

    @PostMapping("/enrollments/{enrollmentId}/activate")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Activate an approved enrollment")
    public ResponseEntity<EnrollmentResponse> activateEnrollment(@PathVariable UUID enrollmentId) {
        return ResponseEntity.ok(benefitService.activateEnrollment(enrollmentId));
    }

    @PostMapping("/enrollments/{enrollmentId}/terminate")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Terminate an enrollment")
    public ResponseEntity<EnrollmentResponse> terminateEnrollment(
            @PathVariable UUID enrollmentId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        return ResponseEntity.ok(benefitService.terminateEnrollment(enrollmentId, reason));
    }

    @PostMapping("/enrollments/{enrollmentId}/cobra")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Start COBRA continuation for terminated enrollment")
    public ResponseEntity<EnrollmentResponse> startCobra(
            @PathVariable UUID enrollmentId,
            @RequestParam BigDecimal cobraPremium,
            @RequestParam(defaultValue = "18") int months) {
        return ResponseEntity.ok(benefitService.startCobra(enrollmentId, cobraPremium, months));
    }

    @GetMapping("/enrollments/employee/{employeeId}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get all enrollments for an employee")
    public ResponseEntity<List<EnrollmentResponse>> getEmployeeEnrollments(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(benefitService.getEmployeeEnrollments(employeeId));
    }

    @GetMapping("/enrollments/employee/{employeeId}/active")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get active enrollments for an employee")
    public ResponseEntity<List<EnrollmentResponse>> getActiveEnrollments(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(benefitService.getActiveEnrollmentsForEmployee(employeeId));
    }

    @GetMapping("/enrollments/pending")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Get all pending enrollments")
    public ResponseEntity<List<EnrollmentResponse>> getPendingEnrollments() {
        return ResponseEntity.ok(benefitService.getPendingEnrollments());
    }

    // ==================== CLAIMS ====================

    @PostMapping("/claims")
    @RequiresPermission(Permission.BENEFIT_CLAIM_SUBMIT)
    @Operation(summary = "Submit a benefit claim")
    public ResponseEntity<ClaimResponse> submitClaim(@Valid @RequestBody ClaimRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(benefitService.submitClaim(request));
    }

    @GetMapping("/claims/{claimId}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get claim details")
    public ResponseEntity<ClaimResponse> getClaim(@PathVariable UUID claimId) {
        return ResponseEntity.ok(benefitService.getClaim(claimId));
    }

    @PostMapping("/claims/{claimId}/process")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Process and approve a claim")
    public ResponseEntity<ClaimResponse> processClaim(
            @PathVariable UUID claimId,
            @RequestParam BigDecimal approvedAmount,
            @Size(max = 1000) @RequestParam(required = false) String comments) {
        return ResponseEntity.ok(benefitService.processClaim(claimId, approvedAmount, comments));
    }

    @PostMapping("/claims/{claimId}/reject")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Reject a claim")
    public ResponseEntity<ClaimResponse> rejectClaim(
            @PathVariable UUID claimId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        return ResponseEntity.ok(benefitService.rejectClaim(claimId, reason));
    }

    @PostMapping("/claims/{claimId}/initiate-payment")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Initiate payment for approved claim")
    public ResponseEntity<ClaimResponse> initiatePayment(@PathVariable UUID claimId) {
        return ResponseEntity.ok(benefitService.initiateClaimPayment(claimId));
    }

    @PostMapping("/claims/{claimId}/complete-payment")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Complete payment for a claim")
    public ResponseEntity<ClaimResponse> completePayment(
            @PathVariable UUID claimId,
            @NotBlank @Size(max = 255) @RequestParam String paymentReference) {
        return ResponseEntity.ok(benefitService.completeClaimPayment(claimId, paymentReference));
    }

    @PostMapping("/claims/{claimId}/appeal")
    @RequiresPermission(Permission.BENEFIT_CLAIM_SUBMIT)
    @Operation(summary = "Appeal a rejected claim")
    public ResponseEntity<ClaimResponse> appealClaim(
            @PathVariable UUID claimId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        return ResponseEntity.ok(benefitService.appealClaim(claimId, reason));
    }

    @GetMapping("/claims/employee/{employeeId}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get claims for an employee")
    public ResponseEntity<Page<ClaimResponse>> getEmployeeClaims(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(benefitService.getEmployeeClaims(employeeId, pageable));
    }

    @GetMapping("/claims/pending")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Get all pending claims")
    public ResponseEntity<List<ClaimResponse>> getPendingClaims() {
        return ResponseEntity.ok(benefitService.getPendingClaims());
    }

    // ==================== FLEX BENEFITS ====================

    @PostMapping("/flex/allocations")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Create flex benefit allocation for employee")
    public ResponseEntity<FlexAllocationResponse> createFlexAllocation(
            @Valid @RequestBody FlexAllocationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(benefitService.createFlexAllocation(request));
    }

    @GetMapping("/flex/allocations/employee/{employeeId}/active")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get active flex allocation for employee")
    public ResponseEntity<FlexAllocationResponse> getActiveFlexAllocation(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(benefitService.getActiveFlexAllocation(employeeId));
    }

    @GetMapping("/flex/allocations/employee/{employeeId}/history")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get flex allocation history for employee")
    public ResponseEntity<List<FlexAllocationResponse>> getFlexAllocationHistory(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(benefitService.getFlexAllocationHistory(employeeId));
    }

    // ==================== ANALYTICS ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.REPORT_VIEW)
    @Operation(summary = "Get benefits dashboard analytics")
    public ResponseEntity<Map<String, Object>> getBenefitsDashboard() {
        return ResponseEntity.ok(benefitService.getBenefitsDashboard());
    }

    @GetMapping("/summary/employee/{employeeId}")
    @RequiresPermission({Permission.BENEFIT_VIEW, Permission.BENEFIT_VIEW_SELF})
    @Operation(summary = "Get employee benefits summary")
    public ResponseEntity<Map<String, Object>> getEmployeeBenefitsSummary(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(benefitService.getEmployeeBenefitsSummary(employeeId));
    }
}
