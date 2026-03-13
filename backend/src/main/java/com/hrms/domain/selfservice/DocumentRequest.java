package com.hrms.domain.selfservice;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentRequest extends TenantAware {


    @Column(nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType documentType;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    private String addressedTo;

    private LocalDate requiredByDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeliveryMode deliveryMode = DeliveryMode.DIGITAL;

    private String deliveryAddress;

    private UUID processedBy;
    private LocalDateTime processedAt;

    @Column(columnDefinition = "TEXT")
    private String processingNotes;

    private String generatedDocumentUrl;
    private LocalDateTime documentGeneratedAt;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Builder.Default
    private Integer priority = 2; // 1=High, 2=Normal, 3=Low

    public enum DocumentType {
        EMPLOYMENT_CERTIFICATE,
        SALARY_CERTIFICATE,
        EXPERIENCE_LETTER,
        RELIEVING_LETTER,
        BONAFIDE_CERTIFICATE,
        ADDRESS_PROOF_LETTER,
        VISA_LETTER,
        BANK_LETTER,
        SALARY_SLIP,
        FORM_16,
        APPOINTMENT_LETTER_COPY,
        CUSTOM
    }

    public enum RequestStatus {
        PENDING,
        IN_PROGRESS,
        GENERATED,
        DELIVERED,
        REJECTED,
        CANCELLED
    }

    public enum DeliveryMode {
        DIGITAL,
        PHYSICAL,
        BOTH
    }

    public void startProcessing(UUID processedById) {
        this.status = RequestStatus.IN_PROGRESS;
        this.processedBy = processedById;
    }

    public void markGenerated(String documentUrl) {
        this.status = RequestStatus.GENERATED;
        this.generatedDocumentUrl = documentUrl;
        this.documentGeneratedAt = LocalDateTime.now();
        this.processedAt = LocalDateTime.now();
    }

    public void markDelivered() {
        this.status = RequestStatus.DELIVERED;
    }

    public void reject(UUID rejectedBy, String reason) {
        this.status = RequestStatus.REJECTED;
        this.processedBy = rejectedBy;
        this.processedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void cancel() {
        this.status = RequestStatus.CANCELLED;
    }
}
