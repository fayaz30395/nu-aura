package com.hrms.api.publicapi.dto;

import com.hrms.domain.recruitment.Candidate.CandidateStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Public response DTO for offer portal.
 * Contains only information needed for candidates to view and respond to offers.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicOfferResponse {

    // Candidate info
    private UUID candidateId;
    private String candidateName;
    private String email;

    // Offer details
    private String jobTitle;
    private String offeredDesignation;
    private BigDecimal offeredCtc;
    private LocalDate proposedJoiningDate;
    private LocalDate offerExtendedDate;

    // Status
    private CandidateStatus status;
    private LocalDate offerAcceptedDate;
    private LocalDate offerDeclinedDate;

    // Offer letter
    private UUID offerLetterId;
    private String offerLetterUrl;
    private String offerLetterReferenceNumber;

    // E-signature token (for signing the offer)
    private String signatureToken;

    // Token validation
    private boolean tokenValid;
    private String errorMessage;

    // Company info (for branding)
    private String companyName;
}
