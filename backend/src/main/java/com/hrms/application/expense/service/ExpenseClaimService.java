package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseClaimRequest;
import com.hrms.api.expense.dto.ExpenseClaimResponse;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
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
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseClaimService {

    private final ExpenseClaimRepository expenseClaimRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;

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
    public ExpenseClaimResponse approveExpenseClaim(UUID claimId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        // Validate approver has access to this employee's expense claims
        validateEmployeeAccess(claim.getEmployeeId(), Permission.EXPENSE_APPROVE);

        claim.approve(approverId);
        ExpenseClaim saved = expenseClaimRepository.save(claim);
        log.info("Approved expense claim: {} by {}", saved.getClaimNumber(), approverId);

        return enrichResponse(ExpenseClaimResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseClaimResponse rejectExpenseClaim(UUID claimId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID rejecterId = SecurityContext.getCurrentEmployeeId();

        ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        // Validate rejecter has access to this employee's expense claims
        validateEmployeeAccess(claim.getEmployeeId(), Permission.EXPENSE_APPROVE);

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
        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        return expenseClaimRepository.findAll(tenantSpec.and(spec), pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getExpenseClaimsByEmployee(UUID employeeId, Pageable pageable) {
        // Determine which view permission the user has
        String permission = determineViewPermission();

        // Validate user has access to this employee's expense claims
        validateEmployeeAccess(employeeId, permission);

        UUID tenantId = TenantContext.getCurrentTenant();
        return expenseClaimRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
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
        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> statusSpec = (root, query, cb) -> cb.equal(root.get("status"), status);
        return expenseClaimRepository.findAll(tenantSpec.and(statusSpec).and(spec), pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getPendingApprovals(Pageable pageable) {
        Specification<ExpenseClaim> scopeSpec = dataScopeService.getScopeSpecification(Permission.EXPENSE_APPROVE);
        return getPendingApprovals(scopeSpec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseClaimResponse> getPendingApprovals(Specification<ExpenseClaim> spec, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ExpenseClaim.ExpenseStatus> pendingStatuses = List.of(
                ExpenseClaim.ExpenseStatus.SUBMITTED,
                ExpenseClaim.ExpenseStatus.PENDING_APPROVAL
        );
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> statusSpec = (root, query, cb) -> root.get("status").in(pendingStatuses);
        return expenseClaimRepository.findAll(tenantSpec.and(statusSpec).and(spec), pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
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
        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<ExpenseClaim> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<ExpenseClaim> dateSpec = (root, query, cb) -> cb.between(root.get("claimDate"), startDate, endDate);
        return expenseClaimRepository.findAll(tenantSpec.and(dateSpec).and(spec), pageable)
                .map(claim -> enrichResponse(ExpenseClaimResponse.fromEntity(claim)));
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
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId()))
                .orElse(false);
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
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

        // Check if employee's department is in custom department targets
        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getDepartmentId() != null
                    && customDepartmentIds.contains(empOpt.get().getDepartmentId())) {
                return true;
            }
        }

        // Check if employee's location is in custom location targets
        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getOfficeLocationId() != null
                    && customLocationIds.contains(empOpt.get().getOfficeLocationId())) {
                return true;
            }
        }

        return false;
    }
}
