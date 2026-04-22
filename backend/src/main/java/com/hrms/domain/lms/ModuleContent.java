package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "lms_module_contents", indexes = {
        @Index(name = "idx_lms_content_tenant", columnList = "tenantId"),
        @Index(name = "idx_lms_content_module", columnList = "moduleId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ModuleContent extends TenantAware {

    @Column(name = "module_id", nullable = false)
    private UUID moduleId;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 30)
    private ContentType contentType;

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    // For VIDEO content
    @Column(name = "video_url", length = 1000)
    private String videoUrl;

    @Column(name = "video_provider", length = 50)
    private String videoProvider; // YOUTUBE, VIMEO, S3, etc.

    // For DOCUMENT content
    @Column(name = "document_url", length = 1000)
    private String documentUrl;

    @Column(name = "document_type", length = 20)
    private String documentType; // PDF, PPT, DOC, etc.

    // For TEXT content
    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;

    // For EXTERNAL_LINK
    @Column(name = "external_url", length = 1000)
    private String externalUrl;

    // For SCORM content
    @Column(name = "scorm_package_url", length = 1000)
    private String scormPackageUrl;

    // For QUIZ - reference to quiz entity
    @Column(name = "quiz_id")
    private UUID quizId;

    // For ASSIGNMENT
    @Column(name = "assignment_instructions", columnDefinition = "TEXT")
    private String assignmentInstructions;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @Column(name = "completion_required")
    @Builder.Default
    private Boolean completionRequired = true; // Must complete to proceed

    // Explicit getter for service layer access
    public UUID getModuleId() {
        return moduleId;
    }

    public enum ContentType {
        VIDEO,
        DOCUMENT,
        TEXT,
        QUIZ,
        ASSIGNMENT,
        SCORM,
        EXTERNAL_LINK,
        LIVE_SESSION
    }
}
