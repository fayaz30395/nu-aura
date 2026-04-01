package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.KnowledgeAttachment;
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
public class FluenceAttachmentDto {

    private UUID id;
    private String fileName;
    private Long fileSize;
    private String contentType;
    private String downloadUrl;
    private LocalDateTime createdAt;
    private UUID createdBy;

    public static FluenceAttachmentDto fromEntity(KnowledgeAttachment entity) {
        return FluenceAttachmentDto.builder()
                .id(entity.getId())
                .fileName(entity.getFileName())
                .fileSize(entity.getFileSize())
                .contentType(entity.getMimeType())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }

    public static FluenceAttachmentDto fromEntity(KnowledgeAttachment entity, String downloadUrl) {
        FluenceAttachmentDto dto = fromEntity(entity);
        dto.setDownloadUrl(downloadUrl);
        return dto;
    }
}
