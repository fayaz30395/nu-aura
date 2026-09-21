package com.nulogic.domain.performance;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.util.ArrayList;
import java.util.List;

/**
 * A named set of skill requirements for a role family (e.g. "ENGINEER", "MANAGER").
 * Replaces the hardcoded per-role skill map that used to live in
 * SkillGapAnalysisService and the frontend competency framework page.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "competency_frameworks", indexes = {
        @Index(name = "idx_competency_framework_tenant", columnList = "tenant_id"),
        @Index(name = "idx_competency_framework_role_family", columnList = "tenant_id, role_family")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CompetencyFramework extends TenantAware {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Groups employees by job role family (e.g. "ENGINEER" matches
     * Employee.JobRole values containing "ENGINEER" or "DEVELOPER"). "DEFAULT"
     * is the fallback framework used when no role-specific framework matches.
     */
    @Column(name = "role_family", nullable = false, length = 50)
    private String roleFamily;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "framework", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CompetencyRequirement> requirements = new ArrayList<>();
}
