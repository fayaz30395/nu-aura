package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.MileagePolicyRequest;
import com.hrms.api.expense.dto.MileagePolicyResponse;
import com.hrms.application.expense.service.MileagePolicyService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses/mileage/policies")
@RequiredArgsConstructor
@Slf4j
@Validated
public class MileagePolicyController {

    private final MileagePolicyService mileagePolicyService;

    @PostMapping
    @RequiresPermission(Permission.EXPENSE_SETTINGS)
    public ResponseEntity<MileagePolicyResponse> createPolicy(
            @Valid @RequestBody MileagePolicyRequest request) {
        log.info("Creating mileage policy: {}", request.name());
        MileagePolicyResponse response = mileagePolicyService.createPolicy(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{policyId}")
    @RequiresPermission(Permission.EXPENSE_SETTINGS)
    public ResponseEntity<MileagePolicyResponse> updatePolicy(
            @PathVariable @NotNull UUID policyId,
            @Valid @RequestBody MileagePolicyRequest request) {
        log.info("Updating mileage policy: {}", policyId);
        return ResponseEntity.ok(mileagePolicyService.updatePolicy(policyId, request));
    }

    @PatchMapping("/{policyId}/toggle")
    @RequiresPermission(Permission.EXPENSE_SETTINGS)
    public ResponseEntity<Void> togglePolicy(
            @PathVariable @NotNull UUID policyId,
            @RequestParam boolean active) {
        log.info("Toggling mileage policy: {} to active={}", policyId, active);
        mileagePolicyService.togglePolicy(policyId, active);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/active")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_SETTINGS})
    public ResponseEntity<List<MileagePolicyResponse>> getActivePolicies() {
        return ResponseEntity.ok(mileagePolicyService.getActivePolicies());
    }

    @GetMapping("/{policyId}")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_SETTINGS})
    public ResponseEntity<MileagePolicyResponse> getPolicy(@PathVariable @NotNull UUID policyId) {
        return ResponseEntity.ok(mileagePolicyService.getPolicy(policyId));
    }

    @DeleteMapping("/{policyId}")
    @RequiresPermission(Permission.EXPENSE_SETTINGS)
    public ResponseEntity<Void> deletePolicy(@PathVariable @NotNull UUID policyId) {
        log.info("Deleting mileage policy: {}", policyId);
        mileagePolicyService.deletePolicy(policyId);
        return ResponseEntity.noContent().build();
    }
}
