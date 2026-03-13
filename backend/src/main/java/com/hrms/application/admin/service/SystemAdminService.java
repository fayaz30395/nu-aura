package com.hrms.application.admin.service;

import com.hrms.api.admin.dto.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.user.User;
import com.hrms.domain.workflow.WorkflowExecution;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for cross-tenant system administration (SuperAdmin only)
 * All queries bypass tenant isolation and operate on the entire system
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemAdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.hrms.application.audit.service.AuditLogService auditLogService;

    /**
     * Get comprehensive system overview across all tenants
     */
    @Transactional(readOnly = true)
    public SystemOverviewDTO getSystemOverview() {
        log.info("SuperAdmin requesting system overview");

        long totalTenants = tenantRepository.count();
        long activeTenants = countActiveTenants();
        long totalEmployees = employeeRepository.count();
        long totalActiveUsers = countActiveUsers();
        long pendingApprovals = countPendingApprovals();

        // TODO: Implement storage usage calculation from MinIO
        // For now, we use a placeholder
        long storageUsageBytes = 0;

        // TODO: Implement AI credits tracking from audit logs or separate service
        long aiCreditsUsed = 0;

        return SystemOverviewDTO.builder()
                .totalTenants(totalTenants)
                .activeTenants(activeTenants)
                .totalEmployees(totalEmployees)
                .totalActiveUsers(totalActiveUsers)
                .storageUsageBytes(storageUsageBytes)
                .aiCreditsUsed(aiCreditsUsed)
                .pendingApprovals(pendingApprovals)
                .build();
    }

    /**
     * Get paginated list of all tenants with basic metrics
     */
    @Transactional(readOnly = true)
    public Page<TenantListItemDTO> getTenantList(Pageable pageable) {
        log.info("SuperAdmin requesting tenant list, page: {}, size: {}",
                pageable.getPageNumber(), pageable.getPageSize());

        Page<Tenant> tenantsPage = tenantRepository.findAll(pageable);

        return tenantsPage.map(this::mapToTenantListItem);
    }

    /**
     * Get deep-dive metrics for a specific tenant
     */
    @Transactional(readOnly = true)
    public TenantMetricsDTO getTenantMetrics(UUID tenantId) {
        log.info("SuperAdmin requesting metrics for tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        long activeUsers = countActiveUsersForTenant(tenantId);
        long totalUsers = countUsersForTenant(tenantId);
        long employeeCount = countEmployeesForTenant(tenantId);
        long storageUsageBytes = 0; // TODO: Calculate from MinIO
        long pendingApprovals = countPendingApprovalsForTenant(tenantId);
        LocalDateTime lastActivityAt = getLastActivityForTenant(tenantId);

        return TenantMetricsDTO.builder()
                .tenantId(tenantId)
                .tenantName(tenant.getName())
                .activeUsers(activeUsers)
                .totalUsers(totalUsers)
                .employeeCount(employeeCount)
                .storageUsageBytes(storageUsageBytes)
                .pendingApprovals(pendingApprovals)
                .lastActivityAt(lastActivityAt)
                .createdAt(tenant.getCreatedAt())
                .build();
    }

    /**
     * Generate an impersonation token for accessing a specific tenant
     * SuperAdmin can use this token to act as if they're part of that tenant
     */
    @Transactional
    public ImpersonationTokenDTO generateImpersonationToken(UUID tenantId) {
        log.info("SuperAdmin generating impersonation token for tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        // Get current SuperAdmin user from security context
        UUID currentUserId = com.hrms.common.security.SecurityContext.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));

        // Generate impersonation token with target tenant context
        // The token will carry the SuperAdmin's user ID but with the tenant context set to target tenant
        String impersonationToken = jwtTokenProvider.generateImpersonationToken(
                currentUser.getId(),
                currentUser.getEmail(),
                tenantId,
                currentUser.getRoles().stream()
                        .map(r -> r.getCode())
                        .collect(Collectors.toSet())
        );

        // Audit log the impersonation
        auditLogService.logAction(
                "TENANT",
                tenantId,
                com.hrms.domain.audit.AuditLog.AuditAction.LOGIN,
                Map.of("action", "impersonation_token_generated"),
                Map.of("admin_user_id", currentUser.getId()),
                "SuperAdmin generated impersonation token for tenant: " + tenant.getName()
        );

        return ImpersonationTokenDTO.builder()
                .token(impersonationToken)
                .tokenType("Bearer")
                .expiresIn(3600) // 1 hour expiry
                .tenantId(tenantId.toString())
                .tenantName(tenant.getName())
                .build();
    }

    /**
     * Get growth metrics over the last N months.
     * Computes cumulative tenant, employee, and user counts by month
     * using actual created_at/joining_date data.
     */
    @Transactional(readOnly = true)
    public GrowthMetricsDTO getGrowthMetrics(int months) {
        log.info("SuperAdmin requesting growth metrics for last {} months", months);

        LocalDate now = LocalDate.now();
        List<GrowthMetricsDTO.MonthlyGrowth> growthList = new ArrayList<>();

        // Get all tenants, employees, and users once
        List<Tenant> allTenants = tenantRepository.findAll();
        List<com.hrms.domain.employee.Employee> allEmployees = employeeRepository.findAll();
        List<User> allUsers = userRepository.findAll();

        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthEnd = now.minusMonths(i).withDayOfMonth(
                    now.minusMonths(i).lengthOfMonth());
            LocalDateTime monthEndDateTime = monthEnd.atTime(23, 59, 59);

            // Cumulative tenants created on or before this month
            long tenantCount = allTenants.stream()
                    .filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isAfter(monthEndDateTime))
                    .count();

            // Cumulative employees who joined on or before this month
            long employeeCount = allEmployees.stream()
                    .filter(e -> e.getJoiningDate() != null && !e.getJoiningDate().isAfter(monthEnd))
                    .count();
            // Fallback: if joiningDate is null, use createdAt
            employeeCount += allEmployees.stream()
                    .filter(e -> e.getJoiningDate() == null && e.getCreatedAt() != null
                            && !e.getCreatedAt().isAfter(monthEndDateTime))
                    .count();

            // Cumulative active users created on or before this month
            long activeUserCount = allUsers.stream()
                    .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isAfter(monthEndDateTime)
                            && u.getStatus() == User.UserStatus.ACTIVE)
                    .count();

            Month month = monthEnd.getMonth();
            growthList.add(GrowthMetricsDTO.MonthlyGrowth.builder()
                    .month(month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                    .year(monthEnd.getYear())
                    .tenants(tenantCount)
                    .activeUsers(activeUserCount)
                    .employees(employeeCount)
                    .build());
        }

        return GrowthMetricsDTO.builder().months(growthList).build();
    }

    // ===================== Helper Methods =====================

    private long countActiveTenants() {
        // Assuming tenants have a status field (e.g., ACTIVE, INACTIVE, SUSPENDED)
        // If not, all tenants are considered active by default
        return tenantRepository.count();
    }

    private long countActiveUsers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getStatus() == User.UserStatus.ACTIVE)
                .count();
    }

    private long countActiveUsersForTenant(UUID tenantId) {
        return userRepository.findByTenantId(tenantId).stream()
                .filter(user -> user.getStatus() == User.UserStatus.ACTIVE)
                .count();
    }

    private long countUsersForTenant(UUID tenantId) {
        return userRepository.countByTenantId(tenantId);
    }

    private long countEmployeesForTenant(UUID tenantId) {
        return employeeRepository.countByTenantId(tenantId);
    }

    private long countPendingApprovals() {
        long count = 0;
        try {
            List<Tenant> allTenants = tenantRepository.findAll();
            for (Tenant tenant : allTenants) {
                count += workflowExecutionRepository.countByStatus(
                        tenant.getId(),
                        WorkflowExecution.ExecutionStatus.PENDING
                );
                count += workflowExecutionRepository.countByStatus(
                        tenant.getId(),
                        WorkflowExecution.ExecutionStatus.IN_PROGRESS
                );
            }
        } catch (Exception e) {
            log.warn("Could not count pending approvals: {}", e.getMessage());
        }
        return count;
    }

    private long countPendingApprovalsForTenant(UUID tenantId) {
        long count = 0;
        try {
            count += workflowExecutionRepository.countByStatus(
                    tenantId,
                    WorkflowExecution.ExecutionStatus.PENDING
            );
            count += workflowExecutionRepository.countByStatus(
                    tenantId,
                    WorkflowExecution.ExecutionStatus.IN_PROGRESS
            );
        } catch (Exception e) {
            log.warn("Could not count pending approvals for tenant {}: {}", tenantId, e.getMessage());
        }
        return count;
    }

    private LocalDateTime getLastActivityForTenant(UUID tenantId) {
        // Get the most recent user login or audit log
        return userRepository.findByTenantId(tenantId).stream()
                .map(User::getLastLoginAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private TenantListItemDTO mapToTenantListItem(Tenant tenant) {
        long employeeCount = countEmployeesForTenant(tenant.getId());
        long userCount = countUsersForTenant(tenant.getId());
        LocalDateTime lastActivityAt = getLastActivityForTenant(tenant.getId());

        return TenantListItemDTO.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .plan("STANDARD") // Default plan, can be extended in future
                .status(tenant.getStatus() != null ? tenant.getStatus().name() : "ACTIVE")
                .employeeCount(employeeCount)
                .userCount(userCount)
                .storageUsageBytes(0) // TODO: Calculate from MinIO
                .createdAt(tenant.getCreatedAt())
                .lastActivityAt(lastActivityAt)
                .build();
    }
}
