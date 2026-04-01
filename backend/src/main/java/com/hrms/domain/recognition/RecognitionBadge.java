package com.hrms.domain.recognition;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "recognition_badges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RecognitionBadge extends TenantAware {


    @Column(name = "badge_name", nullable = false, length = 255)
    private String badgeName;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    private String color;

    @Enumerated(EnumType.STRING)
    private BadgeLevel level;

    @Builder.Default
    private Integer pointsValue = 0;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Boolean isSystemBadge = false;

    @Enumerated(EnumType.STRING)
    private Recognition.RecognitionCategory category;

    private Integer sortOrder;

    public enum BadgeLevel {
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM,
        DIAMOND
    }
}
