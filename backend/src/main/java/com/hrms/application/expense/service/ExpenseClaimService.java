package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseClaimRequest;
import com.hrms.api.expense.dto.ExpenseClaimResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseClaimService {

    private final ExpenseClaimRepository expenseClaimRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public ExpenseClaimResponse createExpenseClaim(UUID employeeId, ExpenseClaimRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

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

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse updateExpenseClaim(UUID claimId, ExpenseClaimRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

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
        UUID tenantId = TenantContext.getCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.submit();
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Submitted expense claim: {}", saved.getClaimNumber());

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse approveExpenseClaim(UUID claimId, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.approve(approverId);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Approved expense claim: {} by {}", saved.getClaimNumber(), approverId);

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse rejectExpenseClaim(UUID claimId, UUID rejecterId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.reject(rejecterId, reason);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Rejected expense claim: {} by {}", saved.getClaimNumber(), rejecterId);

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse markAsPaid(UUID claimId, LocalDate paymentDate, String paymentReference) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.markAsPaid(paymentDate, paymentReference);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Marked expense claim as paid: {}", saved.getClaimNumber());

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public void cancelExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        claim.cancel();
        expenseClaimRepository.save(claim);
        log.info("Cancelled expense claim: {}", claim.getClaimNumber());
    }

    @Transactional(readOnly = true)
    public ExpenseClaimResponse getExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        return enrichResponse(ExpenseClaimResponse.fromEntity(claim));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getAllExpenseClaims(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return expenseClaimRepository.findAllByTenantId(tenantId, pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return expenseClaimRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByStatus(ExpenseClaim.ExpenseStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return expenseClaimRepository.findAllByStatusAndTenantId(status, tenantId, pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ExpenseClaim.ExpenseStatus> pendingStatuses = List.of(
                ExpenseClaim.ExpenseStatus.SUBMITTED,
                ExpenseClaim.ExpenseStatus.PENDING_APPROVAL
        );
        return expenseClaimRepository.findByStatuses(tenantId, pendingStatuses, pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByDateRange(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return expenseClaimRepository.findByDateRange(tenantId, startDate, endDate, pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExpenseSummary(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Map<String, Object> summary = new HashMap<>();

        // Status counts
        Map<String, Long> statusCounts = new HashMap<>();
        for (ExpenseClaim.ExpenseStatus status : ExpenseClaim.ExpenseStatus.values()) {
            statusCounts.put(status.name(), expenseClaimRepository.countByStatus(tenantId, status));
        }
        summary.put("statusCounts", statusCounts);

        // Amount by status for date range
        Map<String, BigDecimal> amountByStatus = new HashMap<>();
        for (ExpenseClaim.ExpenseStatus status : ExpenseClaim.ExpenseStatus.values()) {
            BigDecimal amount = expenseClaimRepository.sumByStatusAndDateRange(tenantId, status, startDate, endDate);
            amountByStatus.put(status.name(), amount != null ? amount : BigDecimal.ZERO);
        }
        summary.put("amountByStatus", amountByStatus);

        // Category stats
        List<Object[]> categoryStats = expenseClaimRepository.getCategoryStats(tenantId, startDate, endDate);
        List<Map<String, Object>> categoryData = new ArrayList<>();
        for (Object[] stat : categoryStats) {
            Map<String, Object> catStat = new HashMap<>();
            catStat.put("category", stat[0]);
            catStat.put("count", stat[1]);
            catStat.put("totalAmount", stat[2]);
            categoryData.add(catStat);
        }
        summary.put("categoryStats", categoryData);

        summary.put("dateRange", Map.of("startDate", startDate, "endDate", endDate));

        return summary;
    }

    private String generateClaimNumber(UUID tenantId) {
        String prefix = "EXP-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        String maxNumber = expenseClaimRepository.findMaxClaimNumber(tenantId);

        int nextNumber = 1;
        if (maxNumber != null && maxNumber.startsWith(prefix)) {
            try {
                String numPart = maxNumber.substring(prefix.length());
                nextNumber = Integer.parseInt(numPart) + 1;
            } catch (NumberFormatException ignored) {}
        }

        return prefix + String.format("%04d", nextNumber);
    }

    private ExpenseClaimResponse enrichResponse(ExpenseClaimResponse response) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Enrich with employee name
        employeeRepository.findByIdAndTenantId(response.getEmployeeId(), tenantId)
                .ifPresent(emp -> response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName()));

        // Enrich with approver/rejecter names if applicable
        if (response.getApprovedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getApprovedBy(), tenantId)
                    .ifPresent(emp -> response.setApprovedByName(emp.getFirstName() + " " + emp.getLastName()));
        }
        if (response.getRejectedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getRejectedBy(), tenantId)
                    .ifPresent(emp -> response.setRejectedByName(emp.getFirstName() + " " + emp.getLastName()));
        }

        return response;
    }
}
