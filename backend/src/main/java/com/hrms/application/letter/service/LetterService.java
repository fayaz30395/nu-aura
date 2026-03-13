package com.hrms.application.letter.service;

import com.hrms.api.letter.dto.*;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.letter.GeneratedLetter.LetterStatus;
import com.hrms.domain.letter.LetterTemplate;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.letter.repository.GeneratedLetterRepository;
import com.hrms.infrastructure.letter.repository.LetterTemplateRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.hrms.api.esignature.dto.SignatureApprovalRequest;
import com.hrms.api.esignature.dto.SignatureRequestRequest;
import com.hrms.api.esignature.dto.SignatureRequestResponse;
import com.hrms.application.esignature.service.ESignatureService;
import com.hrms.domain.esignature.SignatureRequest;
import com.hrms.domain.esignature.SignatureApproval;
import com.fasterxml.jackson.core.JsonProcessingException;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final ESignatureService eSignatureService;
    private final ObjectMapper objectMapper;
    private final DataScopeService dataScopeService;
    private final LetterPdfService letterPdfService;

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

    /**
     * Generate an offer letter for a candidate (not yet an employee).
     * Updates candidate with offer details and optionally links to e-signature flow.
     */
    public GeneratedLetterResponse generateOfferLetter(GenerateOfferLetterRequest request, UUID generatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate template = templateRepository.findByIdAndTenantId(request.getTemplateId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + request.getTemplateId()));

        if (!template.getIsActive()) {
            throw new BusinessException("Template is not active");
        }

        if (template.getCategory() != LetterCategory.OFFER) {
            throw new BusinessException("Template must be of OFFER category for offer letters");
        }

        Candidate candidate = candidateRepository.findByIdAndTenantId(request.getCandidateId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + request.getCandidateId()));

        // Fetch job opening for additional context
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(candidate.getJobOpeningId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found: " + candidate.getJobOpeningId()));

        // Update candidate with offer details (but don't set OFFER_EXTENDED status yet)
        // Status changes to OFFER_EXTENDED only when the letter is issued (via issueLetter or issueOfferLetterWithESign)
        candidate.setOfferedCtc(request.getOfferedCtc());
        candidate.setOfferedDesignation(request.getOfferedDesignation());
        candidate.setProposedJoiningDate(request.getProposedJoiningDate());
        candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER_NDA_TO_BE_RELEASED);
        // Note: offerExtendedDate and OFFER_EXTENDED status are set in issueOfferLetterWithESign()

        String referenceNumber = generateReferenceNumber(LetterCategory.OFFER, tenantId);
        String content = processCandidateTemplate(template.getTemplateContent(), candidate, jobOpening, request);

        GeneratedLetter entity = GeneratedLetter.builder()
                .referenceNumber(referenceNumber)
                .templateId(template.getId())
                .candidateId(candidate.getId())
                .category(LetterCategory.OFFER)
                .letterTitle(request.getLetterTitle() != null ? request.getLetterTitle() : "Offer Letter - " + candidate.getFullName())
                .generatedContent(content)
                .letterDate(request.getLetterDate() != null ? request.getLetterDate() : LocalDate.now())
                .effectiveDate(request.getProposedJoiningDate())
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

        // Link letter to candidate
        candidate.setOfferLetterId(saved.getId());
        candidateRepository.save(candidate);

        log.info("Offer letter generated: {} for candidate: {}", saved.getReferenceNumber(), candidate.getId());

        // If sendForESign is true and letter is approved, auto-generate PDF and issue with e-sign
        if (Boolean.TRUE.equals(request.getSendForESign()) && saved.getStatus() == LetterStatus.APPROVED) {
            // Generate PDF first
            String pdfUrl = letterPdfService.generatePdf(saved.getId());
            saved.setPdfUrl(pdfUrl);
            saved = letterRepository.save(saved);
            log.info("Auto-generated PDF for offer letter: {}", saved.getId());

            // Issue with e-sign
            return issueOfferLetterWithESign(saved.getId(), generatedBy);
        }

        return enrichOfferLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId, candidate);
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
        // Apply scope-based filtering using DataScopeService
        Specification<GeneratedLetter> scopeSpec = dataScopeService.getScopeSpecification(Permission.LETTER_TEMPLATE_VIEW);
        Specification<GeneratedLetter> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<GeneratedLetter> combinedSpec = Specification.where(tenantSpec).and(scopeSpec);

        return letterRepository.findAll(combinedSpec, pageable)
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
        // Apply scope-based filtering for approvals using LETTER_APPROVE permission
        Specification<GeneratedLetter> scopeSpec = dataScopeService.getScopeSpecification(Permission.LETTER_APPROVE);
        Specification<GeneratedLetter> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<GeneratedLetter> statusSpec = (root, query, cb) -> cb.equal(root.get("status"), LetterStatus.PENDING_APPROVAL);
        Specification<GeneratedLetter> combinedSpec = Specification.where(tenantSpec).and(statusSpec).and(scopeSpec);

        return letterRepository.findAll(combinedSpec, pageable)
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

    /**
     * Issue an offer letter and create an e-signature request for the candidate.
     * This is used for offer letters that require candidate signature.
     */
    public GeneratedLetterResponse issueOfferLetterWithESign(UUID letterId, UUID issuerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        if (entity.getStatus() != LetterStatus.APPROVED) {
            throw new BusinessException("Only approved letters can be issued");
        }

        if (entity.getCandidateId() == null) {
            throw new BusinessException("This method is for offer letters with candidates. Use issueLetter for employee letters.");
        }

        // Get candidate details
        Candidate candidate = candidateRepository.findByIdAndTenantId(entity.getCandidateId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + entity.getCandidateId()));

        // Issue the letter
        entity.issue(issuerId);
        GeneratedLetter saved = letterRepository.save(entity);

        // Update candidate status to OFFER_EXTENDED now that letter is issued
        candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
        candidate.setOfferExtendedDate(LocalDate.now());
        candidateRepository.save(candidate);

        // Create e-signature request for candidate
        SignatureRequestResponse signatureResponse = createOfferLetterSignatureRequest(saved, candidate, issuerId);
        log.info("Offer letter issued with e-signature request: {} -> SignatureRequest: {}",
                letterId, signatureResponse.getId());

        GeneratedLetterResponse response = GeneratedLetterResponse.fromEntity(saved);
        response.setCandidateName(candidate.getFullName());
        response.setCandidateEmail(candidate.getEmail());

        templateRepository.findByIdAndTenantId(response.getTemplateId(), tenantId)
                .ifPresent(template -> response.setTemplateName(template.getName()));

        if (response.getIssuedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getIssuedBy(), tenantId)
                    .ifPresent(emp -> response.setIssuedByName(emp.getFirstName() + " " + emp.getLastName()));
        }

        return response;
    }

    /**
     * Creates an e-signature request for the offer letter to be signed by the candidate.
     * Candidate is an EXTERNAL signer (not an employee), so signerId is null.
     */
    private SignatureRequestResponse createOfferLetterSignatureRequest(GeneratedLetter letter, Candidate candidate, UUID createdBy) {
        // Auto-generate PDF if it doesn't exist yet
        if (letter.getPdfUrl() == null || letter.getPdfUrl().isBlank()) {
            log.info("PDF not found for letter {}. Auto-generating PDF before sending for e-signature.", letter.getId());
            String pdfUrl = letterPdfService.generatePdf(letter.getId());
            letter.setPdfUrl(pdfUrl);
            letter = letterRepository.save(letter);
            log.info("PDF auto-generated for letter {}: {}", letter.getId(), pdfUrl);
        }

        // Build signature request - signerId is null for EXTERNAL (candidate) signers
        SignatureRequestRequest signatureRequest = SignatureRequestRequest.builder()
                .title("Offer Letter - " + candidate.getFullName())
                .description("Please review and sign your offer letter to confirm acceptance of the position.")
                .documentType(SignatureRequest.DocumentType.OFFER_LETTER)
                .documentUrl(letter.getPdfUrl())
                .documentName("Offer_Letter_" + candidate.getCandidateCode() + ".pdf")
                .signatureOrder(false) // Parallel signing (only candidate needs to sign)
                .signers(List.of(
                        SignatureApprovalRequest.builder()
                                .signerId(null) // EXTERNAL signer - no employee ID
                                .signerEmail(candidate.getEmail())
                                .signerRole(SignatureApproval.SignerRole.EXTERNAL)
                                .signingOrder(1)
                                .isRequired(true)
                                .comments("Awaiting candidate signature for offer acceptance")
                                .build()
                ))
                .metadata("{\"candidateId\":\"" + candidate.getId() + "\",\"letterId\":\"" + letter.getId() + "\"}")
                .build();

        SignatureRequestResponse response = eSignatureService.createSignatureRequest(signatureRequest, createdBy);

        // Send for signature immediately
        return eSignatureService.sendForSignature(response.getId());
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

    /**
     * Process template for candidate offer letters with candidate/offer specific placeholders.
     */
    private String processCandidateTemplate(String template, Candidate candidate, JobOpening jobOpening,
                                            GenerateOfferLetterRequest request) {
        String result = template;

        // Candidate placeholders
        result = result.replace("{{candidate.name}}", candidate.getFullName());
        result = result.replace("{{candidate.firstName}}", candidate.getFirstName());
        result = result.replace("{{candidate.lastName}}", candidate.getLastName());
        result = result.replace("{{candidate.email}}", candidate.getEmail() != null ? candidate.getEmail() : "");
        result = result.replace("{{candidate.phone}}", candidate.getPhone() != null ? candidate.getPhone() : "");
        result = result.replace("{{candidate.currentCompany}}",
                candidate.getCurrentCompany() != null ? candidate.getCurrentCompany() : "");
        result = result.replace("{{candidate.currentDesignation}}",
                candidate.getCurrentDesignation() != null ? candidate.getCurrentDesignation() : "");
        result = result.replace("{{candidate.currentLocation}}",
                candidate.getCurrentLocation() != null ? candidate.getCurrentLocation() : "");

        // Offer placeholders
        result = result.replace("{{offer.ctc}}",
                request.getOfferedCtc() != null ? formatCurrency(request.getOfferedCtc()) : "");
        result = result.replace("{{offer.salary}}",
                request.getOfferedCtc() != null ? formatCurrency(request.getOfferedCtc()) : "");
        result = result.replace("{{offer.designation}}",
                request.getOfferedDesignation() != null ? request.getOfferedDesignation() : "");
        result = result.replace("{{offer.joiningDate}}",
                request.getProposedJoiningDate() != null ? request.getProposedJoiningDate().format(DATE_FORMATTER) : "");

        // Job opening placeholders
        result = result.replace("{{job.title}}", jobOpening.getJobTitle() != null ? jobOpening.getJobTitle() : "");
        result = result.replace("{{job.location}}", jobOpening.getLocation() != null ? jobOpening.getLocation() : "");
        result = result.replace("{{job.employmentType}}",
                jobOpening.getEmploymentType() != null ? formatEmploymentType(jobOpening.getEmploymentType()) : "");

        // Common placeholders
        result = result.replace("{{currentDate}}", LocalDate.now().format(DATE_FORMATTER));
        result = result.replace("{{offerDate}}", LocalDate.now().format(DATE_FORMATTER));

        // Replace custom placeholders
        if (request.getCustomPlaceholderValues() != null) {
            for (Map.Entry<String, String> entry : request.getCustomPlaceholderValues().entrySet()) {
                result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
        }

        return result;
    }

    private String formatCurrency(java.math.BigDecimal amount) {
        java.text.NumberFormat formatter = java.text.NumberFormat.getCurrencyInstance(new java.util.Locale("en", "IN"));
        return formatter.format(amount);
    }

    private String formatEmploymentType(JobOpening.EmploymentType type) {
        return switch (type) {
            case FULL_TIME -> "Full Time";
            case PART_TIME -> "Part Time";
            case CONTRACT -> "Contract";
            case TEMPORARY -> "Temporary";
            case INTERNSHIP -> "Internship";
        };
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

    /**
     * Enrich offer letter response with candidate details.
     */
    private GeneratedLetterResponse enrichOfferLetterResponse(GeneratedLetterResponse response, UUID tenantId, Candidate candidate) {
        // Set candidate details
        response.setCandidateName(candidate.getFullName());
        response.setCandidateEmail(candidate.getEmail());

        // Enrich template and generated by
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
