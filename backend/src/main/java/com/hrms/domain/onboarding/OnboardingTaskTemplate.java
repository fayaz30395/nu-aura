package com.hrms.domain.onboarding;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.util.UUID;

/**
 * Role-aware onboarding task template (wave-3 F4.6).
 *
 * <p>Distinct from {@link OnboardingTemplateTask}, which belongs to a
 * user-managed {@link OnboardingChecklistTemplate}. Rows in this table are
 * the system-level defaults consulted by
 * {@code OnboardingManagementService.createProcess} when no checklist
 * template is supplied (or, in a future pass, in addition to one).
 *
 * <p>Filter semantics:
 * <ul>
 *   <li>{@code roleFilter == null} — applies to every employee.</li>
 *   <li>{@code roleFilter != null} — applied case-insensitively against
 *       {@code Employee.designation} at the application layer.</li>
 *   <li>{@code departmentFilter} is reserved for future use; the service
 *       currently filters on role only.</li>
 * </ul>
 *
 * @see com.hrms.application.onboarding.service.OnboardingManagementService
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "onboarding_task_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OnboardingTaskTemplate extends TenantAware {

    /**
     * Optional case-insensitive role filter (matched against {@code employees.designation}). Null = applies to all.
     */
    @Column(name = "role_filter", length = 100)
    private String roleFilter;

    /**
     * Optional department filter (matched against {@code employees.department_id}). Null = applies to all.
     */
    @Column(name = "department_filter")
    private UUID departmentFilter;

    @Column(name = "task_name", nullable = false, length = 200)
    private String taskName;

    @Column(name = "task_description", columnDefinition = "TEXT")
    private String taskDescription;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    @Column(name = "due_days_after_join", nullable = false)
    @Builder.Default
    private Integer dueDaysAfterJoin = 7;

    /**
     * Logical assignee role (HR_ADMIN, MANAGER, EMPLOYEE, IT_ADMIN). Stored as
     * metadata only — the existing {@link OnboardingTask} entity uses
     * {@code assignedTo} (UUID) and does not have a role column, so this value
     * is currently surfaced via the task description until that schema is
     * extended.
     */
    @Column(name = "assignee_role", length = 50)
    private String assigneeRole;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
