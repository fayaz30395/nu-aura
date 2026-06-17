package com.nulogic.application.contract.service;

import com.nulogic.api.contract.dto.*;
import com.nulogic.application.employee.service.EmployeeService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.metrics.MetricsService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.contract.*;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.contract.repository.ContractReminderRepository;
import com.nulogic.infrastructure.contract.repository.ContractRepository;
import com.nulogic.infrastructure.contract.repository.ContractSignatureRepository;
import com.nulogic.infrastructure.contract.repository.ContractVersionRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
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
    private final EmployeeRepository employeeRepository;
    private final MetricsService metricsService;
    private final TenantTimeService tenantTimeService;

    // ===================== CRUD Operations =====================

    /**
     * Create a new contract
     */
    @Transactional
    public ContractDto createContract(CreateContractRequest request) {
        Instant start = Instant.now();
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

        // Record metrics
        metricsService.recordContractLifecycle(
                tenantId, "create", contract.getType().name(), Duration.between(start, Instant.now()));

        return toDto(contract);
    }

    /**
     * Update an existing contract
     */
    @Transactional
    public ContractDto updateContract(UUID contractId, UpdateContractRequest request) {
        Instant start = Instant.now();
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        ContractStatus previousStatus = contract.getStatus();

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

        // Record metrics
        metricsService.recordContractLifecycle(
                tenantId, "update", contract.getType().name(), Duration.between(start, Instant.now()));
        if (request.getStatus() != null && request.getStatus() != previousStatus) {
            metricsService.recordContractStatusChange(tenantId, previousStatus.name(), request.getStatus().name());
        }

        return toDto(contract);
    }

    /**
     * Get contract by ID.
     *
     * <p>BOLA FIX: the controller-level @RequiresPermission(CONTRACT:VIEW) is
     * tenant-scoped only; without an entity-level check, any employee with
     * CONTRACT:VIEW could fetch every contract in the tenant by enumerating
     * UUIDs. HR Managers / Tenant Admins / SuperAdmins keep tenant-wide
     * access; everyone else must be the contract's employee (e.g., signed by
     * them).
     */
    @Transactional(readOnly = true)
    public ContractDto getContractById(UUID contractId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        // HR-level and above see all contracts for the tenant. The Contract entity only
        // exposes `employeeId` as an association — there is no counterparty field today —
        // so non-HR callers may only view their own contract.
        if (!SecurityContext.isHRManager()) {
            UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
            boolean isOwner = contract.getEmployeeId() != null
                    && contract.getEmployeeId().equals(currentEmployeeId);
            if (!isOwner) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Not authorized to view this contract");
            }
        }

        return toDtoWithSignatures(contract);
    }

    /**
     * Get all contracts for tenant.
     * Employees with only CONTRACT:VIEW see their own contracts;
     * HR Admin / HR Manager / SuperAdmin see all tenant contracts.
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getAllContracts(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        // If the caller is HR-level or above, return all contracts for the tenant.
        // Otherwise, scope to the current employee's own contracts only.
        if (SecurityContext.isHRManager()) {
            return mapContractPage(contractRepository.findByTenantId(tenantId, pageable));
        }

        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId != null) {
            return mapContractPage(contractRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable));
        }

        // Fallback: no employee ID on context — return empty page
        return Page.empty(pageable);
    }

    /**
     * Get contracts by status
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getContractsByStatus(ContractStatus status, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractPage(contractRepository.findByTenantIdAndStatus(tenantId, status, pageable));
    }

    /**
     * Get contracts by type
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getContractsByType(ContractType type, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractPage(contractRepository.findByTenantIdAndType(tenantId, type, pageable));
    }

    /**
     * Get contracts for an employee
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getEmployeeContracts(UUID employeeId, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractPage(contractRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable));
    }

    /**
     * Search contracts
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> searchContracts(String search, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractPage(contractRepository.searchContracts(tenantId, search, pageable));
    }

    /**
     * Soft-delete contract. The record is preserved for audit trail purposes.
     */
    @Transactional
    public void deleteContract(UUID contractId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        String contractType = contract.getType().name();
        contract.softDelete();
        contractRepository.save(contract);
        log.info("Contract soft-deleted: {}", contractId);

        // Record metrics
        metricsService.recordContractLifecycle(tenantId, "delete", contractType);
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
        ContractStatus previousStatus = contract.getStatus();
        contract.markAsActive();
        contractRepository.save(contract);

        // Record metrics
        UUID tenantId = SecurityContext.getCurrentTenantId();
        metricsService.recordContractLifecycle(tenantId, "activate", contract.getType().name());
        metricsService.recordContractStatusChange(tenantId, previousStatus.name(), ContractStatus.ACTIVE.name());

        return toDto(contract);
    }

    /**
     * Mark contract as terminated
     */
    @Transactional
    public ContractDto terminateContract(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        ContractStatus previousStatus = contract.getStatus();
        contract.markAsTerminated();
        contractRepository.save(contract);
        log.info("Contract terminated: {}", contractId);

        // Record metrics
        UUID tenantId = SecurityContext.getCurrentTenantId();
        metricsService.recordContractLifecycle(tenantId, "terminate", contract.getType().name());
        metricsService.recordContractStatusChange(tenantId, previousStatus.name(), ContractStatus.TERMINATED.name());

        return toDto(contract);
    }

    /**
     * Renew contract
     */
    @Transactional
    public ContractDto renewContract(UUID contractId) {
        Contract contract = getContractEntity(contractId);
        ContractStatus previousStatus = contract.getStatus();
        if (contract.getEndDate() != null && contract.getRenewalPeriodDays() != null) {
            LocalDate newEndDate = contract.getEndDate().plusDays(contract.getRenewalPeriodDays());
            contract.setEndDate(newEndDate);
            contract.setStatus(ContractStatus.RENEWED);
            contractRepository.save(contract);
            log.info("Contract renewed: {} (new end date: {})", contractId, newEndDate);

            // Record metrics
            UUID tenantId = SecurityContext.getCurrentTenantId();
            metricsService.recordContractLifecycle(tenantId, "renew", contract.getType().name());
            metricsService.recordContractStatusChange(tenantId, previousStatus.name(), ContractStatus.RENEWED.name());
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
        // S12-B: tenant-local "today" for expiring-contracts window — resolved via TenantTimeService.
        LocalDate today = tenantTimeService.today(tenantId);
        LocalDate expiryDate = today.plusDays(days);

        return mapContractList(
                contractRepository.findExpiringContracts(tenantId, ContractStatus.ACTIVE, today, expiryDate));
    }

    /**
     * Get expiring contracts (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getExpiringContracts(int days, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        // S12-B: tenant-local "today" for expiring-contracts window (paginated) — resolved via TenantTimeService.
        LocalDate today = tenantTimeService.today(tenantId);
        LocalDate expiryDate = today.plusDays(days);

        return mapContractPage(
                contractRepository.findExpiringContracts(tenantId, ContractStatus.ACTIVE, today, expiryDate, pageable));
    }

    /**
     * Get expired contracts
     */
    @Transactional(readOnly = true)
    public List<ContractListDto> getExpiredContracts() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractList(contractRepository.findExpiredContracts(tenantId));
    }

    /**
     * Get expired contracts (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getExpiredContracts(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractPage(contractRepository.findExpiredContracts(tenantId, pageable));
    }

    /**
     * Get active contracts
     */
    @Transactional(readOnly = true)
    public List<ContractListDto> getActiveContracts() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractList(contractRepository.findActiveContracts(tenantId));
    }

    /**
     * Get active contracts (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ContractListDto> getActiveContracts(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return mapContractPage(contractRepository.findActiveContracts(tenantId, pageable));
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

    /**
     * Get version history (paginated)
     */
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getVersionHistory(UUID contractId, Pageable pageable) {
        return versionRepository.findByContractIdOrderByVersionNumberDesc(contractId, pageable)
                .map(v -> Map.of(
                        "versionNumber", (Object) v.getVersionNumber(),
                        "changeNotes", (Object) v.getChangeNotes(),
                        "createdAt", (Object) v.getCreatedAt(),
                        "content", (Object) v.getContent()
                ));
    }

    // ===================== Helper Methods =====================

    private void createVersion(UUID contractId, Integer versionNumber, Map<String, Object> content, String changeNotes) {
        // BUG-QA2-002 FIX: Default null content to empty map to prevent JSONB NOT NULL violation.
        // contract_versions.content is NOT NULL in the DDL; passing null causes PSQLException.
        Map<String, Object> safeContent = (content != null) ? content : java.util.Collections.emptyMap();
        ContractVersion version = ContractVersion.builder()
                .contractId(contractId)
                .versionNumber(versionNumber)
                .content(safeContent)
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
            } catch (ResourceNotFoundException e) {
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

    /**
     * P2: Batch-maps a page of contracts. Employee names and pending-signature
     * counts are resolved once per page via a single findAllById and a single
     * grouped countPendingByContractIds, replacing the two per-row lookups
     * (employeeService.getByIdAndTenant + signatureRepository.findPendingSignatures)
     * that toListDto fired for each contract.
     */
    private Page<ContractListDto> mapContractPage(Page<Contract> contracts) {
        List<Contract> content = contracts.getContent();
        Map<UUID, String> employeeNames = buildEmployeeNameCache(content);
        Map<UUID, Integer> pendingCounts = buildPendingSignatureCache(content);
        return contracts.map(c -> toListDto(c, employeeNames, pendingCounts));
    }

    private List<ContractListDto> mapContractList(List<Contract> contracts) {
        Map<UUID, String> employeeNames = buildEmployeeNameCache(contracts);
        Map<UUID, Integer> pendingCounts = buildPendingSignatureCache(contracts);
        return contracts.stream()
                .map(c -> toListDto(c, employeeNames, pendingCounts))
                .collect(Collectors.toList());
    }

    private Map<UUID, String> buildEmployeeNameCache(List<Contract> contracts) {
        Set<UUID> employeeIds = new HashSet<>();
        for (Contract contract : contracts) {
            if (contract.getEmployeeId() != null) {
                employeeIds.add(contract.getEmployeeId());
            }
        }
        Map<UUID, String> names = new HashMap<>();
        if (!employeeIds.isEmpty()) {
            employeeRepository.findAllById(employeeIds)
                    .forEach(emp -> names.put(emp.getId(), emp.getFirstName() + " " + emp.getLastName()));
        }
        return names;
    }

    private Map<UUID, Integer> buildPendingSignatureCache(List<Contract> contracts) {
        List<UUID> contractIds = contracts.stream()
                .map(Contract::getId)
                .collect(Collectors.toList());
        Map<UUID, Integer> counts = new HashMap<>();
        if (!contractIds.isEmpty()) {
            signatureRepository.countPendingByContractIds(contractIds)
                    .forEach(row -> counts.put((UUID) row[0], ((Long) row[1]).intValue()));
        }
        return counts;
    }

    private ContractListDto toListDto(Contract contract) {
        return toListDto(contract,
                buildEmployeeNameCache(List.of(contract)),
                buildPendingSignatureCache(List.of(contract)));
    }

    private ContractListDto toListDto(Contract contract,
                                      Map<UUID, String> employeeNames,
                                      Map<UUID, Integer> pendingCounts) {
        String employeeName = contract.getEmployeeId() != null
                ? employeeNames.get(contract.getEmployeeId()) : null;

        int pendingSignatures = pendingCounts.getOrDefault(contract.getId(), 0);

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
                .isExpiring(contract.isExpiringWithin(30, tenantTimeService.today(contract.getTenantId())))
                .isExpired(contract.isExpired(tenantTimeService.today(contract.getTenantId())))
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
