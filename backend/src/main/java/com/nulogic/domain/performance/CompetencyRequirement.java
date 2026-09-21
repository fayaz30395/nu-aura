package com.nulogic.domain.performance;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "competency_requirements", indexes = {
        @Index(name = "idx_competency_requirement_tenant", columnList = "tenant_id"),
        @Index(name = "idx_competency_requirement_framework", columnList = "framework_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CompetencyRequirement extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "framework_id", nullable = false)
    @JsonIgnore
    private CompetencyFramework framework;

    @Column(name = "framework_id", insertable = false, updatable = false)
    private UUID frameworkId;

    @Column(name = "skill_name", nullable = false, length = 200)
    private String skillName;

    /** 1-5 proficiency scale, matching EmployeeSkill.proficiencyLevel. */
    @Column(name = "required_level", nullable = false)
    private Integer requiredLevel;
}
