package com.hrms.application.expense.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.ExpensePolicyRequest;
import com.hrms.api.expense.dto.ExpensePolicyResponse;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.expense.ExpensePolicy;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.expense.repository.ExpensePolicyRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpensePolicyService {

    private final ExpensePolicyRepository policyRepository;
    private final ExpenseClaimRepository claimRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ExpensePolicyResponse createPolicy(ExpensePolicyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (policyRepository.existsByNameAndTenantId(request.getName(), tenantId)) {
            throw new ValidationException("Policy with name '" + request.getName() + "' already exists");
        }

        ExpensePolicy policy = ExpensePolicy.builder()
                .name(request.getName())
                .description(request.getDescription())
                .applicableDepartments(toJson(request.getApplicableDepartments()))
                .applicableDesignations(toJson(request.getApplicableDesignations()))
                .dailyLimit(request.getDailyLimit())
                .monthlyLimit(request.getMonthlyLimit())
                .yearlyLimit(request.getYearlyLimit())
                .singleClaimLimit(request.getSingleClaimLimit())
                .requiresPreApproval(request.isRequiresPreApproval())
                .preApprovalThreshold(request.getPreApprovalThreshold())
                .receiptRequiredAbove(request.getReceiptRequiredAbove())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .isActive(true)
                .build();
        policy.setTenantId(tenantId);

        ExpensePolicy saved = policyRepository.save(policy);
        log.info("Created expense policy: {} for tenant: {}", saved.getName(), tenantId);
        return ExpensePolicyResponse.fromEntity(saved);
    }

    @Transactional
    public ExpensePolicyResponse updatePolicy(UUID policyId, ExpensePolicyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpensePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense policy not found: " + policyId));

        if (!policy.getName().equals(request.getName()) &&
                policyRepository.existsByNameAndTenantId(request.getName(), tenantId)) {
            throw new ValidationException("Policy with name '" + request.getName() + "' already exists");
        }

        policy.setName(request.getName());
        policy.setDescription(request.getDescription());
        policy.setApplicableDepartments(toJson(request.getApplicableDepartments()));
        policy.setApplicableDesignations(toJson(request.getApplicableDesignations()));
        policy.setDailyLimit(request.getDailyLimit());
        policy.setMonthlyLimit(request.getMonthlyLimit());
        policy.setYearlyLimit(request.getYearlyLimit());
        policy.setSingleClaimLimit(request.getSingleClaimLimit());
        policy.setRequiresPreApproval(request.isRequiresPreApproval());
        policy.setPreApprovalThreshold(request.getPreApprovalThreshold());
        policy.setReceiptRequiredAbove(request.getReceiptRequiredAbove());
        if (request.getCurrency() != null) {
            policy.setCurrency(request.getCurrency());
        }

        ExpensePolicy saved = policyRepository.save(policy);
        log.info("Updated expense policy: {}", saved.getName());
        return ExpensePolicyResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public ExpensePolicyResponse getPolicy(UUID policyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpensePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense policy not found: " + policyId));
        return ExpensePolicyResponse.fromEntity(policy);
    }

    @Transactional(readOnly = true)
    public List<ExpensePolicyResponse> getActivePolicies() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return policyRepository.findAllByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(ExpensePolicyResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ExpensePolicyResponse> getAllPolicies(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return policyRepository.findAllByTenantId(tenantId, pageable)
                .map(ExpensePolicyResponse::fromEntity);
    }

    @Transactional
    public void togglePolicyActive(UUID policyId, boolean active) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpensePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense policy not found: " + policyId));
        policy.setActive(active);
        policyRepository.save(policy);
        log.info("Toggled expense policy {} active={}", policy.getName(), active);
    }

    @Transactional
    public void deletePolicy(UUID policyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpensePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense policy not found: " + policyId));
        policy.softDelete();
        policyRepository.save(policy);
        log.info("Soft-deleted expense policy: {}", policy.getName());
    }

    /**
     * Validate a claim against applicable policies.
     * Returns a list of policy violation messages (empty if compliant).
     */
    @Transactional(readOnly = true)
    public List<String> validateClaimAgainstPolicies(UUID employeeId, BigDecimal claimAmount) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<ExpensePolicy> policies = policyRepository.findAllByTenantIdAndIsActiveTrue(tenantId);
        List<String> violations = new ArrayList<>();

        for (ExpensePolicy policy : policies) {
            // Check single claim limit
            if (policy.getSingleClaimLimit() != null && claimAmount.compareTo(policy.getSingleClaimLimit()) > 0) {
                violations.add("Claim amount " + claimAmount + " exceeds single claim limit of " +
                        policy.getSingleClaimLimit() + " (Policy: " + policy.getName() + ")");
            }

            // Check monthly limit
            if (policy.getMonthlyLimit() != null) {
                LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                BigDecimal monthTotal = claimRepository.sumByEmployeeAndStatusAndDateRange(
                        tenantId, employeeId, ExpenseClaim.ExpenseStatus.APPROVED, monthStart, monthEnd);
                if (monthTotal == null) monthTotal = BigDecimal.ZERO;
                BigDecimal projected = monthTotal.add(claimAmount);
                if (projected.compareTo(policy.getMonthlyLimit()) > 0) {
                    violations.add("Monthly total would be " + projected + ", exceeding monthly limit of " +
                            policy.getMonthlyLimit() + " (Policy: " + policy.getName() + ")");
                }
            }

            // Check yearly limit
            if (policy.getYearlyLimit() != null) {
                LocalDate yearStart = LocalDate.now().withDayOfYear(1);
                LocalDate yearEnd = yearStart.plusYears(1).minusDays(1);
                BigDecimal yearTotal = claimRepository.sumByEmployeeAndStatusAndDateRange(
                        tenantId, employeeId, ExpenseClaim.ExpenseStatus.APPROVED, yearStart, yearEnd);
                if (yearTotal == null) yearTotal = BigDecimal.ZERO;
                BigDecimal projected = yearTotal.add(claimAmount);
                if (projected.compareTo(policy.getYearlyLimit()) > 0) {
                    violations.add("Yearly total would be " + projected + ", exceeding yearly limit of " +
                            policy.getYearlyLimit() + " (Policy: " + policy.getName() + ")");
                }
            }
        }

        return violations;
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize to JSON: {}", e.getMessage());
            return null;
        }
    }
}
