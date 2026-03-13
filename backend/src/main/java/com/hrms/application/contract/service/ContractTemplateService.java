package com.hrms.application.contract.service;

import com.hrms.api.contract.dto.ContractTemplateDto;
import com.hrms.api.contract.dto.CreateContractTemplateRequest;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.contract.ContractTemplate;
import com.hrms.domain.contract.ContractType;
import com.hrms.infrastructure.contract.repository.ContractTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing contract templates
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContractTemplateService {

    private final ContractTemplateRepository templateRepository;

    /**
     * Create a new template
     */
    public ContractTemplateDto createTemplate(CreateContractTemplateRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        ContractTemplate template = ContractTemplate.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .type(request.getType())
                .content(request.getContent())
                .isActive(true)
                .createdBy(userId)
                .build();

        template = templateRepository.save(template);
        log.info("Template created: {} ({})", template.getId(), template.getName());
        return toDto(template);
    }

    /**
     * Get template by ID
     */
    public ContractTemplateDto getTemplateById(UUID templateId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ContractTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        return toDto(template);
    }

    /**
     * Get all templates
     */
    public Page<ContractTemplateDto> getAllTemplates(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return templateRepository.findByTenantId(tenantId, pageable)
                .map(this::toDto);
    }

    /**
     * Get active templates
     */
    public Page<ContractTemplateDto> getActiveTemplates(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return templateRepository.findByTenantIdAndIsActive(tenantId, true, pageable)
                .map(this::toDto);
    }

    /**
     * Get templates by type
     */
    public List<ContractTemplateDto> getTemplatesByType(ContractType type) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return templateRepository.findByTenantIdAndType(tenantId, type)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Search templates
     */
    public Page<ContractTemplateDto> searchTemplates(String search, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return templateRepository.searchActiveTemplates(tenantId, search, pageable)
                .map(this::toDto);
    }

    /**
     * Update template
     */
    public ContractTemplateDto updateTemplate(UUID templateId, CreateContractTemplateRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ContractTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        template.setName(request.getName());
        template.setType(request.getType());
        template.setContent(request.getContent());
        template = templateRepository.save(template);
        log.info("Template updated: {}", templateId);
        return toDto(template);
    }

    /**
     * Delete template
     */
    public void deleteTemplate(UUID templateId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ContractTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        templateRepository.delete(template);
        log.info("Template deleted: {}", templateId);
    }

    /**
     * Toggle template active status
     */
    public ContractTemplateDto toggleActive(UUID templateId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ContractTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        template.setIsActive(!template.getIsActive());
        template = templateRepository.save(template);
        return toDto(template);
    }

    private ContractTemplateDto toDto(ContractTemplate template) {
        return ContractTemplateDto.builder()
                .id(template.getId())
                .name(template.getName())
                .type(template.getType())
                .content(template.getContent())
                .isActive(template.getIsActive())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
