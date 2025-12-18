package com.hrms.domain.document;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "generated_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedDocument {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(name = "document_number", length = 50, unique = true)
    private String documentNumber;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private DocumentStatus status;

    @Column(name = "generated_data", columnDefinition = "TEXT")
    private String generatedData; // JSON of the data used to generate

    @Column(name = "is_signed")
    private Boolean isSigned;

    @Column(name = "signature_data", columnDefinition = "TEXT")
    private String signatureData;

    @Column(name = "valid_until")
    private LocalDateTime validUntil;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum DocumentStatus {
        DRAFT,
        GENERATED,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        SENT,
        SIGNED,
        ARCHIVED
    }
}
