package com.hrms.domain.organization;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "talent_pools")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TalentPool extends TenantAware {


    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private PoolType type;

    @Column(columnDefinition = "TEXT")
    private String criteria; // JSON criteria for auto-matching

    @Builder.Default
    private Integer memberCount = 0;

    @Builder.Default
    private Boolean isActive = true;

    private UUID ownerId;

    public enum PoolType {
        HIGH_POTENTIAL,
        LEADERSHIP,
        TECHNICAL,
        MANAGEMENT,
        SPECIALIST,
        EMERGING_TALENT,
        CRITICAL_SKILLS,
        CUSTOM
    }

    public void incrementMemberCount() {
        this.memberCount++;
    }

    public void decrementMemberCount() {
        if (this.memberCount > 0) {
            this.memberCount--;
        }
    }
}
