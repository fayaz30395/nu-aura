package com.hrms.application.customfield.service;

import com.hrms.api.customfield.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
import com.hrms.domain.customfield.CustomFieldValue;
import com.hrms.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import com.hrms.infrastructure.customfield.repository.CustomFieldValueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing custom field definitions and values.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomFieldService {

    private final CustomFieldDefinitionRepository definitionRepository;
    private final CustomFieldValueRepository valueRepository;

    // ==================== Field Definition Operations ====================

    /**
     * Create a new custom field definition.
     */
    @Transactional
    public CustomFieldDefinitionResponse createFieldDefinition(CustomFieldDefinitionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating custom field definition: {} for tenant: {}", request.getFieldCode(), tenantId);

        // Check for duplicate field code
        if (definitionRepository.existsByFieldCodeAndTenantId(request.getFieldCode(), tenantId)) {
            throw new IllegalArgumentException("Field code already exists: " + request.getFieldCode());
        }

        // Auto-generate display order if not provided
        Integer displayOrder = request.getDisplayOrder();
        if (displayOrder == null) {
            displayOrder = definitionRepository.findMaxDisplayOrderByGroup(
                    tenantId, request.getEntityType(), request.getFieldGroup()) + 1;
        }

        CustomFieldDefinition definition = CustomFieldDefinition.builder()
                .fieldCode(request.getFieldCode())
                .fieldName(request.getFieldName())
                .description(request.getDescription())
                .entityType(request.getEntityType())
                .fieldType(request.getFieldType())
                .fieldGroup(request.getFieldGroup())
                .displayOrder(displayOrder)
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : false)
                .isActive(true)
                .isSearchable(request.getIsSearchable() != null ? request.getIsSearchable() : false)
                .showInList(request.getShowInList() != null ? request.getShowInList() : false)
                .defaultValue(request.getDefaultValue())
                .placeholder(request.getPlaceholder())
                .options(request.getOptions() != null ? String.join(",", request.getOptions()) : null)
                .viewVisibility(request.getViewVisibility() != null ? request.getViewVisibility() : CustomFieldDefinition.FieldVisibility.ALL)
                .editVisibility(request.getEditVisibility() != null ? request.getEditVisibility() : CustomFieldDefinition.FieldVisibility.ADMIN_HR)
                .build();

        // Set validation rules
        if (request.getValidationRules() != null) {
            definition.setMinValue(request.getValidationRules().getMinValue());
            definition.setMaxValue(request.getValidationRules().getMaxValue());
            definition.setMinLength(request.getValidationRules().getMinLength());
            definition.setMaxLength(request.getValidationRules().getMaxLength());
        }

        // Set file constraints
        if (request.getAllowedFileTypes() != null && !request.getAllowedFileTypes().isEmpty()) {
            definition.setAllowedFileTypes(String.join(",", request.getAllowedFileTypes()));
        }
        definition.setMaxFileSize(request.getMaxFileSize());

        definition.setTenantId(tenantId);
        definition = definitionRepository.save(definition);

        log.info("Created custom field definition with ID: {}", definition.getId());
        return CustomFieldDefinitionResponse.fromEntity(definition);
    }

    /**
     * Update an existing custom field definition.
     */
    @Transactional
    public CustomFieldDefinitionResponse updateFieldDefinition(UUID id, CustomFieldDefinitionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating custom field definition: {} for tenant: {}", id, tenantId);

        CustomFieldDefinition definition = definitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found: " + id));

        // Check for duplicate field code (excluding current)
        if (definitionRepository.existsByFieldCodeAndTenantIdAndIdNot(request.getFieldCode(), tenantId, id)) {
            throw new IllegalArgumentException("Field code already exists: " + request.getFieldCode());
        }

        // Update fields
        definition.setFieldCode(request.getFieldCode());
        definition.setFieldName(request.getFieldName());
        definition.setDescription(request.getDescription());
        definition.setFieldGroup(request.getFieldGroup());
        if (request.getDisplayOrder() != null) {
            definition.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getIsRequired() != null) {
            definition.setIsRequired(request.getIsRequired());
        }
        if (request.getIsSearchable() != null) {
            definition.setIsSearchable(request.getIsSearchable());
        }
        if (request.getShowInList() != null) {
            definition.setShowInList(request.getShowInList());
        }
        definition.setDefaultValue(request.getDefaultValue());
        definition.setPlaceholder(request.getPlaceholder());

        if (request.getOptions() != null) {
            definition.setOptions(String.join(",", request.getOptions()));
        }

        if (request.getViewVisibility() != null) {
            definition.setViewVisibility(request.getViewVisibility());
        }
        if (request.getEditVisibility() != null) {
            definition.setEditVisibility(request.getEditVisibility());
        }

        // Update validation rules
        if (request.getValidationRules() != null) {
            definition.setMinValue(request.getValidationRules().getMinValue());
            definition.setMaxValue(request.getValidationRules().getMaxValue());
            definition.setMinLength(request.getValidationRules().getMinLength());
            definition.setMaxLength(request.getValidationRules().getMaxLength());
        }

        // Update file constraints
        if (request.getAllowedFileTypes() != null) {
            definition.setAllowedFileTypes(String.join(",", request.getAllowedFileTypes()));
        }
        if (request.getMaxFileSize() != null) {
            definition.setMaxFileSize(request.getMaxFileSize());
        }

        definition = definitionRepository.save(definition);
        log.info("Updated custom field definition: {}", id);
        return CustomFieldDefinitionResponse.fromEntity(definition);
    }

    /**
     * Get a field definition by ID.
     */
    @Transactional(readOnly = true)
    public CustomFieldDefinitionResponse getFieldDefinition(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CustomFieldDefinition definition = definitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found: " + id));
        return CustomFieldDefinitionResponse.fromEntity(definition);
    }

    /**
     * Get all field definitions for a tenant with pagination.
     */
    @Transactional(readOnly = true)
    public Page<CustomFieldDefinitionResponse> getAllFieldDefinitions(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return definitionRepository.findByTenantId(tenantId, pageable)
                .map(CustomFieldDefinitionResponse::fromEntity);
    }

    /**
     * Get a field definition by field code.
     */
    @Transactional(readOnly = true)
    public CustomFieldDefinitionResponse getFieldDefinitionByCode(String fieldCode) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CustomFieldDefinition definition = definitionRepository.findByFieldCodeAndTenantId(fieldCode, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found: " + fieldCode));
        return CustomFieldDefinitionResponse.fromEntity(definition);
    }

    /**
     * Get field definitions for a specific entity type.
     */
    @Transactional(readOnly = true)
    public List<CustomFieldDefinitionResponse> getFieldDefinitionsByEntityType(EntityType entityType, boolean activeOnly) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<CustomFieldDefinition> definitions;
        if (activeOnly) {
            definitions = definitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(entityType, tenantId);
        } else {
            definitions = definitionRepository.findByEntityTypeAndTenantIdOrderByDisplayOrderAsc(entityType, tenantId);
        }
        return definitions.stream()
                .map(CustomFieldDefinitionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get field definitions that should show in list view.
     */
    @Transactional(readOnly = true)
    public List<CustomFieldDefinitionResponse> getFieldDefinitionsForListView(EntityType entityType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return definitionRepository.findByEntityTypeAndTenantIdAndShowInListTrueAndIsActiveTrueOrderByDisplayOrderAsc(entityType, tenantId)
                .stream()
                .map(CustomFieldDefinitionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get field definitions grouped by field group.
     */
    @Transactional(readOnly = true)
    public Map<String, List<CustomFieldDefinitionResponse>> getFieldDefinitionsGrouped(EntityType entityType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<CustomFieldDefinition> definitions = definitionRepository
                .findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(entityType, tenantId);

        return definitions.stream()
                .map(CustomFieldDefinitionResponse::fromEntity)
                .collect(Collectors.groupingBy(
                        d -> d.getFieldGroup() != null ? d.getFieldGroup() : "Other",
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    /**
     * Search field definitions.
     */
    @Transactional(readOnly = true)
    public Page<CustomFieldDefinitionResponse> searchFieldDefinitions(String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return definitionRepository.searchByNameOrCode(tenantId, search, pageable)
                .map(CustomFieldDefinitionResponse::fromEntity);
    }

    /**
     * Get distinct field groups.
     */
    @Transactional(readOnly = true)
    public List<String> getFieldGroups(EntityType entityType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (entityType != null) {
            return definitionRepository.findDistinctFieldGroupsByEntityType(tenantId, entityType);
        }
        return definitionRepository.findDistinctFieldGroupsByTenantId(tenantId);
    }

    /**
     * Deactivate a field definition (soft delete).
     */
    @Transactional
    public void deactivateFieldDefinition(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Deactivating custom field definition: {} for tenant: {}", id, tenantId);

        CustomFieldDefinition definition = definitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found: " + id));

        definition.setIsActive(false);
        definitionRepository.save(definition);
        log.info("Deactivated custom field definition: {}", id);
    }

    /**
     * Activate a field definition.
     */
    @Transactional
    public void activateFieldDefinition(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Activating custom field definition: {} for tenant: {}", id, tenantId);

        CustomFieldDefinition definition = definitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found: " + id));

        definition.setIsActive(true);
        definitionRepository.save(definition);
        log.info("Activated custom field definition: {}", id);
    }

    /**
     * Delete a field definition and all its values.
     */
    @Transactional
    public void deleteFieldDefinition(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Deleting custom field definition: {} for tenant: {}", id, tenantId);

        CustomFieldDefinition definition = definitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found: " + id));

        // Delete all values for this field
        valueRepository.deleteByFieldDefinitionId(id);

        // Delete the definition
        definitionRepository.delete(definition);
        log.info("Deleted custom field definition and values: {}", id);
    }

    // ==================== Field Value Operations ====================

    /**
     * Set a custom field value for an entity.
     */
    @Transactional
    public CustomFieldValueResponse setFieldValue(EntityType entityType, UUID entityId, CustomFieldValueRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.debug("Setting custom field value for entity: {} ({})", entityId, entityType);

        CustomFieldDefinition definition = definitionRepository.findByIdAndTenantId(request.getFieldDefinitionId(), tenantId)
                .filter(CustomFieldDefinition::getIsActive)
                .orElseThrow(() -> new IllegalArgumentException("Field definition not found or inactive"));

        // Validate entity type matches
        if (definition.getEntityType() != entityType) {
            throw new IllegalArgumentException("Field definition entity type mismatch");
        }

        // Validate the value
        validateFieldValue(definition, request);

        // Find or create value
        CustomFieldValue value = valueRepository.findByFieldDefinitionIdAndEntityId(definition.getId(), entityId)
                .orElseGet(() -> {
                    CustomFieldValue newValue = new CustomFieldValue();
                    newValue.setFieldDefinition(definition);
                    newValue.setEntityType(entityType);
                    newValue.setEntityId(entityId);
                    newValue.setTenantId(tenantId);
                    return newValue;
                });

        // Set the value based on field type
        setValueFromRequest(value, definition, request);

        value = valueRepository.save(value);
        return CustomFieldValueResponse.fromEntity(value);
    }

    /**
     * Set multiple field values for an entity at once.
     */
    @Transactional
    public List<CustomFieldValueResponse> setFieldValues(EntityType entityType, UUID entityId, List<CustomFieldValueRequest> requests) {
        List<CustomFieldValueResponse> responses = new ArrayList<>();
        for (CustomFieldValueRequest valueRequest : requests) {
            try {
                CustomFieldValueResponse response = setFieldValue(entityType, entityId, valueRequest);
                responses.add(response);
            } catch (Exception e) { // Intentional broad catch — per-field validation error boundary
                log.warn("Failed to set field value for definition {}: {}",
                        valueRequest.getFieldDefinitionId(), e.getMessage());
            }
        }
        return responses;
    }

    /**
     * Get all custom field values for an entity.
     */
    @Transactional(readOnly = true)
    public List<CustomFieldValueResponse> getFieldValues(EntityType entityType, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return valueRepository.findByEntityTypeAndEntityIdAndTenantId(entityType, entityId, tenantId)
                .stream()
                .map(CustomFieldValueResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific field value.
     */
    @Transactional(readOnly = true)
    public CustomFieldValueResponse getFieldValue(UUID fieldDefinitionId, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return valueRepository.findByFieldDefinitionIdAndEntityId(fieldDefinitionId, entityId)
                .filter(v -> v.getTenantId().equals(tenantId))
                .map(CustomFieldValueResponse::fromEntity)
                .orElse(null);
    }

    /**
     * Get field value by field code.
     */
    @Transactional(readOnly = true)
    public CustomFieldValueResponse getFieldValueByCode(UUID entityId, String fieldCode) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return valueRepository.findByFieldCodeAndEntityId(fieldCode, entityId, tenantId)
                .map(CustomFieldValueResponse::fromEntity)
                .orElse(null);
    }

    /**
     * Get field values grouped by field group.
     */
    @Transactional(readOnly = true)
    public Map<String, List<CustomFieldValueResponse>> getFieldValuesGrouped(EntityType entityType, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<CustomFieldValue> values = valueRepository.findByEntityTypeAndEntityIdAndTenantId(entityType, entityId, tenantId);

        return values.stream()
                .map(CustomFieldValueResponse::fromEntity)
                .collect(Collectors.groupingBy(
                        v -> v.getFieldGroup() != null ? v.getFieldGroup() : "Other",
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    /**
     * Delete a field value.
     */
    @Transactional
    public void deleteFieldValue(UUID entityId, UUID fieldDefinitionId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.debug("Deleting field value for definition: {} entity: {}", fieldDefinitionId, entityId);

        valueRepository.findByFieldDefinitionIdAndEntityId(fieldDefinitionId, entityId)
                .filter(v -> v.getTenantId().equals(tenantId))
                .ifPresent(valueRepository::delete);
    }

    /**
     * Delete all field values for an entity.
     */
    @Transactional
    public void deleteAllFieldValues(EntityType entityType, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.debug("Deleting all field values for entity: {} ({})", entityId, entityType);
        valueRepository.deleteByEntityTypeAndEntityIdAndTenantId(entityType, entityId, tenantId);
    }

    /**
     * Check if a field code is available.
     */
    @Transactional(readOnly = true)
    public boolean isFieldCodeAvailable(String fieldCode, UUID excludeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (excludeId != null) {
            return !definitionRepository.existsByFieldCodeAndTenantIdAndIdNot(fieldCode, tenantId, excludeId);
        }
        return !definitionRepository.existsByFieldCodeAndTenantId(fieldCode, tenantId);
    }

    // ==================== Validation ====================

    /**
     * Validate a field value against its definition.
     */
    private void validateFieldValue(CustomFieldDefinition definition, CustomFieldValueRequest request) {
        String value = request.getValue();
        FieldType fieldType = definition.getFieldType();

        // Required validation
        if (definition.getIsRequired() && (value == null || value.isBlank())) {
            if (fieldType != FieldType.FILE || request.getFileValue() == null) {
                throw new IllegalArgumentException("Field '" + definition.getFieldName() + "' is required");
            }
        }

        if (value == null || value.isBlank()) {
            return; // No further validation needed for empty optional fields
        }

        // Type-specific validation
        switch (fieldType) {
            case NUMBER, CURRENCY, PERCENTAGE -> {
                try {
                    BigDecimal numValue = new BigDecimal(value);
                    if (definition.getMinValue() != null && numValue.doubleValue() < definition.getMinValue()) {
                        throw new IllegalArgumentException("Value must be at least " + definition.getMinValue());
                    }
                    if (definition.getMaxValue() != null && numValue.doubleValue() > definition.getMaxValue()) {
                        throw new IllegalArgumentException("Value must be at most " + definition.getMaxValue());
                    }
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Invalid number format");
                }
            }
            case TEXT, TEXTAREA -> {
                if (definition.getMinLength() != null && value.length() < definition.getMinLength()) {
                    throw new IllegalArgumentException("Minimum length is " + definition.getMinLength());
                }
                if (definition.getMaxLength() != null && value.length() > definition.getMaxLength()) {
                    throw new IllegalArgumentException("Maximum length is " + definition.getMaxLength());
                }
            }
            case EMAIL -> {
                if (!value.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
                    throw new IllegalArgumentException("Invalid email format");
                }
            }
            case DATE -> {
                try {
                    LocalDate.parse(value);
                } catch (Exception e) { // Intentional broad catch — per-field validation error boundary
                    throw new IllegalArgumentException("Invalid date format (expected yyyy-MM-dd)");
                }
            }
            case DATETIME -> {
                try {
                    LocalDateTime.parse(value);
                } catch (Exception e) { // Intentional broad catch — per-field validation error boundary
                    throw new IllegalArgumentException("Invalid datetime format");
                }
            }
            case DROPDOWN -> {
                List<String> options = definition.getOptionsList();
                if (!options.isEmpty() && !options.contains(value)) {
                    throw new IllegalArgumentException("Invalid option: " + value);
                }
            }
            case MULTI_SELECT -> {
                List<String> options = definition.getOptionsList();
                if (!options.isEmpty()) {
                    String[] selected = value.split(",");
                    for (String sel : selected) {
                        if (!options.contains(sel.trim())) {
                            throw new IllegalArgumentException("Invalid option: " + sel);
                        }
                    }
                }
            }
            default -> {
                // No specific validation for other types
            }
        }
    }

    /**
     * Set value on entity from request based on field type.
     */
    private void setValueFromRequest(CustomFieldValue value, CustomFieldDefinition definition, CustomFieldValueRequest request) {
        FieldType fieldType = definition.getFieldType();
        String rawValue = request.getValue();

        switch (fieldType) {
            case TEXT, TEXTAREA, EMAIL, PHONE, URL, DROPDOWN -> value.setTextValue(rawValue);
            case NUMBER, CURRENCY, PERCENTAGE -> {
                if (rawValue != null && !rawValue.isBlank()) {
                    value.setNumberValue(new BigDecimal(rawValue));
                } else {
                    value.setNumberValue(null);
                }
                if (fieldType == FieldType.CURRENCY) {
                    value.setCurrencyCode(request.getCurrencyCode());
                }
            }
            case DATE -> {
                if (rawValue != null && !rawValue.isBlank()) {
                    value.setDateValue(LocalDate.parse(rawValue));
                } else {
                    value.setDateValue(null);
                }
            }
            case DATETIME -> {
                if (rawValue != null && !rawValue.isBlank()) {
                    value.setDateTimeValue(LocalDateTime.parse(rawValue));
                } else {
                    value.setDateTimeValue(null);
                }
            }
            case CHECKBOX -> {
                if (rawValue != null && !rawValue.isBlank()) {
                    value.setBooleanValue(Boolean.parseBoolean(rawValue));
                } else {
                    value.setBooleanValue(null);
                }
            }
            case MULTI_SELECT -> value.setMultiSelectValue(rawValue);
            case FILE -> {
                value.setFileValue(request.getFileValue());
                value.setFileName(request.getFileName());
                value.setFileSize(request.getFileSize());
                value.setFileMimeType(request.getFileMimeType());
            }
        }
    }
}
