package com.hrms.api.customfield.controller;

import com.hrms.api.customfield.dto.*;
import com.hrms.application.customfield.service.CustomFieldService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for managing custom field definitions and values.
 */
@RestController
@RequestMapping("/api/v1/custom-fields")
@RequiredArgsConstructor
public class CustomFieldController {

    private final CustomFieldService customFieldService;

    // ============================================
    // Field Definition Endpoints
    // ============================================

    /**
     * Create a new custom field definition.
     */
    @PostMapping("/definitions")
    @RequiresPermission(Permission.CUSTOM_FIELD_CREATE)
    public ResponseEntity<CustomFieldDefinitionResponse> createFieldDefinition(
            @Valid @RequestBody CustomFieldDefinitionRequest request) {
        CustomFieldDefinitionResponse response = customFieldService.createFieldDefinition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update an existing custom field definition.
     */
    @PutMapping("/definitions/{id}")
    @RequiresPermission(Permission.CUSTOM_FIELD_UPDATE)
    public ResponseEntity<CustomFieldDefinitionResponse> updateFieldDefinition(
            @PathVariable UUID id,
            @Valid @RequestBody CustomFieldDefinitionRequest request) {
        CustomFieldDefinitionResponse response = customFieldService.updateFieldDefinition(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a custom field definition by ID.
     */
    @GetMapping("/definitions/{id}")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<CustomFieldDefinitionResponse> getFieldDefinition(@PathVariable UUID id) {
        CustomFieldDefinitionResponse response = customFieldService.getFieldDefinition(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a custom field definition by field code.
     */
    @GetMapping("/definitions/code/{fieldCode}")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<CustomFieldDefinitionResponse> getFieldDefinitionByCode(
            @PathVariable String fieldCode) {
        CustomFieldDefinitionResponse response = customFieldService.getFieldDefinitionByCode(fieldCode);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all custom field definitions with pagination.
     */
    @GetMapping("/definitions")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<Page<CustomFieldDefinitionResponse>> getAllFieldDefinitions(Pageable pageable) {
        Page<CustomFieldDefinitionResponse> response = customFieldService.getAllFieldDefinitions(pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get custom field definitions for a specific entity type.
     */
    @GetMapping("/definitions/entity-type/{entityType}")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<List<CustomFieldDefinitionResponse>> getFieldDefinitionsByEntityType(
            @PathVariable EntityType entityType,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        List<CustomFieldDefinitionResponse> response = customFieldService
                .getFieldDefinitionsByEntityType(entityType, activeOnly);
        return ResponseEntity.ok(response);
    }

    /**
     * Get custom field definitions grouped by field group.
     */
    @GetMapping("/definitions/entity-type/{entityType}/grouped")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<Map<String, List<CustomFieldDefinitionResponse>>> getFieldDefinitionsGrouped(
            @PathVariable EntityType entityType) {
        Map<String, List<CustomFieldDefinitionResponse>> response = customFieldService
                .getFieldDefinitionsGrouped(entityType);
        return ResponseEntity.ok(response);
    }

    /**
     * Get custom field definitions for list view.
     */
    @GetMapping("/definitions/entity-type/{entityType}/list-view")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<List<CustomFieldDefinitionResponse>> getFieldDefinitionsForListView(
            @PathVariable EntityType entityType) {
        List<CustomFieldDefinitionResponse> response = customFieldService
                .getFieldDefinitionsForListView(entityType);
        return ResponseEntity.ok(response);
    }

    /**
     * Search custom field definitions by name or code.
     */
    @GetMapping("/definitions/search")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<Page<CustomFieldDefinitionResponse>> searchFieldDefinitions(
            @RequestParam String query,
            Pageable pageable) {
        Page<CustomFieldDefinitionResponse> response = customFieldService
                .searchFieldDefinitions(query, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all field groups for an entity type.
     */
    @GetMapping("/definitions/entity-type/{entityType}/groups")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<List<String>> getFieldGroups(@PathVariable EntityType entityType) {
        List<String> response = customFieldService.getFieldGroups(entityType);
        return ResponseEntity.ok(response);
    }

    /**
     * Deactivate a custom field definition.
     */
    @PostMapping("/definitions/{id}/deactivate")
    @RequiresPermission(Permission.CUSTOM_FIELD_UPDATE)
    public ResponseEntity<Void> deactivateFieldDefinition(@PathVariable UUID id) {
        customFieldService.deactivateFieldDefinition(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Activate a custom field definition.
     */
    @PostMapping("/definitions/{id}/activate")
    @RequiresPermission(Permission.CUSTOM_FIELD_UPDATE)
    public ResponseEntity<Void> activateFieldDefinition(@PathVariable UUID id) {
        customFieldService.activateFieldDefinition(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Delete a custom field definition.
     * This will also delete all associated values.
     */
    @DeleteMapping("/definitions/{id}")
    @RequiresPermission(Permission.CUSTOM_FIELD_DELETE)
    public ResponseEntity<Void> deleteFieldDefinition(@PathVariable UUID id) {
        customFieldService.deleteFieldDefinition(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================
    // Field Value Endpoints
    // ============================================

    /**
     * Set a single custom field value for an entity.
     */
    @PostMapping("/values/{entityType}/{entityId}")
    @RequiresPermission(Permission.CUSTOM_FIELD_UPDATE)
    public ResponseEntity<CustomFieldValueResponse> setFieldValue(
            @PathVariable EntityType entityType,
            @PathVariable UUID entityId,
            @Valid @RequestBody CustomFieldValueRequest request) {
        CustomFieldValueResponse response = customFieldService.setFieldValue(entityType, entityId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Set multiple custom field values for an entity (bulk operation).
     */
    @PostMapping("/values/bulk")
    @RequiresPermission(Permission.CUSTOM_FIELD_UPDATE)
    public ResponseEntity<List<CustomFieldValueResponse>> setFieldValues(
            @Valid @RequestBody BulkCustomFieldValueRequest request) {
        List<CustomFieldValueResponse> response = customFieldService.setFieldValues(
                request.getEntityType(),
                request.getEntityId(),
                request.getValues());
        return ResponseEntity.ok(response);
    }

    /**
     * Get all custom field values for an entity.
     */
    @GetMapping("/values/{entityType}/{entityId}")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<List<CustomFieldValueResponse>> getFieldValues(
            @PathVariable EntityType entityType,
            @PathVariable UUID entityId) {
        List<CustomFieldValueResponse> response = customFieldService.getFieldValues(entityType, entityId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get custom field values grouped by field group.
     */
    @GetMapping("/values/{entityType}/{entityId}/grouped")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<Map<String, List<CustomFieldValueResponse>>> getFieldValuesGrouped(
            @PathVariable EntityType entityType,
            @PathVariable UUID entityId) {
        Map<String, List<CustomFieldValueResponse>> response = customFieldService
                .getFieldValuesGrouped(entityType, entityId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a specific custom field value by field code.
     */
    @GetMapping("/values/{entityType}/{entityId}/field/{fieldCode}")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<CustomFieldValueResponse> getFieldValueByCode(
            @PathVariable EntityType entityType,
            @PathVariable UUID entityId,
            @PathVariable String fieldCode) {
        CustomFieldValueResponse response = customFieldService.getFieldValueByCode(entityId, fieldCode);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a custom field value for an entity.
     */
    @DeleteMapping("/values/{entityType}/{entityId}/field/{fieldDefinitionId}")
    @RequiresPermission(Permission.CUSTOM_FIELD_DELETE)
    public ResponseEntity<Void> deleteFieldValue(
            @PathVariable EntityType entityType,
            @PathVariable UUID entityId,
            @PathVariable UUID fieldDefinitionId) {
        customFieldService.deleteFieldValue(entityId, fieldDefinitionId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Delete all custom field values for an entity.
     */
    @DeleteMapping("/values/{entityType}/{entityId}")
    @RequiresPermission(Permission.CUSTOM_FIELD_DELETE)
    public ResponseEntity<Void> deleteAllFieldValues(
            @PathVariable EntityType entityType,
            @PathVariable UUID entityId) {
        customFieldService.deleteAllFieldValues(entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    // ============================================
    // Utility Endpoints
    // ============================================

    /**
     * Get all supported entity types.
     */
    @GetMapping("/entity-types")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<EntityType[]> getEntityTypes() {
        return ResponseEntity.ok(EntityType.values());
    }

    /**
     * Check if a field code is available.
     */
    @GetMapping("/definitions/check-code")
    @RequiresPermission(Permission.CUSTOM_FIELD_VIEW)
    public ResponseEntity<Boolean> isFieldCodeAvailable(
            @RequestParam String fieldCode,
            @RequestParam(required = false) UUID excludeId) {
        boolean available = customFieldService.isFieldCodeAvailable(fieldCode, excludeId);
        return ResponseEntity.ok(available);
    }
}
