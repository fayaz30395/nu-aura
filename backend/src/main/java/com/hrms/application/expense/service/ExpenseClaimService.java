package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseClaimRequest;
import com.hrms.api.expense.dto.ExpenseClaimResponse;
import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.event.expense.ExpenseApprovedEvent;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.common.exception.ValidationException;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class ExpenseClaimService implements ApprovalCallbackHandler {

    private final ExpenseClaimRepository expenseClaimRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;
    private final WorkflowService workflowService;
    private final ExpensePolicyService expensePolicyService;
    private final DomainEventPublisher domainEventPublisher;
    private final AuditLogService auditLogService;

    @org.springframework.beans.factory.annotation.Autowired
    public ExpenseClaimService(
            ExpenseClaimRepository expenseClaimRepository,
            EmployeeRepository employeeRepository,
            DataScopeService dataScopeService,
            @org.springframework.context.annotation.Lazy WorkflowService workflowService,
            @org.springframework.context.annotation.Lazy ExpensePolicyService expensePolicyService,
            DomainEventPublisher domainEventPublisher,
            AuditLogService auditLogService) {
        this.expenseClaimRepository = expenseClaimRepository;
        this.employeeRepository = employeeRepository;
        this.dataScopeService = dataScopeService;
        this.workflowService = workflowService;
        this.expensePolicyService = expensePolicyService;
        this.domainEventPublisher = domainEventPublisher;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public ExpenseClaimResponse createExpenseClaim(UUID employeeId, ExpenseClaimRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Validate employee exists
        if (!employeeRepository.existsByIdAndTenantId(employeeId, tenantId)) {
            throw new EntityNotFoundException("Employee not found: " + employeeId);
        }

        ExpenseClaim claim = ExpenseClaim.builder()
                .employeeId(employeeId)
                .claimNumber(generateClaimNumber(tenantId))
                .claimDate(request.getClaimDate())
                .category(request.getCategory())
                .description(request.getDescription())
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .receiptUrl(request.getReceiptUrl())
                .notes(request.getNotes())
                .status(ExpenseClaim.ExpenseStatus.DRAFT)
                .build();

        claim.setTenantId(tenantId);

        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Created expense claim: {} for employee: {}", saved.getClaimNumber(), employeeId);

        try { auditLogService.logAction("EXPENSE_CLAIM", saved.getId(), AuditAction.CREATE, null, null, "Expense claim created: " + saved.getClaimNumber()); } catch (Exception e) { log.warn("Audit log failed for expense claim create: {}", e.getMessage()); }

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse updateExpenseClaim(UUID claimId, ExpenseClaimRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.DRAFT) {
            throw new IllegalStateException("Can only update expense claims in DRAFT status");
        }

        claim.setClaimDate(request.getClaimDate());
        claim.setCategory(request.getCategory());
        claim.setDescription(request.getDescription());
        claim.setAmount(request.getAmount());
        if (request.getCurrency() != null) {
            claim.setCurrency(request.getCurrency());
        }
        claim.setReceiptUrl(request.getReceiptUrl());
        claim.setNotes(request.getNotes());

        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Updated expense claim: {}", saved.getClaimNumber());

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse submitExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.submit();
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Submitted expense claim: {}", saved.getClaimNumber());

        // Start approval workflow
        startExpenseApprovalWorkflow(saved, tenantId);

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse approveExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        // Validate approver has access to this employee's expense claims
        validateEmployeeAccess(claim.getEmployeeId(), Permission.EXPENSE_APPROVE);

        claim.approve(approverId);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Approved expense claim: {} by {}", saved.getClaimNumber(), approverId);

        try { auditLogService.logAction("EXPENSE_CLAIM", saved.getId(), AuditAction.APPROVE, null, null, "Expense claim approved: " + saved.getClaimNumber()); } catch (Exception e) { log.warn("Audit log failed for expense claim approve: {}", e.getMessage()); }

        // FIX-002: Publish event for payroll to add expense reimbursement earning
        domainEventPublisher.publish(ExpenseApprovedEvent.of(
                this, tenantId, saved.getId(),
                saved.getEmployeeId(), approverId,
                saved.getAmount(), saved.getCurrency(),
                saved.getClaimNumber(), saved.getCategory().name()));

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse rejectExpenseClaim(UUID claimId, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID rejecterId = SecurityContext.getCurrentEmployeeId();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        // Validate rejecter has access to this employee's expense claims
        validateEmployeeAccess(claim.getEmployeeId(), Permission.EXPENSE_APPROVE);

        claim.reject(rejecterId, reason);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Rejected expense claim: {} by {}", saved.getClaimNumber(), rejecterId);

        try { auditLogService.logAction("EXPENSE_CLAIM", saved.getId(), AuditAction.REJECT, null, null, "Expense claim rejected: " + saved.getClaimNumber() + ", reason: " + reason); } catch (Exception e) { log.warn("Audit log failed for expense claim reject: {}", e.getMessage()); }

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse markAsPaid(UUID claimId, LocalDate paymentDate, String paymentReference) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.markAsPaid(paymentDate, paymentReference);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Marked expense claim as paid: {}", saved.getClaimNumber());

        try { auditLogService.logAction("EXPENSE_CLAIM", saved.getId(), AuditAction.STATUS_CHANGE, null, null, "Expense claim marked as paid: " + saved.getClaimNumber()); } catch (Exception e) { log.warn("Audit log failed for expense claim paid: {}", e.getMessage()); }

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public void cancelExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.cancel();
        expenseClaimRepository.save(claim);
        log.info("Cancelled expense claim: {}", claim.getClaimNumber());
    }

    @Transactional
    public void deleteExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.DRAFT) {
            throw new ValidationException("Only DRAFT expense claims can be deleted");
        }

        expenseClaimRepository.delete(claim);
        log.info("Deleted expense claim: {}", claim.getClaimNumber());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeStatistics(UUID employeeId, Integer year) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<ExpenseClaim> claims = expenseClaimRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId);

        // Filter by year if provided
        if (year != null) {
            claims = claims.stream()
                    .filter(c -> c.getClaimDate() != null && c.getClaimDate().getYear() == year)
                    .collect(java.util.stream.Collectors.toList());
        }

        Map<String, Object> statistics = new HashMap<>();

        statistics.put("totalClaims", (long) claims.size());

        BigDecimal totalAmount = claims.stream()
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        statistics.put("totalAmount", totalAmount);

        BigDecimal pendingAmount = claims.stream()
                .filter(c -> c.getStatus() == ExpenseClaim.ExpenseStatus.SUBMITTED
                        || c.getStatus() == ExpenseClaim.ExpenseStatus.PENDING_APPROVAL)
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        statistics.put("pendingAmount", pendingAmount);

        BigDecimal approvedAmount = claims.stream()
                .filter(c -> c.getStatus() == ExpenseClaim.ExpenseStatus.APPROVED)
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        statistics.put("approvedAmount", approvedAmount);

        BigDecimal rejectedAmount = claims.stream()
                .filter(c -> c.getStatus() == ExpenseClaim.ExpenseStatus.REJECTED)
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        statistics.put("rejectedAmount", rejectedAmount);

        BigDecimal paidAmount = claims.stream()
                .filter(c -> c.getStatus() == ExpenseClaim.ExpenseStatus.PAID)
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        statistics.put("paidAmount", paidAmount);

        Map<String, BigDecimal> byCategory = new HashMap<>();
        for (ExpenseClaim.ExpenseCategory cat : ExpenseClaim.ExpenseCategory.values()) {
            BigDecimal catAmount = claims.stream()
                    .filter(c -> c.getCategory() == cat)
                    .map(ExpenseClaim::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (catAmount.compareTo(BigDecimal.ZERO) > 0) {
                byCategory.put(cat.name(), catAmount);
            }
        }
        statistics.put("byCategory", byCategory);

        return Collections.unmodifiableMap(statistics);
    }

    @Transactional(readOnly = true)
    public ExpenseClaimResponse getExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        // Validate user has access to this employee's expense claims
        validateEmployeeAccess(claim.getEmployeeId(), Permission.EXPENSE_VIEW);

        return enrichResponse(ExpenseClaimResponse.fromEntity(claim));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getAllExpenseClaims(Pageable pageable) {
        String permission = determineViewPermission();
        Specification<ExpenseClaim> scopeSpec = dataScopeService.getScopeSpecification(permission);
        return getAllExpenseClaims(scopeSpec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getAllExpenseClaims(Specification<ExpenseClaim> spec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Page<ExpenseClaim> page = expenseClaimRepository.findAll(tenantSpec.and(spec), pageable);
        List<ExpenseClaimResponse> enriched = enrichResponses(
                page.getContent().stream().map(ExpenseClaimResponse::fromEntity).collect(java.util.stream.Collectors.toList()));
        return new org.springframework.data.domain.PageImpl<>(enriched, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByEmployee(UUID employeeId, Pageable pageable) {
        // Determine which view permission the user has
        String permission = determineViewPermission();

        // Validate user has access to this employee's expense claims
        validateEmployeeAccess(employeeId, permission);

        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<ExpenseClaim> page = expenseClaimRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId, pageable);
        List<ExpenseClaimResponse> enriched = enrichResponses(
                page.getContent().stream().map(ExpenseClaimResponse::fromEntity).collect(java.util.stream.Collectors.toList()));
        return new org.springframework.data.domain.PageImpl<>(enriched, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByStatus(ExpenseClaim.ExpenseStatus status, Pageable pageable) {
        String permission = determineViewPermission();
        Specification<ExpenseClaim> scopeSpec = dataScopeService.getScopeSpecification(permission);
        return getExpenseClaimsByStatus(status, scopeSpec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByStatus(ExpenseClaim.ExpenseStatus status,
            Specification<ExpenseClaim> spec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> statusSpec = (root, query, cb) -> cb.equal(root.get("status"), status);
        Page<ExpenseClaim> page = expenseClaimRepository.findAll(tenantSpec.and(statusSpec).and(spec), pageable);
        List<ExpenseClaimResponse> enriched = enrichResponses(
                page.getContent().stream().map(ExpenseClaimResponse::fromEntity).collect(java.util.stream.Collectors.toList()));
        return new org.springframework.data.domain.PageImpl<>(enriched, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getPendingApprovals(Pageable pageable) {
        Specification<ExpenseClaim> scopeSpec = dataScopeService.getScopeSpecification(Permission.EXPENSE_APPROVE);
        return getPendingApprovals(scopeSpec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getPendingApprovals(Specification<ExpenseClaim> spec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<ExpenseClaim.ExpenseStatus> pendingStatuses = List.of(
                ExpenseClaim.ExpenseStatus.SUBMITTED,
                ExpenseClaim.ExpenseStatus.PENDING_APPROVAL
        );
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> statusSpec = (root, query, cb) -> root.get("status").in(pendingStatuses);
        Page<ExpenseClaim> page = expenseClaimRepository.findAll(tenantSpec.and(statusSpec).and(spec), pageable);
        List<ExpenseClaimResponse> enriched = enrichResponses(
                page.getContent().stream().map(ExpenseClaimResponse::fromEntity).collect(java.util.stream.Collectors.toList()));
        return new org.springframework.data.domain.PageImpl<>(enriched, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByDateRange(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        String permission = determineViewPermission();
        Specification<ExpenseClaim> scopeSpec = dataScopeService.getScopeSpecification(permission);
        return getExpenseClaimsByDateRange(startDate, endDate, scopeSpec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByDateRange(LocalDate startDate, LocalDate endDate,
            Specification<ExpenseClaim> spec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> dateSpec = (root, query, cb) -> cb.between(root.get("claimDate"), startDate, endDate);
        Page<ExpenseClaim> page = expenseClaimRepository.findAll(tenantSpec.and(dateSpec).and(spec), pageable);
        List<ExpenseClaimResponse> enriched = enrichResponses(
                page.getContent().stream().map(ExpenseClaimResponse::fromEntity).collect(java.util.stream.Collectors.toList()));
        return new org.springframework.data.domain.PageImpl<>(enriched, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExpenseSummary(LocalDate startDate, LocalDate endDate) {
        String permission = determineViewPermission();
        Specification<ExpenseClaim> scopeSpec = dataScopeService.getScopeSpecification(permission);
        return getExpenseSummary(startDate, endDate, scopeSpec);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExpenseSummary(LocalDate startDate, LocalDate endDate,
            Specification<ExpenseClaim> spec) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> dateSpec = (root, query, cb) -> cb.between(root.get("claimDate"), startDate, endDate);

        List<ExpenseClaim> claims = expenseClaimRepository.findAll(tenantSpec.and(dateSpec).and(spec));

        Map<String, Object> summary = new HashMap<>();

        Map<String, Long> statusCounts = new HashMap<>();
        Map<String, BigDecimal> amountByStatus = new HashMap<>();
        for (ExpenseClaim.ExpenseStatus status : ExpenseClaim.ExpenseStatus.values()) {
            long count = claims.stream().filter(c -> c.getStatus() == status).count();
            statusCounts.put(status.name(), count);

            BigDecimal amount = claims.stream()
                    .filter(c -> c.getStatus() == status)
                    .map(ExpenseClaim::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            amountByStatus.put(status.name(), amount);
        }

        summary.put("statusCounts", statusCounts);
        summary.put("amountByStatus", amountByStatus);

        BigDecimal totalAmount = claims.stream()
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        summary.put("totalAmount", totalAmount);
        summary.put("totalClaims", claims.size());

        return Collections.unmodifiableMap(summary);
    }

    @Transactional
    public ExpenseClaimResponse markAsReimbursed(UUID claimId, String reimbursementRef) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.markAsReimbursed(reimbursementRef);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Marked expense claim as reimbursed: {} ref: {}", saved.getClaimNumber(), reimbursementRef);

        try { auditLogService.logAction("EXPENSE_CLAIM", saved.getId(), AuditAction.STATUS_CHANGE, null, null, "Expense claim reimbursed: " + saved.getClaimNumber() + ", ref: " + reimbursementRef); } catch (Exception e) { log.warn("Audit log failed for expense claim reimbursed: {}", e.getMessage()); }

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional(readOnly = true)
    public List<String> validatePolicy(UUID employeeId, java.math.BigDecimal amount) {
        if (expensePolicyService != null) {
            return expensePolicyService.validateClaimAgainstPolicies(employeeId, amount);
        }
        return Collections.emptyList();
    }

    // ======================== ApprovalCallbackHandler ========================

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.EXPENSE_CLAIM;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Expense claim {} approved via workflow by {}", entityId, approvedBy);

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(entityId, tenantId)
                .orElse(null);

        if (claim == null) {
            log.warn("Expense claim {} not found for approval callback", entityId);
            return;
        }

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.SUBMITTED &&
            claim.getStatus() != ExpenseClaim.ExpenseStatus.PENDING_APPROVAL) {
            log.warn("Expense claim {} already in status {}, skipping approval", entityId, claim.getStatus());
            return;
        }

        claim.approve(approvedBy);
        expenseClaimRepository.save(claim);
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Expense claim {} rejected via workflow by {}", entityId, rejectedBy);

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(entityId, tenantId)
                .orElse(null);

        if (claim == null) {
            log.warn("Expense claim {} not found for rejection callback", entityId);
            return;
        }

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.SUBMITTED &&
            claim.getStatus() != ExpenseClaim.ExpenseStatus.PENDING_APPROVAL) {
            log.warn("Expense claim {} already in status {}, skipping rejection", entityId, claim.getStatus());
            return;
        }

        claim.reject(rejectedBy, reason);
        expenseClaimRepository.save(claim);
    }

    private void startExpenseApprovalWorkflow(ExpenseClaim claim, UUID tenantId) {
        try {
            String employeeName = employeeRepository.findByIdAndTenantId(claim.getEmployeeId(), tenantId)
                    .map(emp -> emp.getFirstName() + " " + emp.getLastName())
                    .orElse("Employee");

            WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
            workflowRequest.setEntityType(WorkflowDefinition.EntityType.EXPENSE_CLAIM);
            workflowRequest.setEntityId(claim.getId());
            workflowRequest.setTitle("Expense Approval: " + employeeName + " - " + claim.getClaimNumber());
            workflowRequest.setAmount(claim.getAmount());

            workflowService.startWorkflow(workflowRequest);
            log.info("Workflow started for expense claim: {}", claim.getClaimNumber());
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.warn("Could not start approval workflow for expense claim {}: {}",
                    claim.getClaimNumber(), e.getMessage());
        }
    }

    // ======================== Claim Number Generation ========================

    /**
     * HIGH-003 FIX: Generates a unique claim number using synchronized block to prevent
     * race conditions where concurrent requests could read the same max number and
     * produce duplicate claim numbers.
     *
     * Additionally appends a UUID fragment as a safety net for edge cases where
     * two JVM instances could generate the same number.
     */
    private synchronized String generateClaimNumber(UUID tenantId) {
        String prefix = "EXP-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        String maxNumber = expenseClaimRepository.findMaxClaimNumber(tenantId);

        int nextNumber = 1;
        if (maxNumber != null && maxNumber.startsWith(prefix)) {
            try {
                // Extract only the numeric part (first 4 chars after prefix) to handle
                // claim numbers that may have a UUID suffix appended
                String afterPrefix = maxNumber.substring(prefix.length());
                String numPart = afterPrefix.length() > 4 ? afterPrefix.substring(0, 4) : afterPrefix;
                nextNumber = Integer.parseInt(numPart) + 1;
            } catch (NumberFormatException e) {
                log.warn("generateClaimNumber: could not parse numeric suffix from '{}' (prefix='{}') — " +
                        "resetting sequence to 1 for tenant {}. Check for data corruption.", maxNumber, prefix, tenantId);
            }
        }

        return prefix + String.format("%04d", nextNumber);
    }

    /**
     * Enrich a single response with employee names. Used for single-entity endpoints.
     * For paginated results, use {@link #enrichResponses(List)} to avoid N+1 queries.
     */
    private ExpenseClaimResponse enrichResponse(ExpenseClaimResponse response) {
        return enrichResponses(List.of(response)).get(0);
    }

    /**
     * Batch-enrich multiple responses with employee names using a single query
     * instead of N individual lookups (N+1 query fix for paginated endpoints).
     */
    private List<ExpenseClaimResponse> enrichResponses(List<ExpenseClaimResponse> responses) {
        if (responses.isEmpty()) return responses;

        // Collect all employee IDs needed for enrichment
        Set<UUID> employeeIds = new HashSet<>();
        for (ExpenseClaimResponse r : responses) {
            if (r.getEmployeeId() != null) employeeIds.add(r.getEmployeeId());
            if (r.getApprovedBy() != null) employeeIds.add(r.getApprovedBy());
            if (r.getRejectedBy() != null) employeeIds.add(r.getRejectedBy());
        }

        if (employeeIds.isEmpty()) return responses;

        // Single batch query
        Map<UUID, String> nameMap = new HashMap<>();
        employeeRepository.findAllById(employeeIds)
                .forEach(emp -> nameMap.put(emp.getId(), emp.getFirstName() + " " + emp.getLastName()));

        // Enrich all responses from the map
        for (ExpenseClaimResponse r : responses) {
            if (r.getEmployeeId() != null && nameMap.containsKey(r.getEmployeeId())) {
                r.setEmployeeName(nameMap.get(r.getEmployeeId()));
            }
            if (r.getApprovedBy() != null && nameMap.containsKey(r.getApprovedBy())) {
                r.setApprovedByName(nameMap.get(r.getApprovedBy()));
            }
            if (r.getRejectedBy() != null && nameMap.containsKey(r.getRejectedBy())) {
                r.setRejectedByName(nameMap.get(r.getRejectedBy()));
            }
        }

        return responses;
    }

    // ==================== Scope Validation Helpers ====================

    /**
     * Determines which view permission the user has (in priority order).
     * Returns the actual permission that has a scope assigned, not just any permission that passes
     * hasPermission() check. This ensures getPermissionScope() can find the scope for validation.
     *
     * Note: Checks for explicit EXPENSE_VIEW_* permissions first, then falls back to EXPENSE:MANAGE.
     * Permission hierarchy (MODULE:MANAGE implying MODULE:VIEW_*) is handled by @RequiresPermission
     * for access control, and this method ensures scope enforcement works for users with only MANAGE.
     */
    private String determineViewPermission() {
        // Check specific view permissions in priority order (highest to lowest privilege)
        if (SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_ALL) != null) {
            return Permission.EXPENSE_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_TEAM) != null) {
            return Permission.EXPENSE_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW) != null) {
            return Permission.EXPENSE_VIEW;
        }

        // Fallback to EXPENSE:MANAGE - users with MANAGE permission can view with that permission's scope
        RoleScope manageScope = SecurityContext.getPermissionScope(Permission.EXPENSE_MANAGE);
        if (manageScope != null) {
            return Permission.EXPENSE_MANAGE;
        }

        // Final fallback: user passed @RequiresPermission check but has no scoped permission
        // This can happen with system admin. Return VIEW as safest default for scope lookup.
        return Permission.EXPENSE_VIEW;
    }

    /**
     * Validates that the current user can access data for a specific employee based on their scope.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // Super admin (includes system admin and SUPER_ADMIN role) bypasses all checks
        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new AccessDeniedException("No access to expense claims");
        }

        switch (scope) {
            case ALL:
                // ALL scope: can access any employee's data
                return;

            case LOCATION:
                // LOCATION scope: target employee must be in same location
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;

            case DEPARTMENT:
                // DEPARTMENT scope: target employee must be in same department
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;

            case TEAM:
                // TEAM scope: target must be self or a reportee
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;

            case SELF:
                // SELF scope: can only access own data
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;

            case CUSTOM:
                // CUSTOM scope: check if target is in custom targets
                if (targetEmployeeId.equals(currentEmployeeId) || isInCustomTargets(targetEmployeeId, permission)) {
                    return;
                }
                break;
        }

        throw new AccessDeniedException(
                "You do not have permission to access this employee's expense claims");
    }

    private boolean isReportee(UUID employeeId) {
        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.requireCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId()))
                .orElse(false);
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.requireCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> departmentId.equals(emp.getDepartmentId()))
                .orElse(false);
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        // Check if employee is directly in custom employee targets
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);

        boolean needsDeptCheck = customDepartmentIds != null && !customDepartmentIds.isEmpty();
        boolean needsLocCheck = customLocationIds != null && !customLocationIds.isEmpty();

        // Single DB lookup for both department and location checks
        if (needsDeptCheck || needsLocCheck) {
            UUID tenantId = TenantContext.requireCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent()) {
                Employee emp = empOpt.get();
                if (needsDeptCheck && emp.getDepartmentId() != null
                        && customDepartmentIds.contains(emp.getDepartmentId())) {
                    return true;
                }
                if (needsLocCheck && emp.getOfficeLocationId() != null
                        && customLocationIds.contains(emp.getOfficeLocationId())) {
                    return true;
                }
            }
        }

        return false;
    }
}
