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
import com.hrms.domain.employee.Department;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LetterService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");
    private static final String TEMPLATE_NOT_FOUND_PREFIX = "Template not found: ";
    private static final String LETTER_NOT_FOUND_PREFIX = "Letter not found: ";
    private static final String TEMPLATE_NOT_ACTIVE = "Template is not active";

    private final LetterTemplateRepository templateRepository;
    private final GeneratedLetterRepository letterRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final ESignatureService eSignatureService;
    private final ObjectMapper objectMapper;
    private final DataScopeService dataScopeService;
    private final LetterPdfService letterPdfService;

    // ==================== Template Operations ====================

    @Transactional
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

    @Transactional
    public LetterTemplateResponse updateTemplate(UUID templateId, LetterTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate entity = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + templateId));

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
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + templateId));
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

    @Transactional
    public void deleteTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LetterTemplate entity = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + templateId));

        if (entity.getIsSystemTemplate()) {
            throw new BusinessException("System templates cannot be deleted");
        }

        entity.setIsActive(false);
        templateRepository.save(entity);
        log.info("Letter template deactivated: {}", templateId);
    }

    // ==================== Letter Generation Operations ====================

    @Transactional
    public GeneratedLetterResponse generateLetter(GenerateLetterRequest request, UUID generatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate template = templateRepository.findByIdAndTenantId(request.getTemplateId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + request.getTemplateId()));

        if (!template.getIsActive()) {
            throw new BusinessException(TEMPLATE_NOT_ACTIVE);
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
    @Transactional
    public GeneratedLetterResponse generateOfferLetter(GenerateOfferLetterRequest request, UUID generatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate template = templateRepository.findByIdAndTenantId(request.getTemplateId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + request.getTemplateId()));

        if (!template.getIsActive()) {
            throw new BusinessException(TEMPLATE_NOT_ACTIVE);
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
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));
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

    @Transactional
    public GeneratedLetterResponse submitForApproval(UUID letterId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));

        if (entity.getStatus() != LetterStatus.DRAFT) {
            throw new BusinessException("Only draft letters can be submitted for approval");
        }

        entity.submitForApproval();
        GeneratedLetter saved = letterRepository.save(entity);

        log.info("Letter submitted for approval: {}", letterId);
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public GeneratedLetterResponse approveLetter(UUID letterId, UUID approverId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));

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
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));

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
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));

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

    @Transactional
    public GeneratedLetterResponse revokeLetter(UUID letterId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));

        if (entity.getStatus() != LetterStatus.ISSUED) {
            throw new BusinessException("Only issued letters can be revoked");
        }

        entity.revoke();
        GeneratedLetter saved = letterRepository.save(entity);

        log.info("Letter revoked: {}", letterId);
        return enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public void markLetterDownloaded(UUID letterId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        GeneratedLetter entity = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(LETTER_NOT_FOUND_PREFIX + letterId));

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
        // Resolve department name from departmentId
        String departmentName = "";
        if (employee.getDepartmentId() != null) {
            UUID tenantId = TenantContext.getCurrentTenant();
            departmentName = departmentRepository.findByIdAndTenantId(employee.getDepartmentId(), tenantId)
                    .map(Department::getName)
                    .orElse("");
        }
        result = result.replace("{{employee.department}}", departmentName);
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

        enrichCommonResponseFields(response, tenantId);
        return response;
    }

    /**
     * Enrich offer letter response with candidate details.
     */
    private GeneratedLetterResponse enrichOfferLetterResponse(GeneratedLetterResponse response, UUID tenantId, Candidate candidate) {
        response.setCandidateName(candidate.getFullName());
        response.setCandidateEmail(candidate.getEmail());

        enrichCommonResponseFields(response, tenantId);
        return response;
    }

    /**
     * Shared enrichment for template name, generatedBy, approvedBy, and issuedBy.
     */
    private void enrichCommonResponseFields(GeneratedLetterResponse response, UUID tenantId) {
        templateRepository.findByIdAndTenantId(response.getTemplateId(), tenantId)
                .ifPresent(template -> response.setTemplateName(template.getName()));

        enrichEmployeeName(response.getGeneratedBy(), tenantId, response::setGeneratedByName);
        enrichEmployeeName(response.getApprovedBy(), tenantId, response::setApprovedByName);
        enrichEmployeeName(response.getIssuedBy(), tenantId, response::setIssuedByName);
    }

    /**
     * Resolve employee full name by ID and apply to the given setter.
     */
    private void enrichEmployeeName(UUID employeeId, UUID tenantId, java.util.function.Consumer<String> setter) {
        if (employeeId != null) {
            employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                    .ifPresent(emp -> setter.accept(emp.getFirstName() + " " + emp.getLastName()));
        }
    }

    @Transactional(readOnly = true)
    public LetterCategory[] getLetterCategories() {
        return LetterCategory.values();
    }

    // ==================== Placeholder Operations ====================

    /**
     * Returns all available placeholders grouped by category for use in letter templates.
     */
    @Transactional(readOnly = true)
    public Map<String, List<Map<String, String>>> getAvailablePlaceholders() {
        Map<String, List<Map<String, String>>> placeholders = new LinkedHashMap<>();

        // Employee placeholders
        List<Map<String, String>> employeePlaceholders = List.of(
                Map.of("key", "employee.name", "label", "Full Name", "example", "John Doe"),
                Map.of("key", "employee.firstName", "label", "First Name", "example", "John"),
                Map.of("key", "employee.lastName", "label", "Last Name", "example", "Doe"),
                Map.of("key", "employee.id", "label", "Employee Code", "example", "EMP-0042"),
                Map.of("key", "employee.designation", "label", "Designation", "example", "Software Engineer"),
                Map.of("key", "employee.department", "label", "Department", "example", "Engineering"),
                Map.of("key", "employee.dateOfJoining", "label", "Date of Joining", "example", "15 March 2024"),
                Map.of("key", "employee.salary", "label", "Salary", "example", "₹12,00,000"),
                Map.of("key", "employee.lastWorkingDay", "label", "Last Working Day", "example", "31 December 2025")
        );
        placeholders.put("Employee", employeePlaceholders);

        // Company placeholders
        List<Map<String, String>> companyPlaceholders = List.of(
                Map.of("key", "company.name", "label", "Company Name", "example", "Acme Corp"),
                Map.of("key", "company.address", "label", "Company Address", "example", "123 Business Park, Bangalore"),
                Map.of("key", "company.phone", "label", "Company Phone", "example", "+91 80 1234 5678"),
                Map.of("key", "company.email", "label", "Company Email", "example", "hr@acmecorp.com"),
                Map.of("key", "company.website", "label", "Company Website", "example", "www.acmecorp.com")
        );
        placeholders.put("Company", companyPlaceholders);

        // Letter placeholders
        List<Map<String, String>> letterPlaceholders = List.of(
                Map.of("key", "currentDate", "label", "Current Date", "example", "29 March 2026"),
                Map.of("key", "letter.referenceNumber", "label", "Reference Number", "example", "OFF/2026/0001"),
                Map.of("key", "letter.effectiveDate", "label", "Effective Date", "example", "01 April 2026"),
                Map.of("key", "letter.expiryDate", "label", "Expiry Date", "example", "30 April 2026")
        );
        placeholders.put("Letter", letterPlaceholders);

        // Candidate placeholders (for offer letters)
        List<Map<String, String>> candidatePlaceholders = List.of(
                Map.of("key", "candidate.name", "label", "Candidate Name", "example", "Jane Smith"),
                Map.of("key", "candidate.firstName", "label", "First Name", "example", "Jane"),
                Map.of("key", "candidate.lastName", "label", "Last Name", "example", "Smith"),
                Map.of("key", "candidate.email", "label", "Candidate Email", "example", "jane@example.com"),
                Map.of("key", "candidate.phone", "label", "Candidate Phone", "example", "+91 98765 43210"),
                Map.of("key", "offer.ctc", "label", "Offered CTC", "example", "₹15,00,000"),
                Map.of("key", "offer.designation", "label", "Offered Designation", "example", "Senior Engineer"),
                Map.of("key", "offer.joiningDate", "label", "Proposed Joining Date", "example", "15 April 2026"),
                Map.of("key", "job.title", "label", "Job Title", "example", "Senior Software Engineer"),
                Map.of("key", "job.location", "label", "Job Location", "example", "Bangalore")
        );
        placeholders.put("Candidate / Offer", candidatePlaceholders);

        return placeholders;
    }

    // ==================== Clone Template ====================

    @Transactional
    public LetterTemplateResponse cloneTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate source = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + templateId));

        String newCode = source.getCode() + "_COPY_" + System.currentTimeMillis();
        String newName = source.getName() + " (Copy)";

        LetterTemplate clone = LetterTemplate.builder()
                .name(newName)
                .code(newCode)
                .description(source.getDescription())
                .category(source.getCategory())
                .templateContent(source.getTemplateContent())
                .headerHtml(source.getHeaderHtml())
                .footerHtml(source.getFooterHtml())
                .cssStyles(source.getCssStyles())
                .includeCompanyLogo(source.getIncludeCompanyLogo())
                .includeSignature(source.getIncludeSignature())
                .signatureTitle(source.getSignatureTitle())
                .signatoryName(source.getSignatoryName())
                .signatoryDesignation(source.getSignatoryDesignation())
                .requiresApproval(source.getRequiresApproval())
                .isActive(true)
                .isSystemTemplate(false)
                .templateVersion(1)
                .availablePlaceholders(source.getAvailablePlaceholders())
                .build();
        clone.setTenantId(tenantId);

        LetterTemplate saved = templateRepository.save(clone);
        log.info("Letter template cloned: {} -> {}", templateId, saved.getId());

        return LetterTemplateResponse.fromEntity(saved);
    }

    // ==================== Bulk Generation ====================

    @Transactional
    public List<GeneratedLetterResponse> bulkGenerate(UUID templateId, List<UUID> employeeIds, UUID generatedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + templateId));

        if (!template.getIsActive()) {
            throw new BusinessException(TEMPLATE_NOT_ACTIVE);
        }

        List<GeneratedLetterResponse> results = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

                String referenceNumber = generateReferenceNumber(template.getCategory(), tenantId);
                String content = processTemplate(template.getTemplateContent(), employee, null);

                GeneratedLetter entity = GeneratedLetter.builder()
                        .referenceNumber(referenceNumber)
                        .templateId(template.getId())
                        .employeeId(employee.getId())
                        .category(template.getCategory())
                        .letterTitle(template.getName())
                        .generatedContent(content)
                        .letterDate(LocalDate.now())
                        .status(LetterStatus.DRAFT)
                        .generatedBy(generatedBy)
                        .build();
                entity.setTenantId(tenantId);

                GeneratedLetter saved = letterRepository.save(entity);
                results.add(enrichLetterResponse(GeneratedLetterResponse.fromEntity(saved), tenantId));

                log.info("Bulk generated letter: {} for employee: {}", saved.getReferenceNumber(), employeeId);
            } catch (Exception e) { // Intentional broad catch — service error boundary
                log.error("Failed to generate letter for employee {}: {}", employeeId, e.getMessage());
                // Continue with remaining employees
            }
        }

        return results;
    }

    /**
     * Preview a template by resolving placeholders with sample data.
     */
    @Transactional(readOnly = true)
    public String previewTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LetterTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_PREFIX + templateId));

        Map<String, String> sampleData = buildSamplePlaceholderData();
        return replacePlaceholders(template.getTemplateContent(), sampleData);
    }

    /**
     * Builds sample placeholder values used for template preview.
     */
    private Map<String, String> buildSamplePlaceholderData() {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("employee.name", "John Doe");
        data.put("employee.firstName", "John");
        data.put("employee.lastName", "Doe");
        data.put("employee.id", "EMP-0042");
        data.put("employee.designation", "Software Engineer");
        data.put("employee.department", "Engineering");
        data.put("employee.dateOfJoining", "15 March 2024");
        data.put("employee.salary", "₹12,00,000");
        data.put("employee.lastWorkingDay", "31 December 2025");
        data.put("company.name", "Acme Corp");
        data.put("company.address", "123 Business Park, Bangalore");
        data.put("company.phone", "+91 80 1234 5678");
        data.put("company.email", "hr@acmecorp.com");
        data.put("company.website", "www.acmecorp.com");
        data.put("currentDate", LocalDate.now().format(DATE_FORMATTER));
        data.put("letter.referenceNumber", "REF/2026/SAMPLE");
        data.put("letter.effectiveDate", LocalDate.now().format(DATE_FORMATTER));
        data.put("letter.expiryDate", LocalDate.now().plusMonths(1).format(DATE_FORMATTER));
        data.put("candidate.name", "Jane Smith");
        data.put("candidate.firstName", "Jane");
        data.put("candidate.lastName", "Smith");
        data.put("candidate.email", "jane@example.com");
        data.put("offer.ctc", "₹15,00,000");
        data.put("offer.designation", "Senior Engineer");
        data.put("offer.joiningDate", "15 April 2026");
        data.put("job.title", "Senior Software Engineer");
        data.put("job.location", "Bangalore");
        return data;
    }

    /**
     * Replace {{key}} placeholders in content with the provided values.
     */
    private String replacePlaceholders(String content, Map<String, String> values) {
        String result = content;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }
}
