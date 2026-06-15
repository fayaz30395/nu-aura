package com.nulogic.domain.recognition;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "milestones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
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

    public void markCelebrated() {
        this.isCelebrated = true;
        this.celebratedAt = LocalDateTime.now(); // JVM-local: internal celebration tracker
    }

    public void markNotificationSent() {
        this.notificationSent = true;
        this.notificationSentAt = LocalDateTime.now(); // JVM-local: server-side send stamp
    }

    public void incrementWishes() {
        this.wishesCount++;
    }

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
}
