package com.hrms.domain.recognition;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "milestones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Milestone extends TenantAware {


    @Column(nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MilestoneType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDate milestoneDate;

    private Integer yearsCompleted;

    @Builder.Default
    private Boolean isCelebrated = false;

    private LocalDateTime celebratedAt;

    @Builder.Default
    private Boolean notificationSent = false;

    private LocalDateTime notificationSentAt;

    @Builder.Default
    private Integer wishesCount = 0;

    public enum MilestoneType {
        BIRTHDAY,
        WORK_ANNIVERSARY,
        JOINING,
        PROMOTION,
        PROJECT_COMPLETION,
        CERTIFICATION,
        AWARD,
        CUSTOM
    }

    public void markCelebrated() {
        this.isCelebrated = true;
        this.celebratedAt = LocalDateTime.now();
    }

    public void markNotificationSent() {
        this.notificationSent = true;
        this.notificationSentAt = LocalDateTime.now();
    }

    public void incrementWishes() {
        this.wishesCount++;
    }
}
