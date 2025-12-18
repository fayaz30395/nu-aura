package com.hrms.domain.document;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentTemplate {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "template_code", nullable = false, length = 50, unique = true)
    private String templateCode;

    @Column(name = "template_name", nullable = false, length = 200)
    private String templateName;

    @Column(name = "category", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private TemplateCategory category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "template_content", columnDefinition = "TEXT")
    private String templateContent; // HTML/Rich text with placeholders

    @Column(name = "placeholders", columnDefinition = "TEXT")
    private String placeholders; // JSON array of available placeholders

    @Column(name = "file_name_pattern", length = 200)
    private String fileNamePattern;

    @Column(name = "is_system_template")
    private Boolean isSystemTemplate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "requires_approval")
    private Boolean requiresApproval;

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

    public enum TemplateCategory {
        OFFER_LETTER,
        APPOINTMENT_LETTER,
        EXPERIENCE_CERTIFICATE,
        RELIEVING_LETTER,
        INCREMENT_LETTER,
        WARNING_LETTER,
        TERMINATION_LETTER,
        POLICY_DOCUMENT,
        FORM,
        CUSTOM
    }
}
