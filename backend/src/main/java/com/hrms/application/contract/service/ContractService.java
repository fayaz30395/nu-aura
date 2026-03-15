package com.hrms.application.contract.service;

import com.hrms.api.contract.dto.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.contract.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.contract.repository.*;
import com.hrms.application.employee.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing contracts
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContractService {

    private final ContractRepository contractRepository;
    private final ContractVersionRepository versionRepository;
    private final ContractSignatureRepository signatureRepository;
    private final ContractReminderRepository reminderRepository;
    private final EmployeeService employeeService;

    // ===================== CRUD Operations =====================

    /**
     * Create a new contract
     */
    @Transactional
    public ContractDto createContract(CreateContractRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        Contract contract = Contract.builder()
                .tenantId(tenantId)
                .title(request.getTitle())
                .type(request.getType())
                .status(ContractStatus.DRAFT)
                .employeeId(request.getEmployeeId())
                .vendorName(request.getVendorName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .autoRenew(request.getAutoRenew() != null ? request.getAutoRenew() : false)
                .renewalPeriodDays(request.getRenewalPeriodDays())
                .value(request.getValue())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .description(request.getDescription())
                .terms(request.getTerms())
                .documentUrl(request.getDocumentUrl())
                .createdBy(userId)
                .build();

        contract = contractRepository.save(contract);
        log.info("Contract created: {} ({})", contract.getId(), contract.getTitle());

        // Create initial version
        createVersion(contract.getId(), 1, request.getTerms(), "Initial version");

        return toDto(contract);
    }

    /**
     * Update an existing contract
     */
    @Transactional
    public ContractDto updateContract(UUID contractId, UpdateContractRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        // Update fields
        if (request.getTitle() != null) contract.setTitle(request.getTitle());
        if (request.getType() != null) contract.setType(request.getType());
        if (request.getStatus() != null) contract.setStatus(request.getStatus());
        if (request.getEmployeeId() != null) contract.setEmployeeId(request.getEmployeeId());
        if (request.getVendorName() != null) contract.setVendorName(request.getVendorName());
        if (request.getStartDate() != null) contract.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) contract.setEndDate(request.getEndDate());
        if (request.getAutoRenew() != null) contract.setAutoRenew(request.getAutoRenew());
        if (request.getRenewalPeriodDays() != null) contract.setRenewalPeriodDays(request.getRenewalPeriodDays());
        if (request.getValue() != null) contract.setValue(request.getValue());
        if (request.getCurrency() != null) contract.setCurrency(request.getCurrency());
        if (request.getDescription() != null) contract.setDescription(request.getDescription());
        if (request.getTerms() != null) contract.setTerms(request.getTerms());
        if (request.getDocumentUrl() != null) contract.setDocumentUrl(request.getDocumentUrl());

        contract.setLastModifiedBy(userId);
        contract = contractRepository.save(contract);

        // Create new version if terms changed
        if (request.getTerms() != null) {
            Integer nextVersion = getNextVersionNumber(contractId);
            createVersion(contractId, nextVersion, request.getTerms(), "Updated by user");
        }

        log.info("Contract updated: {} ({})", contract.getId(), contract.getTitle());
        return toDto(contract);
    }

    /**
     * Get contract by ID
     */
    @Transactional(readOnly = true)
    public ContractDto getContractById(UUID contractId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        return toDtoWithSignatures(contract);
    }

    /**
     * Get all contracts for tenant
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getAllContracts(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findByTenantId(tenantId, pageable)
                .map(this::toListDto);
    }

    /**
     * Get contracts by status
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getContractsByStatus(ContractStatus status, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                .map(this::toListDto);
    }

    /**
     * Get contracts by type
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getContractsByType(ContractType type, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findByTenantIdAndType(tenantId, type, pageable)
                .map(this::toListDto);
    }

    /**
     * Get contracts for an employee
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getEmployeeContracts(UUID employeeId, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable)
                .map(this::toListDto);
    }

    /**
     * Search contracts
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> searchContracts(String search, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.searchContracts(tenantId, search, pageable)
                .map(this::toListDto);
    }

    /**
     * Delete contract
     */
    @Transactional
    public void deleteContract(UUID contractId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        contractRepository.delete(contract);
        log.info("Contract deleted: {}", contractId);
    }

    // ===================== Status Transitions =====================

    /**
     * Mark contract as pending review
     */
    @Transactional
    public ContractDto markAsPendingReview(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        contract.setStatus(ContractStatus.PENDING_REVIEW);
        contractRepository.save(contract);
        return toDto(contract);
    }

    /**
     * Mark contract as pending signatures
     */
    @Transactional
    public ContractDto markAsPendingSignatures(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        contract.setStatus(ContractStatus.PENDING_SIGNATURES);
        contractRepository.save(contract);
        return toDto(contract);
    }

    /**
     * Mark contract as active
     */
    @Transactional
    public ContractDto markAsActive(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        contract.markAsActive();
        contractRepository.save(contract);
        return toDto(contract);
    }

    /**
     * Mark contract as terminated
     */
    public ContractDto terminateContract(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        contract.markAsTerminated();
        contractRepository.save(contract);
        log.info("Contract terminated: {}", contractId);
        return toDto(contract);
    }

    /**
     * Renew contract
     */
    public ContractDto renewContract(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        if (contract.getEndDate() != null && contract.getRenewalPeriodDays() != null) {
            LocalDate newEndDate = contract.getEndDate().plusDays(contract.getRenewalPeriodDays());
            contract.setEndDate(newEndDate);
            contract.setStatus(ContractStatus.RENEWED);
            contractRepository.save(contract);
            log.info("Contract renewed: {} (new end date: {})", contractId, newEndDate);
        }
        return toDto(contract);
    }

    // ===================== Expiry and Status Checks =====================

    /**
     * Get expiring contracts
     */
    @Transactional(readOnly = true)
    public List<ContractListDto> getExpiringContracts(int days) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        LocalDate today = LocalDate.now();
        LocalDate expiryDate = today.plusDays(days);

        return contractRepository.findExpiringContracts(tenantId, ContractStatus.ACTIVE, today, expiryDate)
                .stream()
                .map(this::toListDto)
                .collect(Collectors.toList());
    }

    /**
     * Get expired contracts
     */
    @Transactional(readOnly = true)
    public List<ContractListDto> getExpiredContracts() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findExpiredContracts(tenantId)
                .stream()
                .map(this::toListDto)
                .collect(Collectors.toList());
    }

    /**
     * Get active contracts
     */
    @Transactional(readOnly = true)
    public List<ContractListDto> getActiveContracts() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findActiveContracts(tenantId)
                .stream()
                .map(this::toListDto)
                .collect(Collectors.toList());
    }

    // ===================== Version Management =====================

    /**
     * Get version history
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getVersionHistory(UUID contractId) {
        List<ContractVersion> versions = versionRepository.findByContractIdOrderByVersionNumberDesc(contractId);
        return versions.stream()
                .map(v -> Map.of(
                        "versionNumber", v.getVersionNumber(),
                        "changeNotes", v.getChangeNotes(),
                        "createdAt", v.getCreatedAt(),
                        "content", v.getContent()
                ))
                .collect(Collectors.toList());
    }

    // ===================== Helper Methods =====================

    private void createVersion(UUID contractId, Integer versionNumber, Map<String, Object> content, String changeNotes) {
        ContractVersion version = ContractVersion.builder()
                .contractId(contractId)
                .versionNumber(versionNumber)
                .content(content)
                .changeNotes(changeNotes)
                .createdBy(SecurityContext.getCurrentUserId())
                .build();
        versionRepository.save(version);
    }

    private Integer getNextVersionNumber(UUID contractId) {
        Integer maxVersion = versionRepository.findMaxVersionNumber(contractId);
        return (maxVersion != null ? maxVersion : 0) + 1;
    }

    private Contract getContractEntity(UUID contractId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
    }

    private ContractDto toDto(Contract contract) {
        String employeeName = null;
        if (contract.getEmployeeId() != null) {
            try {
                Employee emp = employeeService.getByIdAndTenant(contract.getEmployeeId(), SecurityContext.getCurrentTenantId());
                employeeName = emp.getFirstName() + " " + emp.getLastName();
            } catch (Exception e) {
                log.debug("Could not load employee for contract: {}", contract.getEmployeeId());
            }
        }

        return ContractDto.builder()
                .id(contract.getId())
                .title(contract.getTitle())
                .type(contract.getType())
                .status(contract.getStatus())
                .employeeId(contract.getEmployeeId())
                .employeeName(employeeName)
                .vendorName(contract.getVendorName())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .autoRenew(contract.getAutoRenew())
                .renewalPeriodDays(contract.getRenewalPeriodDays())
                .value(contract.getValue())
                .currency(contract.getCurrency())
                .description(contract.getDescription())
                .terms(contract.getTerms())
                .documentUrl(contract.getDocumentUrl())
                .createdBy(contract.getCreatedBy())
                .createdAt(contract.getCreatedAt())
                .updatedBy(contract.getLastModifiedBy())
                .updatedAt(contract.getUpdatedAt())
                .build();
    }

    private ContractDto toDtoWithSignatures(Contract contract) {
        ContractDto dto = toDto(contract);
        List<ContractSignature> signatures = signatureRepository.findByContractId(contract.getId());
        dto.setSignatureCount(signatures.size());
        dto.setPendingSignatureCount((int) signatures.stream()
                .filter(s -> s.getStatus() == SignatureStatus.PENDING)
                .count());
        dto.setSignatures(signatures.stream().map(this::toSignatureDto).collect(Collectors.toList()));
        return dto;
    }

    private ContractListDto toListDto(Contract contract) {
        String employeeName = null;
        if (contract.getEmployeeId() != null) {
            try {
                Employee emp = employeeService.getByIdAndTenant(contract.getEmployeeId(), SecurityContext.getCurrentTenantId());
                employeeName = emp.getFirstName() + " " + emp.getLastName();
            } catch (Exception e) {
                log.debug("Could not load employee for contract: {}", contract.getEmployeeId());
            }
        }

        int pendingSignatures = signatureRepository.findPendingSignatures(contract.getId()).size();

        return ContractListDto.builder()
                .id(contract.getId())
                .title(contract.getTitle())
                .type(contract.getType())
                .status(contract.getStatus())
                .employeeName(employeeName)
                .vendorName(contract.getVendorName())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .value(contract.getValue())
                .currency(contract.getCurrency())
                .pendingSignatureCount(pendingSignatures)
                .createdAt(contract.getCreatedAt())
                .isExpiring(contract.isExpiringWithin(30))
                .isExpired(contract.isExpired())
                .build();
    }

    private ContractSignatureDto toSignatureDto(ContractSignature sig) {
        return ContractSignatureDto.builder()
                .id(sig.getId())
                .contractId(sig.getContractId())
                .signerId(sig.getSignerId())
                .signerName(sig.getSignerName())
                .signerEmail(sig.getSignerEmail())
                .signerRole(sig.getSignerRole())
                .status(sig.getStatus())
                .signedAt(sig.getSignedAt())
                .signatureImageUrl(sig.getSignatureImageUrl())
                .createdAt(sig.getCreatedAt())
                .build();
    }
}
