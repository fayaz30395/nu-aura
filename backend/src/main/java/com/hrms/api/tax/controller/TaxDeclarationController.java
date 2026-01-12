package com.hrms.api.tax.controller;

import com.hrms.api.tax.dto.*;
import com.hrms.application.tax.service.TaxDeclarationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tax-declarations")
@RequiredArgsConstructor
public class TaxDeclarationController {

    private final TaxDeclarationService taxDeclarationService;

    // ==================== Tax Declaration Endpoints ====================

    @PostMapping
    @RequiresPermission(Permission.TDS_DECLARE)
    public ResponseEntity<TaxDeclarationResponse> createTaxDeclaration(@RequestBody TaxDeclarationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taxDeclarationService.createTaxDeclaration(request));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.TDS_DECLARE)
    public ResponseEntity<TaxDeclarationResponse> updateTaxDeclaration(
            @PathVariable UUID id,
            @RequestBody TaxDeclarationRequest request) {
        return ResponseEntity.ok(taxDeclarationService.updateTaxDeclaration(id, request));
    }

    @PatchMapping("/{id}/submit")
    @RequiresPermission(Permission.TDS_DECLARE)
    public ResponseEntity<TaxDeclarationResponse> submitTaxDeclaration(@PathVariable UUID id) {
        return ResponseEntity.ok(taxDeclarationService.submitTaxDeclaration(id));
    }

    @PatchMapping("/{id}/approve")
    @RequiresPermission(Permission.TDS_APPROVE)
    public ResponseEntity<TaxDeclarationResponse> approveTaxDeclaration(
            @PathVariable UUID id,
            @RequestParam UUID approverId) {
        return ResponseEntity.ok(taxDeclarationService.approveTaxDeclaration(id, approverId));
    }

    @PatchMapping("/{id}/reject")
    @RequiresPermission(Permission.TDS_APPROVE)
    public ResponseEntity<TaxDeclarationResponse> rejectTaxDeclaration(
            @PathVariable UUID id,
            @RequestParam UUID rejectedBy,
            @RequestParam String reason) {
        return ResponseEntity.ok(taxDeclarationService.rejectTaxDeclaration(id, rejectedBy, reason));
    }

    @GetMapping("/{id}")
    @RequiresPermission({Permission.STATUTORY_VIEW, Permission.TDS_DECLARE})
    public ResponseEntity<TaxDeclarationResponse> getTaxDeclarationById(@PathVariable UUID id) {
        return ResponseEntity.ok(taxDeclarationService.getTaxDeclarationById(id));
    }

    @GetMapping
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<Page<TaxDeclarationResponse>> getAllTaxDeclarations(Pageable pageable) {
        return ResponseEntity.ok(taxDeclarationService.getAllTaxDeclarations(pageable));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.STATUTORY_VIEW, Permission.TDS_DECLARE})
    public ResponseEntity<List<TaxDeclarationResponse>> getTaxDeclarationsByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(taxDeclarationService.getTaxDeclarationsByEmployee(employeeId));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.TDS_DECLARE)
    public ResponseEntity<Void> deleteTaxDeclaration(@PathVariable UUID id) {
        taxDeclarationService.deleteTaxDeclaration(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Tax Proof Endpoints ====================

    @PostMapping("/proofs")
    @RequiresPermission(Permission.TDS_DECLARE)
    public ResponseEntity<TaxProofResponse> addTaxProof(
            @RequestParam UUID employeeId,
            @RequestBody TaxProofRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taxDeclarationService.addTaxProof(employeeId, request));
    }

    @PatchMapping("/proofs/{proofId}/verify")
    @RequiresPermission(Permission.TDS_APPROVE)
    public ResponseEntity<TaxProofResponse> verifyTaxProof(
            @PathVariable UUID proofId,
            @RequestParam UUID verifiedBy,
            @RequestParam(required = false) BigDecimal approvedAmount,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(taxDeclarationService.verifyTaxProof(proofId, verifiedBy, approvedAmount, notes));
    }

    @GetMapping("/{declarationId}/proofs")
    @RequiresPermission({Permission.STATUTORY_VIEW, Permission.TDS_DECLARE})
    public ResponseEntity<List<TaxProofResponse>> getTaxProofsByDeclaration(@PathVariable UUID declarationId) {
        return ResponseEntity.ok(taxDeclarationService.getTaxProofsByDeclaration(declarationId));
    }
}
