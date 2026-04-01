package com.hrms.api.customfield.dto;

import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
import com.hrms.domain.customfield.CustomFieldValue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for custom field values.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomFieldValueResponse {

    private UUID id;
    private UUID fieldDefinitionId;
    private String fieldCode;
    private String fieldName;
    private FieldType fieldType;
    private String fieldGroup;
    private EntityType entityType;
    private UUID entityId;

    /**
     * The value as string for display
     */
    private String value;

    /**
     * The raw value (type depends on field type)
     */
    private Object rawValue;

    /**
     * For FILE fields
     */
    private String fileValue;
    private String fileName;
    private Long fileSize;
    private String fileMimeType;

    /**
     * For CURRENCY fields
     */
    private String currencyCode;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to response DTO
     */
    public static CustomFieldValueResponse fromEntity(CustomFieldValue entity) {
        if (entity == null) {
            return null;
        }

        CustomFieldValueResponseBuilder builder = CustomFieldValueResponse.builder()
                .id(entity.getId())
                .fieldDefinitionId(entity.getFieldDefinition().getId())
                .fieldCode(entity.getFieldDefinition().getFieldCode())
                .fieldName(entity.getFieldDefinition().getFieldName())
                .fieldType(entity.getFieldDefinition().getFieldType())
                .fieldGroup(entity.getFieldDefinition().getFieldGroup())
                .entityType(entity.getEntityType())
                .entityId(entity.getEntityId())
                .value(entity.getDisplayValue())
                .rawValue(entity.getValue())
                .fileValue(entity.getFileValue())
                .fileName(entity.getFileName())
                .fileSize(entity.getFileSize())
                .fileMimeType(entity.getFileMimeType())
                .currencyCode(entity.getCurrencyCode())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt());

        return builder.build();
    }
}
