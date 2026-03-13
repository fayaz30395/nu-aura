package com.hrms.api.contract.controller;

import com.hrms.api.contract.dto.*;
import com.hrms.application.contract.service.ContractService;
import com.hrms.application.contract.service.ContractSignatureService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ContractType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for contract management
 */
@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;
    private final ContractSignatureService signatureService;

    // ===================== CRUD Operations =====================

    @PostMapping
    @RequiresPermission(Permission.CONTRACT_CREATE)
    public ResponseEntity<ContractDto> createContract(@Valid @RequestBody CreateContractRequest request) {
        ContractDto contract = contractService.createContract(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(contract);
    }

    @GetMapping("/{contractId}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<ContractDto> getContract(@PathVariable UUID contractId) {
        ContractDto contract = contractService.getContractById(contractId);
        return ResponseEntity.ok(contract);
    }

    @GetMapping
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getAllContracts(Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getAllContracts(pageable);
        return ResponseEntity.ok(contracts);
    }

    @PutMapping("/{contractId}")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> updateContract(
            @PathVariable UUID contractId,
            @Valid @RequestBody UpdateContractRequest request) {
        ContractDto contract = contractService.updateContract(contractId, request);
        return ResponseEntity.ok(contract);
    }

    @DeleteMapping("/{contractId}")
    @RequiresPermission(Permission.CONTRACT_DELETE)
    public ResponseEntity<Void> deleteContract(@PathVariable UUID contractId) {
        contractService.deleteContract(contractId);
        return ResponseEntity.noContent().build();
    }

    // ===================== Filtering & Search =====================

    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getByStatus(
            @PathVariable ContractStatus status,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getContractsByStatus(status, pageable);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/type/{type}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getByType(
            @PathVariable ContractType type,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getContractsByType(type, pageable);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getEmployeeContracts(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getEmployeeContracts(employeeId, pageable);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/search")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> searchContracts(
            @RequestParam String search,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.searchContracts(search, pageable);
        return ResponseEntity.ok(contracts);
    }

    // ===================== Status Transitions =====================

    @PatchMapping("/{contractId}/mark-pending-review")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> markPendingReview(@PathVariable UUID contractId) {
        ContractDto contract = contractService.markAsPendingReview(contractId);
        return ResponseEntity.ok(contract);
    }

    @PatchMapping("/{contractId}/mark-pending-signatures")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> markPendingSignatures(@PathVariable UUID contractId) {
        ContractDto contract = contractService.markAsPendingSignatures(contractId);
        return ResponseEntity.ok(contract);
    }

    @PatchMapping("/{contractId}/mark-active")
    @RequiresPermission(Permission.CONTRACT_APPROVE)
    public ResponseEntity<ContractDto> markActive(@PathVariable UUID contractId) {
        ContractDto contract = contractService.markAsActive(contractId);
        return ResponseEntity.ok(contract);
    }

    @PatchMapping("/{contractId}/terminate")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> terminateContract(@PathVariable UUID contractId) {
        ContractDto contract = contractService.terminateContract(contractId);
        return ResponseEntity.ok(contract);
    }

    @PatchMapping("/{contractId}/renew")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> renewContract(@PathVariable UUID contractId) {
        ContractDto contract = contractService.renewContract(contractId);
        return ResponseEntity.ok(contract);
    }

    // ===================== Expiry & Status Checks =====================

    @GetMapping("/expiring")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractListDto>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int days) {
        List<ContractListDto> contracts = contractService.getExpiringContracts(days);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/expired")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractListDto>> getExpiredContracts() {
        List<ContractListDto> contracts = contractService.getExpiredContracts();
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractListDto>> getActiveContracts() {
        List<ContractListDto> contracts = contractService.getActiveContracts();
        return ResponseEntity.ok(contracts);
    }

    // ===================== Version Management =====================

    @GetMapping("/{contractId}/versions")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<java.util.Map<String, Object>>> getVersionHistory(@PathVariable UUID contractId) {
        List<java.util.Map<String, Object>> versions = contractService.getVersionHistory(contractId);
        return ResponseEntity.ok(versions);
    }

    // ===================== Signature Management =====================

    @PostMapping("/{contractId}/send-for-signing")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractSignatureDto> sendForSigning(
            @PathVariable UUID contractId,
            @Valid @RequestBody SendForSigningRequest request) {
        ContractSignatureDto signature = signatureService.sendForSigning(contractId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(signature);
    }

    @PostMapping("/{contractId}/record-signature")
    @RequiresPermission(Permission.CONTRACT_SIGN)
    public ResponseEntity<ContractSignatureDto> recordSignature(
            @PathVariable UUID contractId,
            @RequestParam String signerEmail,
            @RequestParam String signatureImageUrl,
            @RequestParam(required = false) String ipAddress) {
        ContractSignatureDto signature = signatureService.recordSignature(contractId, signerEmail, signatureImageUrl, ipAddress);
        return ResponseEntity.ok(signature);
    }

    @PostMapping("/{contractId}/decline-signature")
    @RequiresPermission(Permission.CONTRACT_SIGN)
    public ResponseEntity<ContractSignatureDto> declineSignature(
            @PathVariable UUID contractId,
            @RequestParam String signerEmail) {
        ContractSignatureDto signature = signatureService.declineSignature(contractId, signerEmail);
        return ResponseEntity.ok(signature);
    }

    @GetMapping("/{contractId}/signatures")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractSignatureDto>> getSignatures(@PathVariable UUID contractId) {
        List<ContractSignatureDto> signatures = signatureService.getContractSignatures(contractId);
        return ResponseEntity.ok(signatures);
    }

    @GetMapping("/{contractId}/signatures/pending")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractSignatureDto>> getPendingSignatures(@PathVariable UUID contractId) {
        List<ContractSignatureDto> signatures = signatureService.getPendingSignatures(contractId);
        return ResponseEntity.ok(signatures);
    }

    @GetMapping("/{contractId}/signatures/summary")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<java.util.Map<String, Integer>> getSignatureSummary(@PathVariable UUID contractId) {
        java.util.Map<String, Integer> summary = signatureService.getSignatureSummary(contractId);
        return ResponseEntity.ok(summary);
    }
}
