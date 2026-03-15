package com.hrms.application.contract.service;

import com.hrms.api.contract.dto.ContractSignatureDto;
import com.hrms.api.contract.dto.SendForSigningRequest;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.contract.ContractSignature;
import com.hrms.domain.contract.SignatureStatus;
import com.hrms.domain.contract.SignerRole;
import com.hrms.infrastructure.contract.repository.ContractSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing contract signatures
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContractSignatureService {

    private final ContractSignatureRepository signatureRepository;

    /**
     * Send contract for signing
     */
    @Transactional
    public ContractSignatureDto sendForSigning(UUID contractId, SendForSigningRequest request) {
        ContractSignature signature = ContractSignature.builder()
                .contractId(contractId)
                .signerName(request.getSignerName())
                .signerEmail(request.getSignerEmail())
                .signerRole(request.getSignerRole() != null ? request.getSignerRole() : SignerRole.EMPLOYEE)
                .status(SignatureStatus.PENDING)
                .build();

        signature = signatureRepository.save(signature);
        log.info("Signature request sent to {} for contract {}", request.getSignerEmail(), contractId);
        return toDto(signature);
    }

    /**
     * Record signature
     */
    public ContractSignatureDto recordSignature(UUID contractId, String signerEmail, String signatureImageUrl, String ipAddress) {
        ContractSignature signature = signatureRepository.findByContractIdAndSignerEmail(contractId, signerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Signature not found"));

        signature.markAsSigned();
        signature.setSignatureImageUrl(signatureImageUrl);
        signature.setIpAddress(ipAddress);
        signature = signatureRepository.save(signature);
        log.info("Signature recorded for {} on contract {}", signerEmail, contractId);
        return toDto(signature);
    }

    /**
     * Decline signature
     */
    public ContractSignatureDto declineSignature(UUID contractId, String signerEmail) {
        ContractSignature signature = signatureRepository.findByContractIdAndSignerEmail(contractId, signerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Signature not found"));

        signature.markAsDeclined();
        signature = signatureRepository.save(signature);
        log.info("Signature declined by {} for contract {}", signerEmail, contractId);
        return toDto(signature);
    }

    /**
     * Get all signatures for contract
     */
    @Transactional(readOnly = true)
    public List<ContractSignatureDto> getContractSignatures(UUID contractId) {
        return signatureRepository.findByContractId(contractId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get pending signatures for contract
     */
    @Transactional(readOnly = true)
    public List<ContractSignatureDto> getPendingSignatures(UUID contractId) {
        return signatureRepository.findPendingSignatures(contractId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Check if all signatures are completed
     */
    public boolean allSignaturesCompleted(UUID contractId) {
        return signatureRepository.allSignaturesCompleted(contractId);
    }

    /**
     * Get signature count and signed count
     */
    @Transactional(readOnly = true)
    public Map<String, Integer> getSignatureSummary(UUID contractId) {
        int total = signatureRepository.countTotalSignatures(contractId);
        int signed = signatureRepository.countSignedSignatures(contractId);
        return java.util.Map.of(
                "total", total,
                "signed", signed,
                "pending", total - signed
        );
    }

    private ContractSignatureDto toDto(ContractSignature signature) {
        return ContractSignatureDto.builder()
                .id(signature.getId())
                .contractId(signature.getContractId())
                .signerId(signature.getSignerId())
                .signerName(signature.getSignerName())
                .signerEmail(signature.getSignerEmail())
                .signerRole(signature.getSignerRole())
                .status(signature.getStatus())
                .signedAt(signature.getSignedAt())
                .signatureImageUrl(signature.getSignatureImageUrl())
                .createdAt(signature.getCreatedAt())
                .build();
    }
}
