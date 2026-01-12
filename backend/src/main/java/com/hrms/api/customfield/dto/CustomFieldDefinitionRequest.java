package com.hrms.api.customfield.dto;

import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for creating/updating custom field definitions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomFieldDefinitionRequest {

    @NotBlank(message = "Field code is required")
    @Size(max = 100, message = "Field code must be at most 100 characters")
    private String fieldCode;

    @NotBlank(message = "Field name is required")
    @Size(max = 200, message = "Field name must be at most 200 characters")
    private String fieldName;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @NotNull(message = "Entity type is required")
    private EntityType entityType;

    @NotNull(message = "Field type is required")
    private FieldType fieldType;

    @Size(max = 100, message = "Field group must be at most 100 characters")
    private String fieldGroup;

    private Integer displayOrder;

    private Boolean isRequired;

    private Boolean isSearchable;

    private Boolean showInList;

    private String defaultValue;

    @Size(max = 200, message = "Placeholder must be at most 200 characters")
    private String placeholder;

    /**
     * Options for DROPDOWN/MULTI_SELECT fields
     */
    private List<String> options;

    /**
     * Validation rules
     */
    private ValidationRules validationRules;

    private FieldVisibility viewVisibility;

    private FieldVisibility editVisibility;

    /**
     * For FILE fields: allowed extensions
     */
    private List<String> allowedFileTypes;

    /**
     * For FILE fields: max size in bytes
     */
    private Long maxFileSize;

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
