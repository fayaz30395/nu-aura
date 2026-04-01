package com.hrms.api.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for offer response (accept/decline).
 * The candidateId is optional - if provided, must match the path parameter.
 * The response field is optional - it's inferred from the endpoint called.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfferResponseRequest {

    // Optional - if provided, must match the path parameter
    private UUID candidateId;

    // Optional - inferred from endpoint (accept-offer = ACCEPTED, decline-offer = DECLINED)
    private OfferResponse response;

    // For declined offers - reason for declining
    private String declineReason;

    // For accepted offers - candidate may confirm/negotiate joining date
    private LocalDate confirmedJoiningDate;

    // Digital signature data (if signing through the system)
    private String signatureData;

    public enum OfferResponse {
        ACCEPTED,
        DECLINED
    }
}
