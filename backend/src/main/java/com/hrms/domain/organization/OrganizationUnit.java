package com.hrms.domain.organization;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "organization_units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrganizationUnit extends TenantAware {


    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UnitType type;

    private UUID parentId;

    private UUID headId; // Employee ID of the unit head

    private Integer level; // Hierarchy level (0 = root)

    private String path; // Full path like "ROOT/DIV1/DEPT1"

    @Builder.Default
    private Integer employeeCount = 0;

    @Builder.Default
    private Boolean isActive = true;

    private Integer sortOrder;

    private String costCenter;

    private String location;

    public enum UnitType {
        COMPANY,
        DIVISION,
        DEPARTMENT,
        TEAM,
        UNIT,
        PROJECT,
        BRANCH,
        REGION
    }
}
