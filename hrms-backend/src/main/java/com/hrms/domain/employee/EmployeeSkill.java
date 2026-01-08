package com.hrms.domain.employee;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "employee_skills", indexes = {
        @Index(name = "idx_emp_skill_tenant", columnList = "tenantId"),
        @Index(name = "idx_emp_skill_employee", columnList = "employeeId"),
        @Index(name = "idx_emp_skill_name", columnList = "skillName")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSkill extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "proficiency_level", nullable = false)
    private Integer proficiencyLevel; // 1-5

    @Column(name = "years_of_experience")
    private Double yearsOfExperience;

    @Column(name = "last_used")
    private LocalDateTime lastUsed;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "source")
    private String source; // e.g., "SELF", "MANAGER", "COURSE_COMPLETION"

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
