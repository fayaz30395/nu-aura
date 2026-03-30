package com.hrms.api.contract.controller;

import com.hrms.api.contract.dto.*;
import com.hrms.application.contract.service.ContractService;
import com.hrms.application.contract.service.ContractSignatureService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ContractType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

/**
 * REST Controller for contract management.
 * Handles contract CRUD, status transitions, version management, and digital signatures.
 */
@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
@Tag(name = "Contracts", description = "Contract lifecycle management including creation, signing, and version tracking")
public class ContractController {

    private final ContractService contractService;
    private final ContractSignatureService signatureService;

    // ===================== CRUD Operations =====================

    @Operation(summary = "Create a new contract",
            description = "Creates a new contract document with initial DRAFT status. " +
                    "Supports employment, NDA, service agreement, and other contract types.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Contract created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
    @PostMapping
    @RequiresPermission(Permission.CONTRACT_CREATE)
    public ResponseEntity<ContractDto> createContract(@Valid @RequestBody CreateContractRequest request) {
        ContractDto contract = contractService.createContract(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(contract);
    }

    @Operation(summary = "Get contract by ID",
            description = "Retrieves full contract details including metadata, terms, and signature status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @GetMapping("/{contractId}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<ContractDto> getContract(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        ContractDto contract = contractService.getContractById(contractId);
        return ResponseEntity.ok(contract);
    }

    @Operation(summary = "Get all contracts",
            description = "Retrieves paginated list of all contracts with summary information.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contracts retrieved successfully")
    })
    @GetMapping
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getAllContracts(Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getAllContracts(pageable);
        return ResponseEntity.ok(contracts);
    }

    @Operation(summary = "Update a contract",
            description = "Updates contract details. Only allowed for contracts in DRAFT or PENDING_REVIEW status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request or contract status prevents update"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PutMapping("/{contractId}")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> updateContract(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId,
            @Valid @RequestBody UpdateContractRequest request) {
        ContractDto contract = contractService.updateContract(contractId, request);
        return ResponseEntity.ok(contract);
    }

    @Operation(summary = "Delete a contract",
            description = "Soft-deletes a contract. Only allowed for DRAFT contracts.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Contract deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Contract status prevents deletion"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @DeleteMapping("/{contractId}")
    @RequiresPermission(Permission.CONTRACT_DELETE)
    public ResponseEntity<Void> deleteContract(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        contractService.deleteContract(contractId);
        return ResponseEntity.noContent().build();
    }

    // ===================== Filtering & Search =====================

    @Operation(summary = "Get contracts by status",
            description = "Retrieves contracts filtered by their current status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contracts retrieved successfully")
    })
    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getByStatus(
            @Parameter(description = "Contract status (DRAFT, PENDING_REVIEW, PENDING_SIGNATURES, ACTIVE, TERMINATED, EXPIRED)")
            @PathVariable ContractStatus status,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getContractsByStatus(status, pageable);
        return ResponseEntity.ok(contracts);
    }

    @Operation(summary = "Get contracts by type",
            description = "Retrieves contracts filtered by their type.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contracts retrieved successfully")
    })
    @GetMapping("/type/{type}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getByType(
            @Parameter(description = "Contract type (EMPLOYMENT, NDA, SERVICE_AGREEMENT, etc.)")
            @PathVariable ContractType type,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getContractsByType(type, pageable);
        return ResponseEntity.ok(contracts);
    }

    @Operation(summary = "Get employee's contracts",
            description = "Retrieves all contracts associated with a specific employee.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contracts retrieved successfully")
    })
    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> getEmployeeContracts(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.getEmployeeContracts(employeeId, pageable);
        return ResponseEntity.ok(contracts);
    }

    @Operation(summary = "Search contracts",
            description = "Full-text search across contract titles, descriptions, and employee names.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Search results retrieved successfully")
    })
    @GetMapping("/search")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractListDto>> searchContracts(
            @Parameter(description = "Search query string") @RequestParam String search,
            Pageable pageable) {
        Page<ContractListDto> contracts = contractService.searchContracts(search, pageable);
        return ResponseEntity.ok(contracts);
    }

    // ===================== Status Transitions =====================

    @Operation(summary = "Submit contract for review",
            description = "Transitions contract from DRAFT to PENDING_REVIEW status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract submitted for review"),
            @ApiResponse(responseCode = "400", description = "Invalid status transition"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PatchMapping("/{contractId}/mark-pending-review")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> markPendingReview(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        ContractDto contract = contractService.markAsPendingReview(contractId);
        return ResponseEntity.ok(contract);
    }

    @Operation(summary = "Send contract for signatures",
            description = "Transitions contract to PENDING_SIGNATURES status after review approval.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract sent for signatures"),
            @ApiResponse(responseCode = "400", description = "Invalid status transition"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PatchMapping("/{contractId}/mark-pending-signatures")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> markPendingSignatures(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        ContractDto contract = contractService.markAsPendingSignatures(contractId);
        return ResponseEntity.ok(contract);
    }

    @Operation(summary = "Activate contract",
            description = "Transitions contract to ACTIVE status. Typically done after all signatures are collected.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract activated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid status transition or pending signatures"),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires approval permission"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PatchMapping("/{contractId}/mark-active")
    @RequiresPermission(Permission.CONTRACT_APPROVE)
    public ResponseEntity<ContractDto> markActive(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        ContractDto contract = contractService.markAsActive(contractId);
        return ResponseEntity.ok(contract);
    }

    @Operation(summary = "Terminate contract",
            description = "Ends an active contract early. Records termination date and reason.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract terminated successfully"),
            @ApiResponse(responseCode = "400", description = "Contract is not in ACTIVE status"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PatchMapping("/{contractId}/terminate")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> terminateContract(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        ContractDto contract = contractService.terminateContract(contractId);
        return ResponseEntity.ok(contract);
    }

    @Operation(summary = "Renew contract",
            description = "Creates a renewal for an expiring or expired contract. " +
                    "Creates a new version with extended end date.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contract renewal initiated"),
            @ApiResponse(responseCode = "400", description = "Contract cannot be renewed"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PatchMapping("/{contractId}/renew")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractDto> renewContract(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        ContractDto contract = contractService.renewContract(contractId);
        return ResponseEntity.ok(contract);
    }

    // ===================== Expiry & Status Checks =====================

    @Operation(summary = "Get expiring contracts",
            description = "Retrieves contracts that will expire within the specified number of days. " +
                    "Used for proactive renewal reminders.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Expiring contracts retrieved successfully")
    })
    @GetMapping("/expiring")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractListDto>> getExpiringContracts(
            @Parameter(description = "Number of days to look ahead", example = "30")
            @RequestParam(defaultValue = "30") int days) {
        List<ContractListDto> contracts = contractService.getExpiringContracts(days);
        return ResponseEntity.ok(contracts);
    }

    @Operation(summary = "Get expired contracts",
            description = "Retrieves all contracts past their end date that haven't been renewed or terminated.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Expired contracts retrieved successfully")
    })
    @GetMapping("/expired")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractListDto>> getExpiredContracts() {
        List<ContractListDto> contracts = contractService.getExpiredContracts();
        return ResponseEntity.ok(contracts);
    }

    @Operation(summary = "Get active contracts",
            description = "Retrieves all currently active contracts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active contracts retrieved successfully")
    })
    @GetMapping("/active")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractListDto>> getActiveContracts() {
        List<ContractListDto> contracts = contractService.getActiveContracts();
        return ResponseEntity.ok(contracts);
    }

    // ===================== Version Management =====================

    @Operation(summary = "Get contract version history",
            description = "Retrieves the complete version history of a contract, including all amendments and renewals.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Version history retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @GetMapping("/{contractId}/versions")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<Map<String, Object>>> getVersionHistory(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        List<Map<String, Object>> versions = contractService.getVersionHistory(contractId);
        return ResponseEntity.ok(versions);
    }

    // ===================== Signature Management =====================

    @Operation(summary = "Send contract for signing",
            description = "Initiates the digital signature process by sending the contract to designated signers via email.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Signing request sent successfully"),
            @ApiResponse(responseCode = "400", description = "Contract is not in signable state"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @PostMapping("/{contractId}/send-for-signing")
    @RequiresPermission(Permission.CONTRACT_UPDATE)
    public ResponseEntity<ContractSignatureDto> sendForSigning(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId,
            @Valid @RequestBody SendForSigningRequest request) {
        ContractSignatureDto signature = signatureService.sendForSigning(contractId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(signature);
    }

    @Operation(summary = "Record a signature",
            description = "Records a digital signature for the contract. Called when a signer completes the signing process.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Signature recorded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or already signed"),
            @ApiResponse(responseCode = "404", description = "Contract or signer not found")
    })
    @PostMapping("/{contractId}/record-signature")
    @RequiresPermission(Permission.CONTRACT_SIGN)
    public ResponseEntity<ContractSignatureDto> recordSignature(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId,
            @Parameter(description = "Email of the signer") @RequestParam String signerEmail,
            @Parameter(description = "URL of the captured signature image") @RequestParam String signatureImageUrl,
            @Parameter(description = "IP address of the signer for audit trail") @RequestParam(required = false) String ipAddress) {
        ContractSignatureDto signature = signatureService.recordSignature(contractId, signerEmail, signatureImageUrl, ipAddress);
        return ResponseEntity.ok(signature);
    }

    @Operation(summary = "Decline to sign",
            description = "Records a signer's decision to decline signing the contract.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Decline recorded successfully"),
            @ApiResponse(responseCode = "404", description = "Contract or signer not found")
    })
    @PostMapping("/{contractId}/decline-signature")
    @RequiresPermission(Permission.CONTRACT_SIGN)
    public ResponseEntity<ContractSignatureDto> declineSignature(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId,
            @Parameter(description = "Email of the declining signer") @RequestParam String signerEmail) {
        ContractSignatureDto signature = signatureService.declineSignature(contractId, signerEmail);
        return ResponseEntity.ok(signature);
    }

    @Operation(summary = "Get all signatures",
            description = "Retrieves all signature records for a contract including pending, completed, and declined.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Signatures retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @GetMapping("/{contractId}/signatures")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractSignatureDto>> getSignatures(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        List<ContractSignatureDto> signatures = signatureService.getContractSignatures(contractId);
        return ResponseEntity.ok(signatures);
    }

    @Operation(summary = "Get pending signatures",
            description = "Retrieves only the pending signature requests that haven't been completed or declined.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pending signatures retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @GetMapping("/{contractId}/signatures/pending")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractSignatureDto>> getPendingSignatures(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        List<ContractSignatureDto> signatures = signatureService.getPendingSignatures(contractId);
        return ResponseEntity.ok(signatures);
    }

    @Operation(summary = "Get signature summary",
            description = "Returns a summary count of signatures by status (pending, signed, declined).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Summary retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Contract not found")
    })
    @GetMapping("/{contractId}/signatures/summary")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Map<String, Integer>> getSignatureSummary(
            @Parameter(description = "Contract UUID") @PathVariable UUID contractId) {
        Map<String, Integer> summary = signatureService.getSignatureSummary(contractId);
        return ResponseEntity.ok(summary);
    }
}
