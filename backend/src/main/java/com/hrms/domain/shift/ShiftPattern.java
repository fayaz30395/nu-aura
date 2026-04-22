package com.hrms.domain.shift;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "shift_patterns", indexes = {
        @Index(name = "idx_shift_pattern_tenant", columnList = "tenantId"),
        @Index(name = "idx_shift_pattern_active", columnList = "tenantId,isActive")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShiftPattern extends TenantAware {

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "rotation_type", nullable = false, length = 30)
    private RotationType rotationType;

    /**
     * JSON array of shift IDs forming the rotation cycle.
     * Example: ["dayShiftId","dayShiftId","nightShiftId","nightShiftId","OFF","OFF"]
     * "OFF" is a special marker for days off.
     */
    @Column(name = "pattern", nullable = false, columnDefinition = "TEXT")
    private String pattern;

    @Column(name = "cycle_days", nullable = false)
    private Integer cycleDays;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "color_code", length = 7)
    private String colorCode;

    public enum RotationType {
        FIXED,
        WEEKLY_ROTATING,
        BIWEEKLY_ROTATING,
        CUSTOM
    }
}
