package com.hrms.application.letter.service;

import com.hrms.api.letter.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.letter.GeneratedLetter.LetterStatus;
import com.hrms.domain.letter.LetterTemplate;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.letter.repository.GeneratedLetterRepository;
import com.hrms.infrastructure.letter.repository.LetterTemplateRepository;
import com.fasterxml.jackson.core.JsonProcessingException;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LetterService {

    private final LetterTemplateRepository templateRepository;
    private final GeneratedLetterRepository letterRepository;
    private final EmployeeRepository employeeRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    // ==================== Template Operations ====================

    public LetterTemplateResponse createTemplate(LetterTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (templateRepository.existsByCodeAndTenantId(request.getCode(), tenantId)) {
            throw new BusinessException("Template with code already exists: " + request.getCode());
        }

        LetterTemplate entity = LetterTemplate.builder()
                .name(request.getName())
                .code(request.getCode())
                .description(request.getDescription())
                .category(request.getCategory())
                .templateContent(request.getTemplateContent())
                .headerHtml(request.getHeaderHtml())
                .footerHtml(request.getFooterHtml())
                .cssStyles(request.getCssStyles())
                .includeCompanyLogo(request.getIncludeCompanyLogo())
                .includeSignature(request.getIncludeSignature())
                .signatureTitle(request.getSignatureTitle())
                .signatoryName(request.getSignatoryName())
                .signatoryDesignation(request.getSignatoryDesignation())
                .requiresApproval(request.getRequiresApproval())
                .isActive(request.getIsActive())
                .isSystemTemplate(false)
                .templateVersion(1)
                .availablePlaceholders(request.getAvailablePlaceholders())
                .build();
        entity.setTenantId(tenantId);

        LetterTemplate saved = templateRepository.save(entity);
        log.info("Letter template created: {}", saved.getId());

        return LetterTemplateResponse.fromEntity(saved);
    }

    public LetterTemplateResponse updateTemplate(UUID templateId, LetterTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate entity = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + templateId));

        if (entity.getIsSystemTemplate()) {
            throw new BusinessException("System templates cannot be modified");
        }

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setTemplateContent(request.getTemplateContent());
        entity.setHeaderHtml(request.getHeaderHtml());
        entity.setFooterHtml(request.getFooterHtml());
        entity.setCssStyles(request.getCssStyles());
        entity.setIncludeCompanyLogo(request.getIncludeCompanyLogo());
        entity.setIncludeSignature(request.getIncludeSignature());
        entity.setSignatureTitle(request.getSignatureTitle());
        entity.setSignatoryName(request.getSignatoryName());
        entity.setSignatoryDesignation(request.getSignatoryDesignation());
        entity.setRequiresApproval(request.getRequiresApproval());
        entity.setIsActive(request.getIsActive());
        entity.setAvailablePlaceholders(request.getAvailablePlaceholders());
        entity.setTemplateVersion(entity.getTemplateVersion() + 1);

        LetterTemplate saved = templateRepository.save(entity);
        log.info("Letter template updated: {}", templateId);

        return LetterTemplateResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public LetterTemplateResponse getTemplateById(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LetterTemplate entity = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + templateId));
        return LetterTemplateResponse.fromEntity(entity);
    }

    @Transactional(readOnly = true)
    public Page<LetterTemplateResponse> getAllTemplates(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findByTenantId(tenantId, pageable)
                .map(LetterTemplateResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<LetterTemplateResponse> getActiveTemplates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findActiveTemplates(tenantId).stream()
                .map(LetterTemplateResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LetterTemplateResponse> getTemplatesByCategory(LetterCategory category) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findByCategory(tenantId, category).stream()
                .map(LetterTemplateResponse::fromEntity)
                .toList();
    }

    public void deleteTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LetterTemplate entity = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + templateId));

        if (entity.getIsSystemTemplate()) {
            throw new BusinessException("System templates cannot be deleted");
        }

        entity.setIsActive(false);
        templateRepository.save(entity);
        log.info("Letter template deactivated: {}", templateId);
    }

    // ==================== Letter Generation Operations ====================

    public GeneratedLetterResponse generateLetter(GenerateLetterRequest request, UUID generatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate template = templateRepository.findByIdAndTenantId(request.getTemplateId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + request.getTemplateId()));

        if (!template.getIsActive()) {
            throw new BusinessException("Template is not active");
        }

        Employee employee = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + request.getEmployeeId()));

        String referenceNumber = generateReferenceNumber(template.getCategory(), tenantId);
        String content = processTemplate(template.getTemplateContent(), employee, request.getCustomPlaceholderValues());

        GeneratedLetter entity = GeneratedLetter.builder()
                .referenceNumber(referenceNumber)
                .templateId(template.getId())
                .employeeId(employee.getId())
                .category(template.getCategory())
                .letterTitle(request.getLetterTitle() != null ? request.getLetterTitle() : template.getName())
                .generatedContent(content)
                .letterDate(request.getLetterDate() != null ? request.getLetterDate() : LocalDate.now())
                .effectiveDate(request.getEffectiveDate())
                .expiryDate(request.getExpiryDate())
                .status(LetterStatus.DRAFT)
                .generatedBy(generatedBy)
                .additionalNotes(request.getAdditionalNotes())
                .customPlaceholderValues(serializeMap(request.getCustomPlaceholderValues()))
                .build();
        entity.setTenantId(tenantId);

        if (Boolean.TRUE.equals(request.getSubmitForApproval()) && template.getRequiresApproval()) {
            entity.submitForApproval();
        } else if (!template.getRequiresApproval()) {
            entity.setStatus(LetterStatus.APPROVED);
        }

        GeneratedLetter saved = letterRepository.save(entity);
        log.info("Letter generated: {} for employee: {}", saved.getReferenceNumber(), employee.getId());

        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    @Transactional(readOnly = true)
    public GeneratedLetterResponse getLetterById(UUID letterId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(entity), tenantId);
    }

    @Transactional(readOnly = true)
    public Page<GeneratedLetterResponse> getAllLetters(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return letterRepository.findByTenantId(tenantId, pageable)
                .map(e -> enrichLetterResponse(GeneratedLetterResponse.fromEntity(e), tenantId));
    }

    @Transactional(readOnly = true)
    public Page<GeneratedLetterResponse> getLettersByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return letterRepository.findByEmployeeId(employeeId, tenantId, pageable)
                .map(e -> enrichLetterResponse(GeneratedLetterResponse.fromEntity(e), tenantId));
    }

    @Transactional(readOnly = true)
    public List<GeneratedLetterResponse> getIssuedLettersForEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return letterRepository.findIssuedLettersForEmployee(employeeId, tenantId).stream()
                .map(e -> enrichLetterResponse(GeneratedLetterResponse.fromEntity(e), tenantId))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<GeneratedLetterResponse> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return letterRepository.findPendingApprovals(tenantId, pageable)
                .map(e -> enrichLetterResponse(GeneratedLetterResponse.fromEntity(e), tenantId));
    }

    public GeneratedLetterResponse submitForApproval(UUID letterId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        if (entity.getStatus() != LetterStatus.DRAFT) {
            throw new BusinessException("Only draft letters can be submitted for approval");
        }

        entity.submitForApproval();
        GeneratedLetter saved = letterRepository.save(entity);

        log.info("Letter submitted for approval: {}", letterId);
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    public GeneratedLetterResponse approveLetter(UUID letterId, UUID approverId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        if (entity.getStatus() != LetterStatus.PENDING_APPROVAL) {
            throw new BusinessException("Letter is not pending approval");
        }

        entity.approve(approverId, comments);
        GeneratedLetter saved = letterRepository.save(entity);

        log.info("Letter approved: {}", letterId);
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    public GeneratedLetterResponse issueLetter(UUID letterId, UUID issuerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        if (entity.getStatus() != LetterStatus.APPROVED) {
            throw new BusinessException("Only approved letters can be issued");
        }

        entity.issue(issuerId);
        GeneratedLetter saved = letterRepository.save(entity);

        log.info("Letter issued: {}", letterId);
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    public GeneratedLetterResponse revokeLetter(UUID letterId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        if (entity.getStatus() != LetterStatus.ISSUED) {
            throw new BusinessException("Only issued letters can be revoked");
        }

        entity.revoke();
        GeneratedLetter saved = letterRepository.save(entity);

        log.info("Letter revoked: {}", letterId);
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    public void markLetterDownloaded(UUID letterId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        if (!entity.getEmployeeId().equals(employeeId)) {
            throw new BusinessException("Letter does not belong to this employee");
        }

        entity.markDownloaded();
        letterRepository.save(entity);
        log.info("Letter marked as downloaded: {}", letterId);
    }

    // ==================== Helper Methods ====================

    private String processTemplate(String template, Employee employee, Map<String, String> customValues) {
        String result = template;

        // Replace standard placeholders
        result = result.replace("{{employee.name}}", employee.getFirstName() + " " + employee.getLastName());
        result = result.replace("{{employee.firstName}}", employee.getFirstName());
        result = result.replace("{{employee.lastName}}", employee.getLastName());
        result = result.replace("{{employee.id}}",
                employee.getEmployeeCode() != null ? employee.getEmployeeCode() : "");
        result = result.replace("{{employee.designation}}",
                employee.getDesignation() != null ? employee.getDesignation() : "");
        result = result.replace("{{employee.dateOfJoining}}",
                employee.getJoiningDate() != null ? employee.getJoiningDate().format(DATE_FORMATTER) : "");
        result = result.replace("{{currentDate}}", LocalDate.now().format(DATE_FORMATTER));

        // Replace custom placeholders
        if (customValues != null) {
            for (Map.Entry<String, String> entry : customValues.entrySet()) {
                result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
        }

        return result;
    }

    private String generateReferenceNumber(LetterCategory category, UUID tenantId) {
        String prefix = category.name().substring(0, 3).toUpperCase() + "/" + LocalDate.now().getYear();
        Integer maxSequence = letterRepository.findMaxSequenceByPrefix(tenantId, prefix);
        int nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
        return GeneratedLetter.generateReferenceNumber(prefix, nextSequence);
    }

    private String serializeMap(Map<String, String> map) {
        if (map == null)
            return null;
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            log.error("Error serializing map", e);
            return null;
        }
    }

    private GeneratedLetterResponse enrichLetterResponse(GeneratedLetterResponse response, UUID tenantId) {
        employeeRepository.findByIdAndTenantId(response.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName());
                    response.setEmployeeEmail(emp.getPersonalEmail());
                });

        templateRepository.findByIdAndTenantId(response.getTemplateId(), tenantId)
                .ifPresent(template -> response.setTemplateName(template.getName()));

        if (response.getGeneratedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getGeneratedBy(), tenantId)
                    .ifPresent(emp -> response.setGeneratedByName(emp.getFirstName() + " " + emp.getLastName()));
        }

        if (response.getApprovedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getApprovedBy(), tenantId)
                    .ifPresent(emp -> response.setApprovedByName(emp.getFirstName() + " " + emp.getLastName()));
        }

        if (response.getIssuedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getIssuedBy(), tenantId)
                    .ifPresent(emp -> response.setIssuedByName(emp.getFirstName() + " " + emp.getLastName()));
        }

        return response;
    }

    @Transactional(readOnly = true)
    public LetterCategory[] getLetterCategories() {
        return LetterCategory.values();
    }
}
