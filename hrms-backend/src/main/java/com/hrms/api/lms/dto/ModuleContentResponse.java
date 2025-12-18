package com.hrms.api.lms.dto;

import com.hrms.domain.lms.ModuleContent;
import com.hrms.domain.lms.ModuleContent.ContentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModuleContentResponse {

    private UUID id;
    private UUID tenantId;
    private UUID moduleId;
    private String title;
    private ContentType contentType;
    private Integer orderIndex;
    private Integer durationMinutes;
    private String videoUrl;
    private String videoProvider;
    private String documentUrl;
    private String documentType;
    private String textContent;
    private String externalUrl;
    private UUID quizId;
    private String assignmentInstructions;
    private Boolean isMandatory;
    private Boolean completionRequired;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ModuleContentResponse fromEntity(ModuleContent content) {
        return ModuleContentResponse.builder()
                .id(content.getId())
                .tenantId(content.getTenantId())
                .moduleId(content.getModuleId())
                .title(content.getTitle())
                .contentType(content.getContentType())
                .orderIndex(content.getOrderIndex())
                .durationMinutes(content.getDurationMinutes())
                .videoUrl(content.getVideoUrl())
                .videoProvider(content.getVideoProvider())
                .documentUrl(content.getDocumentUrl())
                .documentType(content.getDocumentType())
                .textContent(content.getTextContent())
                .externalUrl(content.getExternalUrl())
                .quizId(content.getQuizId())
                .assignmentInstructions(content.getAssignmentInstructions())
                .isMandatory(content.getIsMandatory())
                .completionRequired(content.getCompletionRequired())
                .createdAt(content.getCreatedAt())
                .updatedAt(content.getUpdatedAt())
                .build();
    }
}
