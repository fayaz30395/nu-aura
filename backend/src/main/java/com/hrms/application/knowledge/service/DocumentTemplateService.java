package com.hrms.application.knowledge.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.DocumentTemplate;
import com.hrms.infrastructure.knowledge.repository.DocumentTemplateRepository;
import com.hrms.infrastructure.knowledge.repository.TemplateInstantiationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class DocumentTemplateService {

    private final DocumentTemplateRepository documentTemplateRepository;
    private final TemplateInstantiationRepository templateInstantiationRepository;

    public DocumentTemplate createTemplate(DocumentTemplate template) {
        UUID tenantId = TenantContext.getCurrentTenant();
        template.setTenantId(tenantId);
        template.setIsActive(true);
        template.setIsFeatured(false);
        template.setUsageCount(0);

        DocumentTemplate saved = documentTemplateRepository.save(template);
        log.info("Created document template: {}", saved.getId());
        return saved;
    }

    public DocumentTemplate updateTemplate(UUID templateId, DocumentTemplate templateData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DocumentTemplate template = documentTemplateRepository.findById(templateId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        template.setName(templateData.getName());
        template.setSlug(templateData.getSlug());
        template.setDescription(templateData.getDescription());
        template.setCategory(templateData.getCategory());
        template.setContent(templateData.getContent());
        template.setTemplateVariables(templateData.getTemplateVariables());
        template.setSampleData(templateData.getSampleData());
        template.setThumbnailUrl(templateData.getThumbnailUrl());
        template.setTags(templateData.getTags());

        DocumentTemplate updated = documentTemplateRepository.save(template);
        log.info("Updated document template: {}", templateId);
        return updated;
    }

    @Transactional(readOnly = true)
    public DocumentTemplate getTemplateById(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentTemplateRepository.findById(templateId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));
    }

    @Transactional(readOnly = true)
    public DocumentTemplate getTemplateBySlug(String slug) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentTemplateRepository.findByTenantIdAndSlug(tenantId, slug)
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));
    }

    @Transactional(readOnly = true)
    public Page<DocumentTemplate> getAllActiveTemplates(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentTemplateRepository.findByTenantIdAndIsActiveTrue(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<DocumentTemplate> getTemplatesByCategory(String category, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentTemplateRepository.findByTenantIdAndCategory(tenantId, category, pageable);
    }

    @Transactional(readOnly = true)
    public List<DocumentTemplate> getFeaturedTemplates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentTemplateRepository.findFeaturedTemplatesByTenant(tenantId);
    }

    @Transactional(readOnly = true)
    public List<DocumentTemplate> getPopularTemplates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentTemplateRepository.findPopularTemplatesByTenant(tenantId);
    }

    public DocumentTemplate toggleActive(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DocumentTemplate template = documentTemplateRepository.findById(templateId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        template.setIsActive(!template.getIsActive());
        DocumentTemplate updated = documentTemplateRepository.save(template);
        log.info("Toggled active status for template: {}", templateId);
        return updated;
    }

    public DocumentTemplate toggleFeatured(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DocumentTemplate template = documentTemplateRepository.findById(templateId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        template.setIsFeatured(!template.getIsFeatured());
        DocumentTemplate updated = documentTemplateRepository.save(template);
        log.info("Toggled featured status for template: {}", templateId);
        return updated;
    }

    public DocumentTemplate incrementUsageCount(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DocumentTemplate template = documentTemplateRepository.findById(templateId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        template.setUsageCount(template.getUsageCount() + 1);
        return documentTemplateRepository.save(template);
    }

    public void deleteTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DocumentTemplate template = documentTemplateRepository.findById(templateId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        documentTemplateRepository.delete(template);
        log.info("Deleted document template: {}", templateId);
    }

    @Transactional(readOnly = true)
    public long getInstantiationCount(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateInstantiationRepository.countByTenantIdAndTemplateId(tenantId, templateId);
    }
}
