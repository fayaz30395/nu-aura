package com.nulogic.domain.letter;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimeProvider;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "generated_letters")
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class GeneratedLetter extends TenantAware {


    @Column(nullable = false, unique = true)
    private String referenceNumber;

    @Column(nullable = false)
    private UUID templateId;

    // Either employeeId or candidateId should be set, not both
    private UUID employeeId;

    // For offer letters to candidates (not yet employees)
    private UUID candidateId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LetterTemplate.LetterCategory category;

    @Column(nullable = false)
    private String letterTitle;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String generatedContent;

    @Column(columnDefinition = "TEXT")
    private String pdfUrl;

    private LocalDate letterDate;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LetterStatus status = LetterStatus.DRAFT;

    private UUID generatedBy;

    @TenantTimestamp
    private LocalDateTime generatedAt;

    private UUID approvedBy;
    private LocalDateTime approvedAt;

    @Column(columnDefinition = "TEXT")
    private String approvalComments;

    private UUID issuedBy;
    private LocalDateTime issuedAt;

    @Builder.Default
    private Boolean sentToEmployee = false;
    private LocalDateTime sentAt;

    @Builder.Default
    private Boolean downloadedByEmployee = false;
    private LocalDateTime downloadedAt;

    @Column(columnDefinition = "TEXT")
    private String additionalNotes;

    @Column(columnDefinition = "TEXT")
    private String customPlaceholderValues;

    @Builder.Default
    private Integer letterVersion = 1;

    private UUID previousVersionId;

    public static String generateReferenceNumber(String prefix, int sequence) {
        // JVM-local: year-prefix for human-readable reference. Year boundary in tenant zone
        // differs from JVM by at most ~13 hours; not worth threading a tenantId through a static
        // helper that is called from service layer before the entity's tenantId is known.
        return String.format("%s/%d/%04d", prefix, LocalDate.now().getYear(), sequence);
    }

    public void submitForApproval() {
        this.status = LetterStatus.PENDING_APPROVAL;
    }

    public void approve(UUID approverId, String comments, LocalDateTime now) {
        this.status = LetterStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = now;
        this.approvalComments = comments;
    }

    public void issue(UUID issuerId, LocalDateTime now) {
        this.status = LetterStatus.ISSUED;
        this.issuedBy = issuerId;
        this.issuedAt = now;
    }

    public void revoke() {
        this.status = LetterStatus.REVOKED;
    }

    public void markSent(LocalDateTime now) {
        this.sentToEmployee = true;
        this.sentAt = now;
    }

    public void markDownloaded(LocalDateTime now) {
        this.downloadedByEmployee = true;
        this.downloadedAt = now;
    }

    /**
     * Returns {@code true} when this letter has been issued and has not yet passed its
     * expiry date in the tenant's IANA timezone.
     *
     * <p>Uses {@link TenantTimeProvider#today(UUID)} so that a letter with
     * {@code expiryDate = 2026-07-01} is not considered expired a day early for tenants
     * whose server runs in a zone that has already crossed midnight into 2026-07-02.</p>
     */
    public boolean isActive() {
        if (this.status != LetterStatus.ISSUED) return false;
        if (this.expiryDate != null && this.expiryDate.isBefore(TenantTimeProvider.today(getTenantId()))) {
            return false;
        }
        return true;
    }

    public enum LetterStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        ISSUED,
        REVOKED,
        EXPIRED
    }
}
