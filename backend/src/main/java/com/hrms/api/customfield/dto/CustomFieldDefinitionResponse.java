package com.hrms.api.customfield.dto;

import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldVisibility;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for custom field definitions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomFieldDefinitionResponse {

    private UUID id;
    private String fieldCode;
    private String fieldName;
    private String description;
    private EntityType entityType;
    private FieldType fieldType;
    private String fieldGroup;
    private Integer displayOrder;
    private Boolean isRequired;
    private Boolean isActive;
    private Boolean isSearchable;
    private Boolean showInList;
    private String defaultValue;
    private String placeholder;
    private List<String> options;
    private ValidationRules validationRules;
    private FieldVisibility viewVisibility;
    private FieldVisibility editVisibility;
    private List<String> allowedFileTypes;
    private Long maxFileSize;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to response DTO
     */
    public static CustomFieldDefinitionResponse fromEntity(CustomFieldDefinition entity) {
        if (entity == null) {
            return null;
        }

        CustomFieldDefinitionResponseBuilder builder = CustomFieldDefinitionResponse.builder()
                .id(entity.getId())
                .fieldCode(entity.getFieldCode())
                .fieldName(entity.getFieldName())
                .description(entity.getDescription())
                .entityType(entity.getEntityType())
                .fieldType(entity.getFieldType())
                .fieldGroup(entity.getFieldGroup())
                .displayOrder(entity.getDisplayOrder())
                .isRequired(entity.getIsRequired())
                .isActive(entity.getIsActive())
                .isSearchable(entity.getIsSearchable())
                .showInList(entity.getShowInList())
                .defaultValue(entity.getDefaultValue())
                .placeholder(entity.getPlaceholder())
                .options(entity.getOptionsList())
                .viewVisibility(entity.getViewVisibility())
                .editVisibility(entity.getEditVisibility())
                .maxFileSize(entity.getMaxFileSize())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt());

        // Build validation rules
        if (entity.getMinValue() != null || entity.getMaxValue() != null ||
                entity.getMinLength() != null || entity.getMaxLength() != null) {
            builder.validationRules(ValidationRules.builder()
                    .minValue(entity.getMinValue())
                    .maxValue(entity.getMaxValue())
                    .minLength(entity.getMinLength())
                    .maxLength(entity.getMaxLength())
                    .build());
        }

        // Parse allowed file types
        if (entity.getAllowedFileTypes() != null && !entity.getAllowedFileTypes().isBlank()) {
            builder.allowedFileTypes(List.of(entity.getAllowedFileTypes().split(",")));
        }

        return builder.build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationRules {
        private Double minValue;
        private Double maxValue;
        private Integer minLength;
        private Integer maxLength;
        private String pattern;
        private String patternMessage;
    }
}
