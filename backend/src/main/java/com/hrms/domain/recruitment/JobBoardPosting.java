package com.hrms.domain.recruitment;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "job_board_postings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobBoardPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_name", nullable = false, length = 50)
    private JobBoard boardName;

    @Column(name = "external_job_id", length = 200)
    private String externalJobId;

    @Column(name = "external_url", columnDefinition = "TEXT")
    private String externalUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PostingStatus status = PostingStatus.PENDING;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "applications_count")
    @Builder.Default
    private Integer applicationsCount = 0;

    @Column(name = "views_count")
    @Builder.Default
    private Integer viewsCount = 0;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum JobBoard {
        NAUKRI,
        INDEED,
        LINKEDIN,
        SHINE,
        MONSTER
    }

    public enum PostingStatus {
        PENDING,
        ACTIVE,
        PAUSED,
        EXPIRED,
        FAILED
    }
}
