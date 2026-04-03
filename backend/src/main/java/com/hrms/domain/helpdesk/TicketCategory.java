package com.hrms.domain.helpdesk;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_categories", indexes = {
        @Index(name = "idx_category_tenant", columnList = "tenantId"),
        @Index(name = "idx_category_parent", columnList = "parentCategoryId"),
        @Index(name = "idx_category_dept", columnList = "departmentType")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketCategory {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "parent_category_id")
    private UUID parentCategoryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "department_type", length = 30)
    private DepartmentType departmentType;

    @Column(name = "default_assignee_id")
    private UUID defaultAssigneeId;

    @Column(name = "default_assignee_role", length = 100)
    private String defaultAssigneeRole;

    @Column(name = "sla_id")
    private UUID slaId;

    @Column(name = "sla_hours")
    private Integer slaHours;

    @Column(name = "icon", length = 50)
    private String icon;

    @Column(name = "color", length = 20)
    private String color;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "requires_approval")
    private Boolean requiresApproval = false;

    @Column(name = "approval_workflow_id")
    private UUID approvalWorkflowId;

    @Column(name = "auto_close_after_days")
    private Integer autoCloseAfterDays;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_visible_to_employees")
    private Boolean isVisibleToEmployees = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum DepartmentType {
        HR,
        IT,
        FINANCE,
        PAYROLL,
        ADMIN,
        FACILITIES,
        LEGAL,
        COMPLIANCE,
        OTHER
    }
}
