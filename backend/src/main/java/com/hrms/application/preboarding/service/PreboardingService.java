package com.hrms.application.preboarding.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.preboarding.PreboardingCandidate;
import com.hrms.domain.preboarding.PreboardingCandidate.PreboardingStatus;
import com.hrms.infrastructure.preboarding.repository.PreboardingCandidateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PreboardingService {

    private static final String CANDIDATE_NOT_FOUND = "Candidate not found";

    private final PreboardingCandidateRepository candidateRepository;

    /**
     * Create a new pre-boarding invitation for a candidate.
     */
    @Transactional
    public PreboardingCandidate createInvitation(
            String firstName, String lastName, String email,
            LocalDate expectedJoiningDate, String designation,
            UUID departmentId, UUID reportingManagerId) {

        UUID tenantId = SecurityContext.getCurrentTenantId();

        if (candidateRepository.existsByEmailAndTenantId(email, tenantId)) {
            throw new BusinessException("Candidate with this email already exists");
        }

        PreboardingCandidate candidate = PreboardingCandidate.builder()
                .tenantId(tenantId)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .expectedJoiningDate(expectedJoiningDate)
                .designation(designation)
                .departmentId(departmentId)
                .reportingManagerId(reportingManagerId)
                .accessToken(UUID.randomUUID().toString())
                .tokenExpiresAt(LocalDateTime.now().plusDays(30))
                .status(PreboardingStatus.INVITED)
                .completionPercentage(0)
                .build();

        candidate = candidateRepository.save(candidate);
        log.info("Created pre-boarding invitation for {} ({})", candidate.getFullName(), email);

        return candidate;
    }

    /**
     * Get candidate by access token (for public portal access).
     */
    @Transactional(readOnly = true)
    public PreboardingCandidate getByAccessToken(String accessToken) {
        PreboardingCandidate candidate = candidateRepository.findByAccessToken(accessToken)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired access link"));

        if (candidate.getTokenExpiresAt() != null &&
            candidate.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Access link has expired");
        }

        if (candidate.getStatus() == PreboardingStatus.CANCELLED) {
            throw new BusinessException("This pre-boarding has been cancelled");
        }

        return candidate;
    }

    /**
     * Update candidate's personal information (called by candidate via portal).
     */
    @Transactional
    public PreboardingCandidate updatePersonalInfo(String accessToken,
            LocalDate dateOfBirth, String address, String city, String state,
            String postalCode, String country, String phoneNumber,
            String emergencyContactNumber, String emergencyContactName) {

        PreboardingCandidate candidate = getByAccessToken(accessToken);

        candidate.setDateOfBirth(dateOfBirth);
        candidate.setAddress(address);
        candidate.setCity(city);
        candidate.setState(state);
        candidate.setPostalCode(postalCode);
        candidate.setCountry(country);
        candidate.setPhoneNumber(phoneNumber);
        candidate.setEmergencyContactNumber(emergencyContactNumber);
        candidate.setEmergencyContactName(emergencyContactName);

        if (candidate.getStatus() == PreboardingStatus.INVITED) {
            candidate.setStatus(PreboardingStatus.IN_PROGRESS);
        }

        candidate.updateCompletionPercentage();
        return candidateRepository.save(candidate);
    }

    /**
     * Update candidate's bank details.
     */
    @Transactional
    public PreboardingCandidate updateBankDetails(String accessToken,
            String bankAccountNumber, String bankName, String bankIfscCode, String taxId) {

        PreboardingCandidate candidate = getByAccessToken(accessToken);

        candidate.setBankAccountNumber(bankAccountNumber);
        candidate.setBankName(bankName);
        candidate.setBankIfscCode(bankIfscCode);
        candidate.setTaxId(taxId);

        if (candidate.getStatus() == PreboardingStatus.INVITED) {
            candidate.setStatus(PreboardingStatus.IN_PROGRESS);
        }

        candidate.updateCompletionPercentage();
        return candidateRepository.save(candidate);
    }

    /**
     * Mark a document as uploaded.
     */
    @Transactional
    public PreboardingCandidate markDocumentUploaded(String accessToken, String documentType) {
        PreboardingCandidate candidate = getByAccessToken(accessToken);

        switch (documentType.toLowerCase()) {
            case "photo" -> candidate.setPhotoUploaded(true);
            case "id_proof" -> candidate.setIdProofUploaded(true);
            case "address_proof" -> candidate.setAddressProofUploaded(true);
            case "education" -> candidate.setEducationDocsUploaded(true);
            default -> throw new BusinessException("Unknown document type: " + documentType);
        }

        if (candidate.getStatus() == PreboardingStatus.INVITED) {
            candidate.setStatus(PreboardingStatus.IN_PROGRESS);
        }

        candidate.updateCompletionPercentage();
        return candidateRepository.save(candidate);
    }

    /**
     * Sign offer letter.
     */
    @Transactional
    public PreboardingCandidate signOfferLetter(String accessToken) {
        PreboardingCandidate candidate = getByAccessToken(accessToken);
        candidate.setOfferLetterSigned(true);

        if (candidate.getStatus() == PreboardingStatus.INVITED) {
            candidate.setStatus(PreboardingStatus.IN_PROGRESS);
        }

        candidate.updateCompletionPercentage();
        return candidateRepository.save(candidate);
    }

    // Admin operations

    @Transactional(readOnly = true)
    public Page<PreboardingCandidate> getAllCandidates(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return candidateRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<PreboardingCandidate> getCandidatesByStatus(PreboardingStatus status, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return candidateRepository.findByTenantIdAndStatus(tenantId, status, pageable);
    }

    @Transactional(readOnly = true)
    public List<PreboardingCandidate> getUpcomingJoiners(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return candidateRepository.findByTenantIdAndExpectedJoiningDateBetween(tenantId, startDate, endDate);
    }

    @Transactional
    public void cancelInvitation(UUID candidateId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        PreboardingCandidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(CANDIDATE_NOT_FOUND));

        candidate.setStatus(PreboardingStatus.CANCELLED);
        candidateRepository.save(candidate);
        log.info("Cancelled pre-boarding for {}", candidate.getFullName());
    }

    @Transactional
    public void resendInvitation(UUID candidateId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        PreboardingCandidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(CANDIDATE_NOT_FOUND));

        candidate.setAccessToken(UUID.randomUUID().toString());
        candidate.setTokenExpiresAt(LocalDateTime.now().plusDays(30));
        candidateRepository.save(candidate);
        log.info("Resent pre-boarding invitation to {}", candidate.getFullName());
    }

    /**
     * Mark candidate as converted to employee.
     */
    @Transactional
    public void markConverted(UUID candidateId, UUID employeeId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        PreboardingCandidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(CANDIDATE_NOT_FOUND));

        candidate.setStatus(PreboardingStatus.CONVERTED);
        candidate.setEmployeeId(employeeId);
        candidateRepository.save(candidate);
        log.info("Converted pre-boarding candidate {} to employee {}", candidate.getFullName(), employeeId);
    }
}
