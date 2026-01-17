package com.hrms.application.publicapi.service;

import com.hrms.api.publicapi.dto.PublicOfferAcceptRequest;
import com.hrms.api.publicapi.dto.PublicOfferDeclineRequest;
import com.hrms.api.publicapi.dto.PublicOfferResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.esignature.SignatureApproval;
import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.esignature.repository.SignatureApprovalRepository;
import com.hrms.infrastructure.letter.repository.GeneratedLetterRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service for public offer portal operations.
 * Handles token-based access for candidates to view and respond to offers.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PublicOfferService {

    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final GeneratedLetterRepository letterRepository;
    private final SignatureApprovalRepository signatureApprovalRepository;
    private final TenantRepository tenantRepository;

    /**
     * Get offer details by token.
     * Token is the e-signature authentication token.
     */
    @Transactional(readOnly = true)
    public PublicOfferResponse getOfferByToken(String token) {
        log.info("Getting offer details by token");

        // Find signature approval by token
        SignatureApproval approval = signatureApprovalRepository.findByAuthenticationToken(token)
                .orElse(null);

        if (approval == null) {
            return PublicOfferResponse.builder()
                    .tokenValid(false)
                    .errorMessage("Invalid or expired offer link. Please contact HR for a new link.")
                    .build();
        }

        // Check token expiry
        if (approval.getTokenExpiresAt() != null && approval.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            return PublicOfferResponse.builder()
                    .tokenValid(false)
                    .errorMessage("This offer link has expired. Please contact HR for a new link.")
                    .build();
        }

        // Set tenant context from the approval
        UUID tenantId = approval.getTenantId();
        TenantContext.setCurrentTenant(tenantId);

        try {
            // Get candidate from signature request metadata
            UUID candidateId = extractCandidateIdFromApproval(approval);
            if (candidateId == null) {
                return PublicOfferResponse.builder()
                        .tokenValid(false)
                        .errorMessage("Invalid offer link configuration")
                        .build();
            }

            Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                    .orElse(null);

            if (candidate == null) {
                return PublicOfferResponse.builder()
                        .tokenValid(false)
                        .errorMessage("Candidate not found")
                        .build();
            }

            // Get offer letter if exists
            GeneratedLetter letter = null;
            if (candidate.getOfferLetterId() != null) {
                letter = letterRepository.findById(candidate.getOfferLetterId()).orElse(null);
            }

            // Get job title from job opening
            String jobTitle = null;
            if (candidate.getJobOpeningId() != null) {
                jobTitle = jobOpeningRepository.findById(candidate.getJobOpeningId())
                        .map(JobOpening::getJobTitle)
                        .orElse(null);
            }

            // Get company name
            String companyName = tenantRepository.findById(tenantId)
                    .map(t -> t.getName())
                    .orElse("Company");

            return PublicOfferResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .email(candidate.getEmail())
                    .jobTitle(jobTitle)
                    .offeredDesignation(candidate.getOfferedDesignation())
                    .offeredCtc(candidate.getOfferedCtc())
                    .proposedJoiningDate(candidate.getProposedJoiningDate())
                    .offerExtendedDate(candidate.getOfferExtendedDate())
                    .status(candidate.getStatus())
                    .offerAcceptedDate(candidate.getOfferAcceptedDate())
                    .offerDeclinedDate(candidate.getOfferDeclinedDate())
                    .offerLetterId(candidate.getOfferLetterId())
                    .offerLetterUrl(letter != null ? letter.getPdfUrl() : null)
                    .offerLetterReferenceNumber(letter != null ? letter.getReferenceNumber() : null)
                    .signatureToken(token) // Return the same token for signing
                    .tokenValid(true)
                    .companyName(companyName)
                    .build();
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Accept offer using token.
     */
    @Transactional
    public PublicOfferResponse acceptOffer(String token, PublicOfferAcceptRequest request) {
        log.info("Accepting offer via token for email: {}", request.getEmail());

        SignatureApproval approval = signatureApprovalRepository.findByAuthenticationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired offer link"));

        // Validate token expiry
        if (approval.getTokenExpiresAt() != null && approval.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("This offer link has expired. Please contact HR for a new link.");
        }

        // Validate email matches
        if (!approval.getSignerEmail().equalsIgnoreCase(request.getEmail())) {
            throw new IllegalArgumentException("Email does not match the offer recipient");
        }

        UUID tenantId = approval.getTenantId();
        TenantContext.setCurrentTenant(tenantId);

        try {
            UUID candidateId = extractCandidateIdFromApproval(approval);
            if (candidateId == null) {
                throw new IllegalStateException("Invalid offer configuration");
            }

            Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                    .orElseThrow(() -> new IllegalStateException("Candidate not found"));

            // Verify candidate is in correct status
            if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
                throw new IllegalStateException("Offer has already been " +
                        (candidate.getStatus() == Candidate.CandidateStatus.OFFER_ACCEPTED ? "accepted" : "declined"));
            }

            // Update candidate
            candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
            candidate.setOfferAcceptedDate(LocalDate.now());
            if (request.getConfirmedJoiningDate() != null) {
                candidate.setProposedJoiningDate(request.getConfirmedJoiningDate());
            }
            candidateRepository.save(candidate);

            // Update signature approval
            approval.setStatus(SignatureApproval.ApprovalStatus.SIGNED);
            approval.setSignedAt(LocalDateTime.now());
            approval.setSignatureData(request.getSignatureData());
            approval.setSignatureMethod(SignatureApproval.SignatureMethod.TYPED);
            approval.setAuthenticationToken(null); // Invalidate token
            signatureApprovalRepository.save(approval);

            log.info("Offer accepted for candidate {}", candidateId);

            return PublicOfferResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .status(candidate.getStatus())
                    .offerAcceptedDate(candidate.getOfferAcceptedDate())
                    .tokenValid(false) // Token used
                    .build();
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Decline offer using token.
     */
    @Transactional
    public PublicOfferResponse declineOffer(String token, PublicOfferDeclineRequest request) {
        log.info("Declining offer via token for email: {}", request.getEmail());

        SignatureApproval approval = signatureApprovalRepository.findByAuthenticationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired offer link"));

        // Validate token expiry
        if (approval.getTokenExpiresAt() != null && approval.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("This offer link has expired");
        }

        // Validate email matches
        if (!approval.getSignerEmail().equalsIgnoreCase(request.getEmail())) {
            throw new IllegalArgumentException("Email does not match the offer recipient");
        }

        UUID tenantId = approval.getTenantId();
        TenantContext.setCurrentTenant(tenantId);

        try {
            UUID candidateId = extractCandidateIdFromApproval(approval);
            if (candidateId == null) {
                throw new IllegalStateException("Invalid offer configuration");
            }

            Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                    .orElseThrow(() -> new IllegalStateException("Candidate not found"));

            // Verify candidate is in correct status
            if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
                throw new IllegalStateException("Offer has already been " +
                        (candidate.getStatus() == Candidate.CandidateStatus.OFFER_ACCEPTED ? "accepted" : "declined"));
            }

            // Update candidate
            candidate.setStatus(Candidate.CandidateStatus.OFFER_DECLINED);
            candidate.setOfferDeclinedDate(LocalDate.now());
            candidate.setOfferDeclineReason(request.getDeclineReason());
            candidateRepository.save(candidate);

            // Update signature approval
            approval.setStatus(SignatureApproval.ApprovalStatus.DECLINED);
            approval.setDeclinedAt(LocalDateTime.now());
            approval.setDeclineReason(request.getDeclineReason());
            approval.setAuthenticationToken(null); // Invalidate token
            signatureApprovalRepository.save(approval);

            log.info("Offer declined for candidate {}", candidateId);

            return PublicOfferResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .status(candidate.getStatus())
                    .offerDeclinedDate(candidate.getOfferDeclinedDate())
                    .tokenValid(false) // Token used
                    .build();
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Extract candidateId from signature approval metadata.
     * The metadata is stored in the signature request.
     */
    private UUID extractCandidateIdFromApproval(SignatureApproval approval) {
        try {
            // We need to get the signature request to access the metadata
            // For now, we'll use the signer email to find the candidate
            String email = approval.getSignerEmail();
            if (email == null) return null;

            // Find candidate by email in the same tenant
            return candidateRepository.findByEmailAndTenantId(email, approval.getTenantId())
                    .map(Candidate::getId)
                    .orElse(null);
        } catch (Exception e) {
            log.error("Error extracting candidateId from approval", e);
            return null;
        }
    }
}
