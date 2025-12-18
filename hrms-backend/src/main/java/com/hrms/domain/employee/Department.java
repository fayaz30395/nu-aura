package com.hrms.domain.employee;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "departments", indexes = {
    @Index(name = "idx_department_code_tenant", columnList = "code,tenantId", unique = true),
    @Index(name = "idx_department_tenant", columnList = "tenantId"),
    @Index(name = "idx_department_parent", columnList = "parentDepartmentId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department extends TenantAware {

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private UUID parentDepartmentId;

    @Column
    private UUID managerId; // Employee ID of department head

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(length = 500)
    private String location;

    @Column(length = 20)
    private String costCenter;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private DepartmentType type;

    public enum DepartmentType {
        ENGINEERING,
        PRODUCT,
        DESIGN,
        MARKETING,
        SALES,
        OPERATIONS,
        FINANCE,
        HR,
        LEGAL,
        ADMIN,
        SUPPORT,
        OTHER
    }
}
