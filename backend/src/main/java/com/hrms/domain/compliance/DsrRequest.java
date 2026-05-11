package com.hrms.domain.compliance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * GDPR Data Subject Rights (DSR) request — Articles 15 (Access), 17 (Erasure),
 * 20 (Portability), 16 (Rectification).
 *
 * <p>This entity is the auditable intake queue for DSR requests. A request is
 * created via {@code DsrController} when a user invokes one of their data
 * rights endpoints. The row is persisted in {@link Status#PENDING}, an
 * operations team is emailed at {@code support@nulogic.io}, and a
 * {@code SYSTEM_ADMIN} later moves it through {@link Status#IN_PROGRESS} to a
 * terminal {@link Status#COMPLETED} or {@link Status#REJECTED}.</p>
 *
 * <p><strong>Scaffold note:</strong> this is the *queue* — actual data export
 * (Articles 15/20) and erasure cascading (Article 17) across employees,
 * payroll, attendance, audit, etc., is the deep work. This entity creates the
 * legal record that satisfies the 30-day statutory response window while the
 * full automated implementation is built.</p>
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "dsr_requests", indexes = {
        @Index(name = "idx_dsr_requests_tenant_status", columnList = "tenant_id, status"),
        @Index(name = "idx_dsr_requests_requester", columnList = "requester_user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DsrRequest extends TenantAware {

    /**
     * The user (typically a tenant employee) who exercised the GDPR right.
     * Kept as a logical reference, not an FK, so DSR records survive an
     * Article 17 erasure that removes the user row itself.
     */
    @Column(name = "requester_user_id", nullable = false)
    private UUID requesterUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 32)
    private RequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Free-text justification supplied by the requester. Optional. */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    /** Notes from the ops handler explaining fulfilment / rejection. */
    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    /** Set when status transitions to {@link Status#COMPLETED} or {@link Status#REJECTED}. */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * The {@code SYSTEM_ADMIN} user who moved the request to a terminal state.
     * Null while {@link Status#PENDING}.
     */
    @Column(name = "handler_user_id")
    private UUID handlerUserId;

    /**
     * SHA-256 (lowercase hex) of the exported artefact bytes for an
     * Article 15 / 20 fulfilment. Null for ERASURE / RECTIFICATION rows
     * and for ACCESS / PORTABILITY rows that have not been fulfilled.
     */
    @Column(name = "artifact_sha256", length = 64)
    private String artifactSha256;

    /** Byte size of the exported artefact (see {@link #artifactSha256}). */
    @Column(name = "artifact_size")
    private Long artifactSize;

    @PrePersist
    public void prePersist() {
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }

    /** Marks the request as terminal and records the handler + timestamp. */
    public void complete(UUID handlerId, String notes) {
        this.status = Status.COMPLETED;
        this.handlerUserId = handlerId;
        this.adminNotes = notes;
        this.completedAt = LocalDateTime.now();
    }

    /** Marks the request as rejected (e.g. identity verification failed). */
    public void reject(UUID handlerId, String notes) {
        this.status = Status.REJECTED;
        this.handlerUserId = handlerId;
        this.adminNotes = notes;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * GDPR right exercised. Each value maps to a specific Article in the
     * regulation; surfaced in the OpenAPI annotations on {@code DsrController}.
     */
    public enum RequestType {
        /** Article 15 — right to confirmation + copy of personal data held. */
        ACCESS,
        /** Article 17 — right to erasure ("right to be forgotten"). */
        ERASURE,
        /** Article 20 — right to receive data in a portable, machine-readable form. */
        PORTABILITY,
        /** Article 16 — right to rectification of inaccurate personal data. */
        RECTIFICATION
    }

    /** Lifecycle of an intake request. */
    public enum Status {
        /** Awaiting ops triage. */
        PENDING,
        /** A handler has picked up the request and started fulfilment. */
        IN_PROGRESS,
        /** Fulfilled — export delivered / data erased / record corrected. */
        COMPLETED,
        /** Refused (e.g. identity not verified, or request out of scope). */
        REJECTED
    }
}
