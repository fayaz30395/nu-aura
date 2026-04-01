package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.ExpensePolicyRequest;
import com.hrms.api.expense.dto.ExpensePolicyResponse;
import com.hrms.application.expense.service.ExpensePolicyService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses/policies")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ExpensePolicyController {

    private final ExpensePolicyService policyService;

    @PostMapping
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<ExpensePolicyResponse> createPolicy(
            @Valid @RequestBody ExpensePolicyRequest request) {
        log.info("Creating expense policy: {}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(policyService.createPolicy(request));
    }

    @PutMapping("/{policyId}")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<ExpensePolicyResponse> updatePolicy(
            @PathVariable UUID policyId,
            @Valid @RequestBody ExpensePolicyRequest request) {
        log.info("Updating expense policy: {}", policyId);
        return ResponseEntity.ok(policyService.updatePolicy(policyId, request));
    }

    @GetMapping("/{policyId}")
    @RequiresPermission(Permission.EXPENSE_VIEW)
    public ResponseEntity<ExpensePolicyResponse> getPolicy(@PathVariable UUID policyId) {
        return ResponseEntity.ok(policyService.getPolicy(policyId));
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.EXPENSE_VIEW)
    public ResponseEntity<List<ExpensePolicyResponse>> getActivePolicies() {
        return ResponseEntity.ok(policyService.getActivePolicies());
    }

    @GetMapping
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<Page<ExpensePolicyResponse>> getAllPolicies(Pageable pageable) {
        return ResponseEntity.ok(policyService.getAllPolicies(pageable));
    }

    @PatchMapping("/{policyId}/toggle")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<Void> togglePolicyActive(
            @PathVariable UUID policyId,
            @RequestParam boolean active) {
        policyService.togglePolicyActive(policyId, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{policyId}")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<Void> deletePolicy(@PathVariable UUID policyId) {
        policyService.deletePolicy(policyId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/validate")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<List<String>> validateClaimAmount(
            @RequestParam UUID employeeId,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(policyService.validateClaimAgainstPolicies(employeeId, amount));
    }
}
