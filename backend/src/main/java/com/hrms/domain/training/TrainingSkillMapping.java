package com.hrms.domain.training;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "training_skill_mappings", indexes = {
        @Index(name = "idx_tsk_tenant_program", columnList = "tenant_id, program_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingSkillMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "program_id", nullable = false)
    private UUID programId;

    @Column(name = "skill_name", nullable = false, length = 200)
    private String skillName;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "proficiency_level", nullable = false)
    @Builder.Default
    private Integer proficiencyLevel = 1;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
