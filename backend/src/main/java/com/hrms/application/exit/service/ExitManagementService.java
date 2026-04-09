package com.hrms.application.exit.service;

import com.hrms.api.exit.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.exit.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.exit.repository.*;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ExitManagementService {

    private static final String EXIT_PROCESS_NOT_FOUND = "Exit process not found";
    private static final String EXIT_CLEARANCE_NOT_FOUND = "Exit clearance not found";
    private static final String SETTLEMENT_NOT_FOUND = "Settlement not found";
    private static final String EXIT_INTERVIEW_NOT_FOUND = "Exit interview not found";
    private static final String ASSET_RECOVERY_NOT_FOUND = "Asset recovery not found";

    private final ExitProcessRepository exitProcessRepository;
    private final ExitClearanceRepository exitClearanceRepository;
    private final FullAndFinalSettlementRepository settlementRepository;
    private final ExitInterviewRepository exitInterviewRepository;
    private final AssetRecoveryRepository assetRecoveryRepository;
    private final EmployeeRepository employeeRepository;
    private final EventPublisher eventPublisher;

    // ==================== Exit Process Operations ====================

    @Transactional
    public ExitProcessResponse createExitProcess(ExitProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating exit process for employee {} in tenant {}", request.getEmployeeId(), tenantId);

        // Verify employee exists within the current tenant (BUG-NEW-001: prevent cross-tenant lookup)
        employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        ExitProcess exitProcess = new ExitProcess();
        exitProcess.setId(UUID.randomUUID());
        exitProcess.setTenantId(tenantId);
        exitProcess.setEmployeeId(request.getEmployeeId());
        exitProcess.setExitType(request.getExitType());
        exitProcess.setResignationDate(request.getResignationDate());
        exitProcess.setLastWorkingDate(request.getLastWorkingDate());
        exitProcess.setNoticePeriodDays(request.getNoticePeriodDays());
        exitProcess.setNoticePeriodServed(request.getNoticePeriodServed());
        exitProcess.setBuyoutAmount(request.getBuyoutAmount());
        exitProcess.setReasonForLeaving(request.getReasonForLeaving());
        exitProcess.setNewCompany(request.getNewCompany());
        exitProcess.setNewDesignation(request.getNewDesignation());
        exitProcess.setStatus(request.getStatus() != null ? request.getStatus() : ExitProcess.ExitStatus.INITIATED);
        exitProcess.setRehireEligible(request.getRehireEligible());
        exitProcess.setExitInterviewScheduled(request.getExitInterviewScheduled());
        exitProcess.setExitInterviewDate(request.getExitInterviewDate());
        exitProcess.setExitInterviewFeedback(request.getExitInterviewFeedback());
        exitProcess.setFinalSettlementAmount(request.getFinalSettlementAmount());
        exitProcess.setSettlementDate(request.getSettlementDate());
        exitProcess.setManagerId(request.getManagerId());
        exitProcess.setHrSpocId(request.getHrSpocId());
        exitProcess.setNotes(request.getNotes());

        ExitProcess savedProcess = exitProcessRepository.save(exitProcess);
        return mapToExitProcessResponse(savedProcess);
    }

    @Transactional
    public ExitProcessResponse updateExitProcess(UUID processId, ExitProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating exit process {} for tenant {}", processId, tenantId);

        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_PROCESS_NOT_FOUND));

        exitProcess.setResignationDate(request.getResignationDate());
        exitProcess.setLastWorkingDate(request.getLastWorkingDate());
        exitProcess.setNoticePeriodDays(request.getNoticePeriodDays());
        exitProcess.setNoticePeriodServed(request.getNoticePeriodServed());
        exitProcess.setBuyoutAmount(request.getBuyoutAmount());
        exitProcess.setReasonForLeaving(request.getReasonForLeaving());
        exitProcess.setNewCompany(request.getNewCompany());
        exitProcess.setNewDesignation(request.getNewDesignation());
        exitProcess.setStatus(request.getStatus());
        exitProcess.setRehireEligible(request.getRehireEligible());
        exitProcess.setExitInterviewScheduled(request.getExitInterviewScheduled());
        exitProcess.setExitInterviewDate(request.getExitInterviewDate());
        exitProcess.setExitInterviewFeedback(request.getExitInterviewFeedback());
        exitProcess.setFinalSettlementAmount(request.getFinalSettlementAmount());
        exitProcess.setSettlementDate(request.getSettlementDate());
        exitProcess.setManagerId(request.getManagerId());
        exitProcess.setHrSpocId(request.getHrSpocId());
        exitProcess.setNotes(request.getNotes());

        ExitProcess updatedProcess = exitProcessRepository.save(exitProcess);

        if (request.getStatus() == ExitProcess.ExitStatus.COMPLETED) {
            publishOffboardedEvent(updatedProcess, tenantId);
        }

        return mapToExitProcessResponse(updatedProcess);
    }

    @Transactional
    public ExitProcessResponse updateExitStatus(UUID processId, ExitProcess.ExitStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating exit process {} status to {} for tenant {}", processId, status, tenantId);

        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_PROCESS_NOT_FOUND));

        exitProcess.setStatus(status);

        ExitProcess updatedProcess = exitProcessRepository.save(exitProcess);

        if (status == ExitProcess.ExitStatus.COMPLETED) {
            // NEW-09 FIX: Synchronously terminate employee and revoke access when exit completes.
            // Don't rely solely on Kafka consumer — if consumer is down, user retains active access.
            try {
                Employee employee = employeeRepository.findByIdAndTenantId(
                        exitProcess.getEmployeeId(), tenantId).orElse(null);
                if (employee != null && employee.getStatus() != Employee.EmployeeStatus.TERMINATED) {
                    employee.terminate();
                    employeeRepository.save(employee);
                    log.info("Employee {} terminated synchronously on exit completion", exitProcess.getEmployeeId());
                }
            } catch (Exception e) {
                log.error("Failed to terminate employee {} on exit completion: {}",
                        exitProcess.getEmployeeId(), e.getMessage());
            }

            publishOffboardedEvent(updatedProcess, tenantId);
        }

        return mapToExitProcessResponse(updatedProcess);
    }

    @Transactional(readOnly = true)
    public ExitProcessResponse getExitProcessById(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_PROCESS_NOT_FOUND));
        return mapToExitProcessResponse(exitProcess);
    }

    @Transactional(readOnly = true)
    public ExitProcessResponse getExitProcessByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitProcess exitProcess = exitProcessRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("No exit process found for employee"));
        return mapToExitProcessResponse(exitProcess);
    }

    /**
     * Get all exit processes for the tenant.
     * BUG-R03 FIX: Employees see only their own exit process;
     * HR Admin / HR Manager / SuperAdmin see all tenant exit processes.
     */
    @Transactional(readOnly = true)
    public Page<ExitProcessResponse> getAllExitProcesses(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // If the caller is HR-level or above, return all exit processes for the tenant.
        // Otherwise, scope to the current employee's own exit process only.
        if (SecurityContext.isHRManager()) {
            return exitProcessRepository.findAll(
                    (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                    pageable
            ).map(this::mapToExitProcessResponse);
        }

        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId != null) {
            return exitProcessRepository.findAll(
                    (root, query, cb) -> cb.and(
                            cb.equal(root.get("tenantId"), tenantId),
                            cb.equal(root.get("employeeId"), employeeId)
                    ),
                    pageable
            ).map(this::mapToExitProcessResponse);
        }

        // Fallback: no employee ID on context — return empty page
        return Page.empty(pageable);
    }

    @Transactional(readOnly = true)
    public List<ExitProcessResponse> getExitProcessesByStatus(ExitProcess.ExitStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitProcessRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToExitProcessResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteExitProcess(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_PROCESS_NOT_FOUND));
        exitProcessRepository.delete(exitProcess);
    }

    // ==================== Exit Clearance Operations ====================

    @Transactional
    public ExitClearanceResponse createExitClearance(ExitClearanceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating exit clearance for process {} in tenant {}", request.getExitProcessId(), tenantId);

        ExitClearance clearance = new ExitClearance();
        clearance.setId(UUID.randomUUID());
        clearance.setTenantId(tenantId);
        clearance.setExitProcessId(request.getExitProcessId());
        clearance.setDepartment(request.getDepartment());
        clearance.setApproverId(request.getApproverId());
        clearance.setStatus(request.getStatus() != null ? request.getStatus() : ExitClearance.ClearanceStatus.PENDING);
        clearance.setRequestedDate(request.getRequestedDate());
        clearance.setApprovedDate(request.getApprovedDate());
        clearance.setComments(request.getComments());
        clearance.setChecklistItems(request.getChecklistItems());

        ExitClearance savedClearance = exitClearanceRepository.save(clearance);
        return mapToExitClearanceResponse(savedClearance);
    }

    @Transactional
    public ExitClearanceResponse updateExitClearance(UUID clearanceId, ExitClearanceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating exit clearance {} for tenant {}", clearanceId, tenantId);

        ExitClearance clearance = exitClearanceRepository.findByIdAndTenantId(clearanceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_CLEARANCE_NOT_FOUND));

        clearance.setApproverId(request.getApproverId());
        clearance.setStatus(request.getStatus());
        clearance.setRequestedDate(request.getRequestedDate());
        clearance.setApprovedDate(request.getApprovedDate());
        clearance.setComments(request.getComments());
        clearance.setChecklistItems(request.getChecklistItems());

        ExitClearance updatedClearance = exitClearanceRepository.save(clearance);
        return mapToExitClearanceResponse(updatedClearance);
    }

    @Transactional(readOnly = true)
    public List<ExitClearanceResponse> getClearancesByExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitClearanceRepository.findByTenantIdAndExitProcessId(tenantId, exitProcessId).stream()
                .map(this::mapToExitClearanceResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExitClearanceResponse> getClearancesByApprover(UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitClearanceRepository.findByTenantIdAndApproverId(tenantId, approverId).stream()
                .map(this::mapToExitClearanceResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteExitClearance(UUID clearanceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitClearance clearance = exitClearanceRepository.findByIdAndTenantId(clearanceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_CLEARANCE_NOT_FOUND));
        exitClearanceRepository.delete(clearance);
    }

    // ==================== Event Publishing ====================

    /**
     * Publishes an OFFBOARDED employee lifecycle event to Kafka when an exit process
     * reaches COMPLETED status. Enables downstream consumers to disable access,
     * revoke assets, update approval chains, and notify stakeholders.
     *
     * <p>Best-effort: failures are logged but do not roll back the exit process
     * transaction, matching the pattern used by {@link com.hrms.application.event.listener.KafkaDomainEventBridge}.</p>
     */
    private void publishOffboardedEvent(ExitProcess exitProcess, UUID tenantId) {
        UUID employeeId = exitProcess.getEmployeeId();
        try {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee == null) {
                log.warn("Cannot publish OFFBOARDED event: employee {} not found", employeeId);
                return;
            }

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("reason", exitProcess.getReasonForLeaving());
            metadata.put("lastWorkingDay", exitProcess.getLastWorkingDate() != null
                    ? exitProcess.getLastWorkingDate().toString() : null);
            metadata.put("exitType", exitProcess.getExitType() != null
                    ? exitProcess.getExitType().name() : null);
            metadata.put("exitProcessId", exitProcess.getId().toString());
            if (exitProcess.getManagerId() != null) {
                metadata.put("managerId", exitProcess.getManagerId().toString());
            }

            String email = employee.getUser() != null ? employee.getUser().getEmail() : employee.getPersonalEmail();
            String name = employee.getFullName();

            eventPublisher.publishEmployeeLifecycleEvent(
                    employeeId,
                    "OFFBOARDED",
                    SecurityContext.getCurrentUserId(),
                    tenantId,
                    email,
                    name,
                    employee.getDepartmentId(),
                    employee.getManagerId(),
                    employee.getDesignation(),
                    employee.getEmploymentType() != null ? employee.getEmploymentType().name() : null,
                    metadata,
                    false
            ).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish OFFBOARDED lifecycle event for employee {}: {}",
                            employeeId, ex.getMessage(), ex);
                } else {
                    log.info("Published OFFBOARDED lifecycle event for employee {} (exit process {})",
                            employeeId, exitProcess.getId());
                }
            });

        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.error("Error publishing OFFBOARDED lifecycle event for employee {}: {}",
                    employeeId, e.getMessage(), e);
            // Best-effort: do not propagate — the exit process status is already saved
        }
    }

    // ==================== Mapper Methods ====================

    /**
     * Resolves an employee's full name by ID using a lightweight JPQL projection.
     *
     * <p>Uses {@code findFullNameById} instead of {@code findById} to avoid loading
     * the full Employee entity. Full entity hydration triggers
     * {@code EncryptedStringConverter} on the {@code taxId} column, which fails if
     * the stored ciphertext is corrupted or the encryption key differs. That failure
     * marks the enclosing {@code @Transactional} as rollback-only, causing an
     * {@code UnexpectedRollbackException} (500) even when the caller catches the
     * decryption error.</p>
     */
    private String safeGetEmployeeName(UUID employeeId) {
        if (employeeId == null) {
            return null;
        }
        try {
            return employeeRepository.findFullNameById(employeeId).orElse(null);
        } catch (Exception e) {
            log.warn("Could not resolve employee name for id={}: {}", employeeId, e.getMessage());
            return null;
        }
    }

    private ExitProcessResponse mapToExitProcessResponse(ExitProcess exitProcess) {
        String employeeName = safeGetEmployeeName(exitProcess.getEmployeeId());
        String managerName = safeGetEmployeeName(exitProcess.getManagerId());
        String hrSpocName = safeGetEmployeeName(exitProcess.getHrSpocId());

        return ExitProcessResponse.builder()
                .id(exitProcess.getId())
                .tenantId(exitProcess.getTenantId())
                .employeeId(exitProcess.getEmployeeId())
                .employeeName(employeeName)
                .exitType(exitProcess.getExitType())
                .resignationDate(exitProcess.getResignationDate())
                .lastWorkingDate(exitProcess.getLastWorkingDate())
                .noticePeriodDays(exitProcess.getNoticePeriodDays())
                .noticePeriodServed(exitProcess.getNoticePeriodServed())
                .buyoutAmount(exitProcess.getBuyoutAmount())
                .reasonForLeaving(exitProcess.getReasonForLeaving())
                .newCompany(exitProcess.getNewCompany())
                .newDesignation(exitProcess.getNewDesignation())
                .status(exitProcess.getStatus())
                .rehireEligible(exitProcess.getRehireEligible())
                .exitInterviewScheduled(exitProcess.getExitInterviewScheduled())
                .exitInterviewDate(exitProcess.getExitInterviewDate())
                .exitInterviewFeedback(exitProcess.getExitInterviewFeedback())
                .finalSettlementAmount(exitProcess.getFinalSettlementAmount())
                .settlementDate(exitProcess.getSettlementDate())
                .managerId(exitProcess.getManagerId())
                .managerName(managerName)
                .hrSpocId(exitProcess.getHrSpocId())
                .hrSpocName(hrSpocName)
                .notes(exitProcess.getNotes())
                .createdAt(exitProcess.getCreatedAt())
                .updatedAt(exitProcess.getUpdatedAt())
                .build();
    }

    private ExitClearanceResponse mapToExitClearanceResponse(ExitClearance clearance) {
        String employeeName = exitProcessRepository.findById(clearance.getExitProcessId())
                .map(ep -> safeGetEmployeeName(ep.getEmployeeId()))
                .orElse(null);

        String approverName = safeGetEmployeeName(clearance.getApproverId());

        return ExitClearanceResponse.builder()
                .id(clearance.getId())
                .tenantId(clearance.getTenantId())
                .exitProcessId(clearance.getExitProcessId())
                .employeeName(employeeName)
                .department(clearance.getDepartment())
                .approverId(clearance.getApproverId())
                .approverName(approverName)
                .status(clearance.getStatus())
                .requestedDate(clearance.getRequestedDate())
                .approvedDate(clearance.getApprovedDate())
                .comments(clearance.getComments())
                .checklistItems(clearance.getChecklistItems())
                .createdAt(clearance.getCreatedAt())
                .updatedAt(clearance.getUpdatedAt())
                .build();
    }

    // ==================== Full & Final Settlement Operations ====================

    @Transactional
    public FullAndFinalSettlementResponse createSettlement(FullAndFinalSettlementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();
        log.info("Creating F&F settlement for exit process {} in tenant {}", request.getExitProcessId(), tenantId);

        FullAndFinalSettlement settlement = new FullAndFinalSettlement();
        settlement.setTenantId(tenantId);
        settlement.setExitProcessId(request.getExitProcessId());
        settlement.setEmployeeId(request.getEmployeeId());

        // Earnings
        if (request.getPendingSalary() != null) settlement.setPendingSalary(request.getPendingSalary());
        if (request.getLeaveEncashment() != null) settlement.setLeaveEncashment(request.getLeaveEncashment());
        if (request.getBonusAmount() != null) settlement.setBonusAmount(request.getBonusAmount());
        if (request.getNoticePeriodRecovery() != null) settlement.setNoticePeriodRecovery(request.getNoticePeriodRecovery());
        if (request.getReimbursements() != null) settlement.setReimbursements(request.getReimbursements());
        if (request.getOtherEarnings() != null) settlement.setOtherEarnings(request.getOtherEarnings());

        // Deductions
        if (request.getNoticeBuyout() != null) settlement.setNoticeBuyout(request.getNoticeBuyout());
        if (request.getLoanRecovery() != null) settlement.setLoanRecovery(request.getLoanRecovery());
        if (request.getAdvanceRecovery() != null) settlement.setAdvanceRecovery(request.getAdvanceRecovery());
        if (request.getAssetDamageDeduction() != null) settlement.setAssetDamageDeduction(request.getAssetDamageDeduction());
        if (request.getTaxDeduction() != null) settlement.setTaxDeduction(request.getTaxDeduction());
        if (request.getOtherDeductions() != null) settlement.setOtherDeductions(request.getOtherDeductions());

        // Gratuity
        settlement.setYearsOfService(request.getYearsOfService());
        settlement.setLastDrawnSalary(request.getLastDrawnSalary());
        settlement.calculateGratuity();

        // Calculate totals
        settlement.calculateTotals();

        settlement.setPreparedBy(currentUserId);
        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.DRAFT);
        if (request.getRemarks() != null) settlement.setRemarks(request.getRemarks());

        FullAndFinalSettlement saved = settlementRepository.save(settlement);
        return mapToSettlementResponse(saved);
    }

    @Transactional
    public FullAndFinalSettlementResponse updateSettlement(UUID id, FullAndFinalSettlementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(SETTLEMENT_NOT_FOUND));

        // Update earnings
        if (request.getPendingSalary() != null) settlement.setPendingSalary(request.getPendingSalary());
        if (request.getLeaveEncashment() != null) settlement.setLeaveEncashment(request.getLeaveEncashment());
        if (request.getBonusAmount() != null) settlement.setBonusAmount(request.getBonusAmount());
        if (request.getNoticePeriodRecovery() != null) settlement.setNoticePeriodRecovery(request.getNoticePeriodRecovery());
        if (request.getReimbursements() != null) settlement.setReimbursements(request.getReimbursements());
        if (request.getOtherEarnings() != null) settlement.setOtherEarnings(request.getOtherEarnings());

        // Update deductions
        if (request.getNoticeBuyout() != null) settlement.setNoticeBuyout(request.getNoticeBuyout());
        if (request.getLoanRecovery() != null) settlement.setLoanRecovery(request.getLoanRecovery());
        if (request.getAdvanceRecovery() != null) settlement.setAdvanceRecovery(request.getAdvanceRecovery());
        if (request.getAssetDamageDeduction() != null) settlement.setAssetDamageDeduction(request.getAssetDamageDeduction());
        if (request.getTaxDeduction() != null) settlement.setTaxDeduction(request.getTaxDeduction());
        if (request.getOtherDeductions() != null) settlement.setOtherDeductions(request.getOtherDeductions());

        // Gratuity
        if (request.getYearsOfService() != null) settlement.setYearsOfService(request.getYearsOfService());
        if (request.getLastDrawnSalary() != null) settlement.setLastDrawnSalary(request.getLastDrawnSalary());
        settlement.calculateGratuity();

        // Recalculate totals
        settlement.calculateTotals();

        if (request.getRemarks() != null) settlement.setRemarks(request.getRemarks());
        if (request.getPaymentMode() != null) settlement.setPaymentMode(request.getPaymentMode());

        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public FullAndFinalSettlementResponse submitForApproval(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(SETTLEMENT_NOT_FOUND));

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL);
        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public FullAndFinalSettlementResponse approveSettlement(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(SETTLEMENT_NOT_FOUND));

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.APPROVED);
        settlement.setApprovedBy(currentUserId);
        settlement.setApprovalDate(LocalDate.now());
        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public FullAndFinalSettlementResponse processPayment(UUID id, FullAndFinalSettlement.PaymentMode paymentMode, String paymentReference) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(SETTLEMENT_NOT_FOUND));

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.PAID);
        settlement.setPaymentMode(paymentMode);
        settlement.setPaymentReference(paymentReference);
        settlement.setPaymentDate(LocalDate.now());
        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional(readOnly = true)
    public FullAndFinalSettlementResponse getSettlementById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(SETTLEMENT_NOT_FOUND));
        return mapToSettlementResponse(settlement);
    }

    @Transactional(readOnly = true)
    public FullAndFinalSettlementResponse getSettlementByExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(SETTLEMENT_NOT_FOUND));
        return mapToSettlementResponse(settlement);
    }

    @Transactional(readOnly = true)
    public Page<FullAndFinalSettlementResponse> getAllSettlements(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return settlementRepository.findByTenantId(tenantId, pageable).map(this::mapToSettlementResponse);
    }

    @Transactional(readOnly = true)
    public List<FullAndFinalSettlementResponse> getPendingApprovals() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return settlementRepository.findPendingApprovals(tenantId).stream()
                .map(this::mapToSettlementResponse)
                .collect(Collectors.toList());
    }

    // ==================== Exit Interview Operations ====================

    @Transactional
    public ExitInterviewResponse createExitInterview(ExitInterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating exit interview for process {} in tenant {}", request.getExitProcessId(), tenantId);

        ExitInterview interview = new ExitInterview();
        interview.setTenantId(tenantId);
        interview.setExitProcessId(request.getExitProcessId());
        interview.setEmployeeId(request.getEmployeeId());
        interview.setInterviewerId(request.getInterviewerId());
        interview.setScheduledDate(request.getScheduledDate());
        interview.setScheduledTime(request.getScheduledTime());
        interview.setInterviewMode(request.getInterviewMode());
        interview.setStatus(ExitInterview.InterviewStatus.SCHEDULED);
        interview.setIsConfidential(request.getIsConfidential() != null ? request.getIsConfidential() : true);

        ExitInterview saved = exitInterviewRepository.save(interview);
        return mapToExitInterviewResponse(saved);
    }

    public ExitInterviewResponse conductExitInterview(UUID id, ExitInterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitInterview interview = exitInterviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_INTERVIEW_NOT_FOUND));

        interview.setActualDate(LocalDate.now());
        interview.setStatus(ExitInterview.InterviewStatus.COMPLETED);

        // Ratings
        interview.setOverallExperienceRating(request.getOverallExperienceRating());
        interview.setManagementRating(request.getManagementRating());
        interview.setWorkLifeBalanceRating(request.getWorkLifeBalanceRating());
        interview.setGrowthOpportunitiesRating(request.getGrowthOpportunitiesRating());
        interview.setCompensationRating(request.getCompensationRating());
        interview.setTeamCultureRating(request.getTeamCultureRating());

        // Feedback
        interview.setPrimaryReasonForLeaving(request.getPrimaryReasonForLeaving());
        interview.setDetailedReason(request.getDetailedReason());
        interview.setWhatLikedMost(request.getWhatLikedMost());
        interview.setWhatCouldImprove(request.getWhatCouldImprove());
        interview.setSuggestions(request.getSuggestions());
        interview.setWouldRecommendCompany(request.getWouldRecommendCompany());
        interview.setWouldConsiderReturning(request.getWouldConsiderReturning());

        // New employer
        interview.setNewEmployer(request.getNewEmployer());
        interview.setNewRole(request.getNewRole());
        interview.setNewSalaryIncreasePercentage(request.getNewSalaryIncreasePercentage());

        interview.setInterviewerNotes(request.getInterviewerNotes());

        return mapToExitInterviewResponse(exitInterviewRepository.save(interview));
    }

    public ExitInterviewResponse rescheduleInterview(UUID id, LocalDate newDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitInterview interview = exitInterviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_INTERVIEW_NOT_FOUND));

        interview.setScheduledDate(newDate);
        interview.setStatus(ExitInterview.InterviewStatus.RESCHEDULED);
        return mapToExitInterviewResponse(exitInterviewRepository.save(interview));
    }

    @Transactional(readOnly = true)
    public ExitInterviewResponse getExitInterviewById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitInterview interview = exitInterviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(EXIT_INTERVIEW_NOT_FOUND));
        return mapToExitInterviewResponse(interview);
    }

    @Transactional(readOnly = true)
    public Page<ExitInterviewResponse> getAllExitInterviews(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitInterviewRepository.findByTenantId(tenantId, pageable).map(this::mapToExitInterviewResponse);
    }

    @Transactional(readOnly = true)
    public List<ExitInterviewResponse> getScheduledInterviews() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitInterviewRepository.findByTenantIdAndStatus(tenantId, ExitInterview.InterviewStatus.SCHEDULED)
                .stream().map(this::mapToExitInterviewResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExitInterviewAnalytics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> analytics = new HashMap<>();

        // Average ratings
        analytics.put("averageOverallRating", exitInterviewRepository.getAverageOverallRating(tenantId));
        analytics.put("averageManagementRating", exitInterviewRepository.getAverageManagementRating(tenantId));

        // Recommendation stats
        long completed = exitInterviewRepository.countCompleted(tenantId);
        long wouldRecommend = exitInterviewRepository.countWouldRecommend(tenantId);
        long wouldReturn = exitInterviewRepository.countWouldReturn(tenantId);

        analytics.put("totalCompleted", completed);
        analytics.put("recommendationRate", completed > 0 ? (double) wouldRecommend / completed * 100 : 0);
        analytics.put("returnRate", completed > 0 ? (double) wouldReturn / completed * 100 : 0);

        // Leaving reasons
        List<Object[]> reasons = exitInterviewRepository.getLeavingReasonStats(tenantId);
        List<Map<String, Object>> reasonStats = new ArrayList<>();
        for (Object[] reason : reasons) {
            Map<String, Object> stat = new HashMap<>();
            stat.put("reason", reason[0]);
            stat.put("count", reason[1]);
            reasonStats.add(stat);
        }
        analytics.put("leavingReasons", reasonStats);

        return Collections.unmodifiableMap(analytics);
    }

    // ==================== Asset Recovery Operations ====================

    @Transactional
    public AssetRecoveryResponse createAssetRecovery(AssetRecoveryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating asset recovery for exit process {} in tenant {}", request.getExitProcessId(), tenantId);

        AssetRecovery asset = new AssetRecovery();
        asset.setTenantId(tenantId);
        asset.setExitProcessId(request.getExitProcessId());
        asset.setEmployeeId(request.getEmployeeId());
        asset.setAssetId(request.getAssetId());
        asset.setAssetName(request.getAssetName());
        asset.setAssetType(request.getAssetType());
        asset.setAssetTag(request.getAssetTag());
        asset.setSerialNumber(request.getSerialNumber());
        asset.setAssignedDate(request.getAssignedDate());
        asset.setExpectedReturnDate(request.getExpectedReturnDate());
        asset.setStatus(AssetRecovery.RecoveryStatus.PENDING);

        AssetRecovery saved = assetRecoveryRepository.save(asset);
        return mapToAssetRecoveryResponse(saved);
    }

    public AssetRecoveryResponse recordAssetReturn(UUID id, AssetRecoveryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ASSET_RECOVERY_NOT_FOUND));

        asset.setActualReturnDate(LocalDate.now());
        asset.setConditionOnReturn(request.getConditionOnReturn());
        asset.setRecoveredBy(currentUserId);

        if (request.getConditionOnReturn() == AssetRecovery.AssetCondition.DAMAGED ||
                request.getConditionOnReturn() == AssetRecovery.AssetCondition.NON_FUNCTIONAL) {
            asset.setStatus(AssetRecovery.RecoveryStatus.DAMAGED);
            asset.setDamageDescription(request.getDamageDescription());
            asset.setDeductionAmount(request.getDeductionAmount() != null ? request.getDeductionAmount() : BigDecimal.ZERO);
        } else {
            asset.setStatus(AssetRecovery.RecoveryStatus.RETURNED);
        }

        asset.setRemarks(request.getRemarks());

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    @Transactional
    public AssetRecoveryResponse markAssetAsLost(UUID id, BigDecimal deductionAmount, String remarks) {
        UUID tenantId = TenantContext.getCurrentTenant();
        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ASSET_RECOVERY_NOT_FOUND));

        asset.setStatus(AssetRecovery.RecoveryStatus.LOST);
        asset.setDeductionAmount(deductionAmount != null ? deductionAmount : BigDecimal.ZERO);
        asset.setRemarks(remarks);

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    public AssetRecoveryResponse waiveAssetRecovery(UUID id, String waiverReason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ASSET_RECOVERY_NOT_FOUND));

        asset.setStatus(AssetRecovery.RecoveryStatus.WAIVED);
        asset.setIsWaived(true);
        asset.setWaiverReason(waiverReason);
        asset.setWaivedBy(currentUserId);

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    public AssetRecoveryResponse verifyAssetReturn(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ASSET_RECOVERY_NOT_FOUND));

        asset.setVerifiedBy(currentUserId);
        asset.setVerificationDate(LocalDate.now());

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    @Transactional(readOnly = true)
    public List<AssetRecoveryResponse> getAssetsByExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRecoveryRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .stream().map(this::mapToAssetRecoveryResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AssetRecoveryResponse> getPendingAssetRecoveries() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRecoveryRepository.findAllPending(tenantId)
                .stream().map(this::mapToAssetRecoveryResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalDeductionsForExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BigDecimal total = assetRecoveryRepository.getTotalDeductionsByExitProcess(tenantId, exitProcessId);
        return total != null ? total : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public boolean areAllAssetsRecovered(UUID exitProcessId) {
        return assetRecoveryRepository.areAllAssetsRecovered(exitProcessId);
    }

    // ==================== Exit Dashboard ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getExitDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = new HashMap<>();

        // Process stats
        dashboard.put("initiatedProcesses", exitProcessRepository.findByTenantIdAndStatus(tenantId, ExitProcess.ExitStatus.INITIATED).size());
        dashboard.put("inProgressProcesses", exitProcessRepository.findByTenantIdAndStatus(tenantId, ExitProcess.ExitStatus.IN_PROGRESS).size());
        dashboard.put("completedProcesses", exitProcessRepository.findByTenantIdAndStatus(tenantId, ExitProcess.ExitStatus.COMPLETED).size());

        // Settlement stats
        dashboard.put("pendingSettlements", settlementRepository.countByStatus(tenantId, FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL));
        dashboard.put("approvedSettlements", settlementRepository.countByStatus(tenantId, FullAndFinalSettlement.SettlementStatus.APPROVED));

        // Interview stats
        dashboard.put("scheduledInterviews", exitInterviewRepository.findByTenantIdAndStatus(tenantId, ExitInterview.InterviewStatus.SCHEDULED).size());
        dashboard.put("overdueInterviews", exitInterviewRepository.findOverdue(tenantId, LocalDate.now()).size());

        // Asset stats
        dashboard.put("pendingAssetRecoveries", assetRecoveryRepository.findAllPending(tenantId).size());
        dashboard.put("damagedOrLostAssets", assetRecoveryRepository.findDamagedOrLost(tenantId).size());

        return Collections.unmodifiableMap(dashboard);
    }

    // ==================== Additional Mapper Methods ====================

    private FullAndFinalSettlementResponse mapToSettlementResponse(FullAndFinalSettlement settlement) {
        String employeeName = safeGetEmployeeName(settlement.getEmployeeId());
        String preparedByName = safeGetEmployeeName(settlement.getPreparedBy());
        String approvedByName = safeGetEmployeeName(settlement.getApprovedBy());

        return FullAndFinalSettlementResponse.builder()
                .id(settlement.getId())
                .tenantId(settlement.getTenantId())
                .exitProcessId(settlement.getExitProcessId())
                .employeeId(settlement.getEmployeeId())
                .employeeName(employeeName)
                .pendingSalary(settlement.getPendingSalary())
                .leaveEncashment(settlement.getLeaveEncashment())
                .bonusAmount(settlement.getBonusAmount())
                .gratuityAmount(settlement.getGratuityAmount())
                .noticePeriodRecovery(settlement.getNoticePeriodRecovery())
                .reimbursements(settlement.getReimbursements())
                .otherEarnings(settlement.getOtherEarnings())
                .noticeBuyout(settlement.getNoticeBuyout())
                .loanRecovery(settlement.getLoanRecovery())
                .advanceRecovery(settlement.getAdvanceRecovery())
                .assetDamageDeduction(settlement.getAssetDamageDeduction())
                .taxDeduction(settlement.getTaxDeduction())
                .otherDeductions(settlement.getOtherDeductions())
                .totalEarnings(settlement.getTotalEarnings())
                .totalDeductions(settlement.getTotalDeductions())
                .netPayable(settlement.getNetPayable())
                .status(settlement.getStatus())
                .paymentMode(settlement.getPaymentMode())
                .paymentReference(settlement.getPaymentReference())
                .paymentDate(settlement.getPaymentDate())
                .preparedBy(settlement.getPreparedBy())
                .preparedByName(preparedByName)
                .approvedBy(settlement.getApprovedBy())
                .approvedByName(approvedByName)
                .approvalDate(settlement.getApprovalDate())
                .remarks(settlement.getRemarks())
                .yearsOfService(settlement.getYearsOfService())
                .isGratuityEligible(settlement.getIsGratuityEligible())
                .lastDrawnSalary(settlement.getLastDrawnSalary())
                .createdAt(settlement.getCreatedAt())
                .updatedAt(settlement.getUpdatedAt())
                .build();
    }

    private ExitInterviewResponse mapToExitInterviewResponse(ExitInterview interview) {
        String employeeName = safeGetEmployeeName(interview.getEmployeeId());
        String interviewerName = safeGetEmployeeName(interview.getInterviewerId());

        return ExitInterviewResponse.builder()
                .id(interview.getId())
                .tenantId(interview.getTenantId())
                .exitProcessId(interview.getExitProcessId())
                .employeeId(interview.getEmployeeId())
                .employeeName(employeeName)
                .interviewerId(interview.getInterviewerId())
                .interviewerName(interviewerName)
                .scheduledDate(interview.getScheduledDate())
                .scheduledTime(interview.getScheduledTime())
                .actualDate(interview.getActualDate())
                .interviewMode(interview.getInterviewMode())
                .status(interview.getStatus())
                .overallExperienceRating(interview.getOverallExperienceRating())
                .managementRating(interview.getManagementRating())
                .workLifeBalanceRating(interview.getWorkLifeBalanceRating())
                .growthOpportunitiesRating(interview.getGrowthOpportunitiesRating())
                .compensationRating(interview.getCompensationRating())
                .teamCultureRating(interview.getTeamCultureRating())
                .averageRating(interview.getAverageRating())
                .primaryReasonForLeaving(interview.getPrimaryReasonForLeaving())
                .detailedReason(interview.getDetailedReason())
                .whatLikedMost(interview.getWhatLikedMost())
                .whatCouldImprove(interview.getWhatCouldImprove())
                .suggestions(interview.getSuggestions())
                .wouldRecommendCompany(interview.getWouldRecommendCompany())
                .wouldConsiderReturning(interview.getWouldConsiderReturning())
                .newEmployer(interview.getNewEmployer())
                .newRole(interview.getNewRole())
                .newSalaryIncreasePercentage(interview.getNewSalaryIncreasePercentage())
                .interviewerNotes(interview.getInterviewerNotes())
                .isConfidential(interview.getIsConfidential())
                .createdAt(interview.getCreatedAt())
                .updatedAt(interview.getUpdatedAt())
                .build();
    }

    private AssetRecoveryResponse mapToAssetRecoveryResponse(AssetRecovery asset) {
        String employeeName = safeGetEmployeeName(asset.getEmployeeId());
        String recoveredByName = safeGetEmployeeName(asset.getRecoveredBy());
        String verifiedByName = safeGetEmployeeName(asset.getVerifiedBy());
        String waivedByName = safeGetEmployeeName(asset.getWaivedBy());

        return AssetRecoveryResponse.builder()
                .id(asset.getId())
                .tenantId(asset.getTenantId())
                .exitProcessId(asset.getExitProcessId())
                .employeeId(asset.getEmployeeId())
                .employeeName(employeeName)
                .assetId(asset.getAssetId())
                .assetName(asset.getAssetName())
                .assetType(asset.getAssetType())
                .assetTag(asset.getAssetTag())
                .serialNumber(asset.getSerialNumber())
                .assignedDate(asset.getAssignedDate())
                .expectedReturnDate(asset.getExpectedReturnDate())
                .actualReturnDate(asset.getActualReturnDate())
                .status(asset.getStatus())
                .conditionOnReturn(asset.getConditionOnReturn())
                .damageDescription(asset.getDamageDescription())
                .deductionAmount(asset.getDeductionAmount())
                .recoveredBy(asset.getRecoveredBy())
                .recoveredByName(recoveredByName)
                .verifiedBy(asset.getVerifiedBy())
                .verifiedByName(verifiedByName)
                .verificationDate(asset.getVerificationDate())
                .remarks(asset.getRemarks())
                .isWaived(asset.getIsWaived())
                .waiverReason(asset.getWaiverReason())
                .waivedBy(asset.getWaivedBy())
                .waivedByName(waivedByName)
                .isRecovered(asset.isRecovered())
                .createdAt(asset.getCreatedAt())
                .updatedAt(asset.getUpdatedAt())
                .build();
    }
}
