package com.hrms.api.customfield.dto;

import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Request DTO for setting multiple custom field values at once.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCustomFieldValueRequest {

    @NotNull(message = "Entity type is required")
    private EntityType entityType;

    @NotNull(message = "Entity ID is required")
    private UUID entityId;

    @NotEmpty(message = "At least one field value is required")
    @Valid
    private List<CustomFieldValueRequest> values;
}
