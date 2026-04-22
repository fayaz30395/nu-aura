package com.hrms.domain.letter;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "generated_letters")
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
        return String.format("%s/%d/%04d", prefix, LocalDate.now().getYear(), sequence);
    }

    public void submitForApproval() {
        this.status = LetterStatus.PENDING_APPROVAL;
    }

    public void approve(UUID approverId, String comments) {
        this.status = LetterStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
        this.approvalComments = comments;
    }

    public void issue(UUID issuerId) {
        this.status = LetterStatus.ISSUED;
        this.issuedBy = issuerId;
        this.issuedAt = LocalDateTime.now();
    }

    public void revoke() {
        this.status = LetterStatus.REVOKED;
    }

    public void markSent() {
        this.sentToEmployee = true;
        this.sentAt = LocalDateTime.now();
    }

    public void markDownloaded() {
        this.downloadedByEmployee = true;
        this.downloadedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        if (this.status != LetterStatus.ISSUED) return false;
        if (this.expiryDate != null && this.expiryDate.isBefore(LocalDate.now())) {
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
