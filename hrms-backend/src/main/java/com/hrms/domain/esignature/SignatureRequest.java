package com.hrms.domain.esignature;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "signature_requests", indexes = {
        @Index(name = "idx_sig_req_tenant", columnList = "tenant_id"),
        @Index(name = "idx_sig_req_creator", columnList = "tenant_id,created_by"),
        @Index(name = "idx_sig_req_status", columnList = "tenant_id,status"),
        @Index(name = "idx_sig_req_doc_type", columnList = "tenant_id,document_type"),
        @Index(name = "idx_sig_req_expires", columnList = "tenant_id,expires_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignatureRequest {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "document_type", nullable = false, length = 100)
    @Enumerated(EnumType.STRING)
    private DocumentType documentType;

    @Column(name = "document_url", length = 1000)
    private String documentUrl;

    @Column(name = "document_name", length = 500)
    private String documentName;

    @Column(name = "document_size")
    private Long documentSize;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "status", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private SignatureStatus status;

    @Column(name = "required_signatures")
    private Integer requiredSignatures;

    @Column(name = "received_signatures")
    private Integer receivedSignatures;

    @Column(name = "signature_order", nullable = false)
    private Boolean signatureOrder; // If true, signatures must be in order

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "reminder_frequency_days")
    private Integer reminderFrequencyDays;

    @Column(name = "last_reminder_sent_at")
    private LocalDateTime lastReminderSentAt;

    @Column(name = "is_template")
    private Boolean isTemplate;

    @Column(name = "template_name", length = 255)
    private String templateName;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata; // JSON field for additional data

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum DocumentType {
        OFFER_LETTER,
        EMPLOYMENT_CONTRACT,
        NDA,
        POLICY_ACKNOWLEDGEMENT,
        APPRAISAL_LETTER,
        RESIGNATION_ACCEPTANCE,
        PROMOTION_LETTER,
        TRANSFER_LETTER,
        SALARY_REVISION,
        BONUS_LETTER,
        TRAINING_AGREEMENT,
        EXPENSE_APPROVAL,
        LEAVE_APPROVAL,
        PERFORMANCE_REVIEW,
        WARNING_LETTER,
        TERMINATION_LETTER,
        EXIT_FORMALITIES,
        CUSTOM
    }

    public enum SignatureStatus {
        DRAFT,           // Request created but not sent
        PENDING,         // Sent to signers, awaiting signatures
        IN_PROGRESS,     // Some signatures received
        COMPLETED,       // All signatures received
        EXPIRED,         // Passed expiry date
        CANCELLED,       // Cancelled by creator
        DECLINED         // Declined by a signer
    }
}
