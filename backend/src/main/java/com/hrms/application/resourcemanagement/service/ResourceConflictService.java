package com.hrms.application.resourcemanagement.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Detects and logs resource allocation conflicts:
 * <ul>
 *   <li>Over-allocation: total allocation % > 100% on any day.</li>
 *   <li>Double-booking: same employee on overlapping projects simultaneously.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceConflictService {

    /** Alert threshold: if combined allocation exceeds this %, flag as conflict. */
    private static final int OVER_ALLOCATION_THRESHOLD = 100;

    private final ProjectEmployeeRepository projectEmployeeRepository;
    private final JdbcTemplate jdbcTemplate;

    // ========== On-demand conflict check (per employee) ==========

    /**
     * Check if adding an employee to a project at the given allocation % would cause
     * a conflict with their existing active allocations.
     *
     * @return list of conflict descriptions; empty = no conflict
     */
    @Transactional(readOnly = true)
    public List<ConflictResult> checkAllocationConflict(
            UUID employeeId,
            UUID projectId,
            LocalDate startDate,
            LocalDate endDate,
            int newAllocationPct) {

        UUID tenantId = TenantContext.requireCurrentTenant();

        List<ProjectEmployee> existingAllocations = projectEmployeeRepository
                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true)
                .stream()
                .filter(pe -> !pe.getProjectId().equals(projectId))  // exclude same project
                .filter(pe -> datesOverlap(pe.getStartDate(), pe.getEndDate(), startDate, endDate))
                .collect(Collectors.toList());

        List<ConflictResult> conflicts = new ArrayList<>();
        int totalAllocated = newAllocationPct;

        for (ProjectEmployee pe : existingAllocations) {
            totalAllocated += (pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0);
        }

        if (totalAllocated > OVER_ALLOCATION_THRESHOLD) {
            conflicts.add(new ConflictResult(
                    employeeId,
                    projectId,
                    null,
                    startDate,
                    endDate,
                    totalAllocated,
                    "Employee would be over-allocated at " + totalAllocated + "% (max 100%)"));
        }

        return conflicts;
    }

    /**
     * Scan all active allocations for a tenant and find over-allocated employees.
     * Persists findings to resource_conflict_log.
     */
    @Transactional
    public List<ConflictResult> scanTenantConflicts(UUID tenantId) {
        List<ProjectEmployee> all = projectEmployeeRepository
                .findAllActiveAssignments(tenantId);

        // Group by employeeId
        Map<UUID, List<ProjectEmployee>> byEmployee = all.stream()
                .collect(Collectors.groupingBy(ProjectEmployee::getEmployeeId));

        List<ConflictResult> conflicts = new ArrayList<>();

        for (Map.Entry<UUID, List<ProjectEmployee>> entry : byEmployee.entrySet()) {
            UUID empId = entry.getKey();
            List<ProjectEmployee> empAllocations = entry.getValue();

            if (empAllocations.size() < 2) continue;

            // For each pair, check overlap
            for (int i = 0; i < empAllocations.size(); i++) {
                for (int j = i + 1; j < empAllocations.size(); j++) {
                    ProjectEmployee a = empAllocations.get(i);
                    ProjectEmployee b = empAllocations.get(j);

                    if (!datesOverlap(a.getStartDate(), a.getEndDate(), b.getStartDate(), b.getEndDate())) {
                        continue;
                    }

                    int totalPct = (a.getAllocationPercentage() != null ? a.getAllocationPercentage() : 0)
                                 + (b.getAllocationPercentage() != null ? b.getAllocationPercentage() : 0);

                    if (totalPct > OVER_ALLOCATION_THRESHOLD) {
                        LocalDate overlapStart = laterDate(a.getStartDate(), b.getStartDate());
                        LocalDate overlapEnd = earlierDate(a.getEndDate(), b.getEndDate());

                        ConflictResult conflict = new ConflictResult(
                                empId,
                                a.getProjectId(),
                                b.getProjectId(),
                                overlapStart,
                                overlapEnd,
                                totalPct,
                                "Over-allocated: " + a.getProjectId() + " + " + b.getProjectId()
                                        + " = " + totalPct + "%");

                        conflicts.add(conflict);
                        persistConflict(tenantId, conflict);
                    }
                }
            }
        }

        log.info("Resource conflict scan for tenant {}: {} conflicts found", tenantId, conflicts.size());
        return conflicts;
    }

    /**
     * Resolve a conflict (mark as RESOLVED in log).
     */
    @Transactional
    public void resolveConflict(UUID conflictLogId, UUID resolvedBy) {
        jdbcTemplate.update(
                "UPDATE resource_conflict_log SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = ? WHERE id = ?",
                resolvedBy, conflictLogId);
    }

    /**
     * Get open conflicts for a tenant.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOpenConflicts(UUID tenantId) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM resource_conflict_log WHERE tenant_id = ? AND status = 'OPEN' ORDER BY detected_at DESC",
                tenantId);
    }

    // ========== Helpers ==========

    private boolean datesOverlap(LocalDate startA, LocalDate endA, LocalDate startB, LocalDate endB) {
        if (startA == null || startB == null) return false;
        LocalDate effectiveEndA = endA != null ? endA : LocalDate.of(2099, 12, 31);
        LocalDate effectiveEndB = endB != null ? endB : LocalDate.of(2099, 12, 31);
        return !startA.isAfter(effectiveEndB) && !startB.isAfter(effectiveEndA);
    }

    private LocalDate laterDate(LocalDate a, LocalDate b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    private LocalDate earlierDate(LocalDate a, LocalDate b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isBefore(b) ? a : b;
    }

    private void persistConflict(UUID tenantId, ConflictResult conflict) {
        try {
            // Use upsert to avoid duplicates
            jdbcTemplate.update(
                    """
                    INSERT INTO resource_conflict_log
                      (id, tenant_id, employee_id, project_id_a, project_id_b,
                       overlap_start_date, overlap_end_date, total_allocation_pct, status)
                    VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, 'OPEN')
                    ON CONFLICT DO NOTHING
                    """,
                    tenantId,
                    conflict.employeeId(),
                    conflict.projectIdA(),
                    conflict.projectIdB() != null ? conflict.projectIdB() : conflict.projectIdA(),
                    conflict.overlapStart(),
                    conflict.overlapEnd(),
                    conflict.totalAllocationPct());
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.warn("Failed to persist conflict log: {}", e.getMessage());
        }
    }

    // ========== Result type ==========

    public record ConflictResult(
            UUID employeeId,
            UUID projectIdA,
            UUID projectIdB,
            LocalDate overlapStart,
            LocalDate overlapEnd,
            int totalAllocationPct,
            String message) {}
}
