package com.hrms.api.benefits.controller;

import com.hrms.api.benefits.dto.BenefitPlanRequest;
import com.hrms.api.benefits.dto.BenefitPlanResponse;
import com.hrms.application.benefits.service.BenefitManagementService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.benefits.BenefitPlan;

import static com.hrms.common.security.Permission.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/benefits")
@RequiredArgsConstructor
public class BenefitManagementController {

    private final BenefitManagementService benefitService;

    @PostMapping("/plans")
    @RequiresPermission(BENEFIT_MANAGE)
    public ResponseEntity<BenefitPlanResponse> createPlan(@Valid @RequestBody BenefitPlanRequest request) {
        BenefitPlanResponse response = benefitService.createPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/plans/{planId}")
    @RequiresPermission(BENEFIT_MANAGE)
    public ResponseEntity<BenefitPlanResponse> updatePlan(
            @PathVariable UUID planId,
            @Valid @RequestBody BenefitPlanRequest request) {
        BenefitPlanResponse response = benefitService.updatePlan(planId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/plans/{planId}/activate")
    @RequiresPermission(BENEFIT_MANAGE)
    public ResponseEntity<BenefitPlanResponse> activatePlan(@PathVariable UUID planId) {
        BenefitPlanResponse response = benefitService.activatePlan(planId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/plans/{planId}/deactivate")
    @RequiresPermission(BENEFIT_MANAGE)
    public ResponseEntity<BenefitPlanResponse> deactivatePlan(@PathVariable UUID planId) {
        BenefitPlanResponse response = benefitService.deactivatePlan(planId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans/{planId}")
    @RequiresPermission(BENEFIT_VIEW)
    public ResponseEntity<BenefitPlanResponse> getPlanById(@PathVariable UUID planId) {
        BenefitPlanResponse response = benefitService.getPlanById(planId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans")
    @RequiresPermission(BENEFIT_VIEW)
    public ResponseEntity<Page<BenefitPlanResponse>> getAllPlans(Pageable pageable) {
        Page<BenefitPlanResponse> response = benefitService.getAllPlans(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans/active")
    @RequiresPermission(BENEFIT_VIEW)
    public ResponseEntity<List<BenefitPlanResponse>> getActivePlans() {
        List<BenefitPlanResponse> response = benefitService.getActivePlans();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/plans/type/{benefitType}")
    @RequiresPermission(BENEFIT_VIEW)
    public ResponseEntity<List<BenefitPlanResponse>> getPlansByType(@PathVariable BenefitPlan.BenefitType benefitType) {
        List<BenefitPlanResponse> response = benefitService.getPlansByType(benefitType);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/plans/{planId}")
    @RequiresPermission(BENEFIT_MANAGE)
    public ResponseEntity<Void> deletePlan(@PathVariable UUID planId) {
        benefitService.deletePlan(planId);
        return ResponseEntity.noContent().build();
    }
}
