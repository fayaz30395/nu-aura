package com.hrms.domain.recognition;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "recognitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Recognition extends TenantAware {


    @Column(nullable = false)
    private UUID giverId;

    @Column(nullable = false)
    private UUID receiverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecognitionType type;

    @Enumerated(EnumType.STRING)
    private RecognitionCategory category;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Builder.Default
    private Integer pointsAwarded = 0;

    @Builder.Default
    private Boolean isPublic = true;

    @Builder.Default
    private Boolean isAnonymous = false;

    private UUID badgeId;

    // Reference to wall post for social features (reactions/comments)
    private UUID wallPostId;

    @Builder.Default
    private Integer likesCount = 0;

    @Builder.Default
    private Integer commentsCount = 0;

    @Builder.Default
    private Boolean isApproved = true;

    private UUID approvedBy;
    private LocalDateTime approvedAt;

    private LocalDateTime recognizedAt;

    public void approve(UUID approverId) {
        this.isApproved = true;
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void incrementLikes() {
        this.likesCount++;
    }

    public void decrementLikes() {
        if (this.likesCount > 0) {
            this.likesCount--;
        }
    }

    public void incrementComments() {
        this.commentsCount++;
    }

    public enum RecognitionType {
        KUDOS,
        APPRECIATION,
        ACHIEVEMENT,
        MILESTONE,
        SPOT_AWARD,
        PEER_NOMINATION,
        MANAGER_RECOGNITION,
        TEAM_RECOGNITION
    }

    public enum RecognitionCategory {
        TEAMWORK,
        INNOVATION,
        CUSTOMER_FOCUS,
        LEADERSHIP,
        PROBLEM_SOLVING,
        GOING_EXTRA_MILE,
        MENTORSHIP,
        QUALITY,
        INITIATIVE,
        COLLABORATION,
        COMMUNICATION,
        OTHER
    }
}
