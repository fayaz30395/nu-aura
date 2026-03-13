package com.hrms.api.contract.controller;

import com.hrms.api.contract.dto.ContractTemplateDto;
import com.hrms.api.contract.dto.CreateContractTemplateRequest;
import com.hrms.application.contract.service.ContractTemplateService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.contract.ContractType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for contract template management
 */
@RestController
@RequestMapping("/api/v1/contracts/templates")
@RequiredArgsConstructor
public class ContractTemplateController {

    private final ContractTemplateService templateService;

    @PostMapping
    @RequiresPermission(Permission.CONTRACT_TEMPLATE_MANAGE)
    public ResponseEntity<ContractTemplateDto> createTemplate(@Valid @RequestBody CreateContractTemplateRequest request) {
        ContractTemplateDto template = templateService.createTemplate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(template);
    }

    @GetMapping("/{templateId}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<ContractTemplateDto> getTemplate(@PathVariable UUID templateId) {
        ContractTemplateDto template = templateService.getTemplateById(templateId);
        return ResponseEntity.ok(template);
    }

    @GetMapping
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractTemplateDto>> getAllTemplates(Pageable pageable) {
        Page<ContractTemplateDto> templates = templateService.getAllTemplates(pageable);
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractTemplateDto>> getActiveTemplates(Pageable pageable) {
        Page<ContractTemplateDto> templates = templateService.getActiveTemplates(pageable);
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/type/{type}")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<List<ContractTemplateDto>> getByType(@PathVariable ContractType type) {
        List<ContractTemplateDto> templates = templateService.getTemplatesByType(type);
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/search")
    @RequiresPermission(Permission.CONTRACT_VIEW)
    public ResponseEntity<Page<ContractTemplateDto>> searchTemplates(
            @RequestParam String search,
            Pageable pageable) {
        Page<ContractTemplateDto> templates = templateService.searchTemplates(search, pageable);
        return ResponseEntity.ok(templates);
    }

    @PutMapping("/{templateId}")
    @RequiresPermission(Permission.CONTRACT_TEMPLATE_MANAGE)
    public ResponseEntity<ContractTemplateDto> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody CreateContractTemplateRequest request) {
        ContractTemplateDto template = templateService.updateTemplate(templateId, request);
        return ResponseEntity.ok(template);
    }

    @DeleteMapping("/{templateId}")
    @RequiresPermission(Permission.CONTRACT_TEMPLATE_MANAGE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID templateId) {
        templateService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{templateId}/toggle-active")
    @RequiresPermission(Permission.CONTRACT_TEMPLATE_MANAGE)
    public ResponseEntity<ContractTemplateDto> toggleActive(@PathVariable UUID templateId) {
        ContractTemplateDto template = templateService.toggleActive(templateId);
        return ResponseEntity.ok(template);
    }
}
