package com.hrms.application.recruitment.listener;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.esignature.event.SignatureCompletedEvent;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.esignature.SignatureRequest;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Listens for signature completion events on offer letters and updates candidate status accordingly.
 * When a candidate signs (accepts) or declines the offer letter, this listener updates the
 * candidate's status to OFFER_ACCEPTED or OFFER_DECLINED.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OfferLetterSignatureListener {

    private final CandidateRepository candidateRepository;
    private final ObjectMapper objectMapper;

    @EventListener
    @Transactional
    public void handleSignatureCompleted(SignatureCompletedEvent event) {
        // Only process OFFER_LETTER documents
        if (event.getDocumentType() != SignatureRequest.DocumentType.OFFER_LETTER) {
            return;
        }

        log.info("Processing offer letter signature event: requestId={}, status={}",
                event.getSignatureRequestId(), event.getStatus());

        // Parse metadata to get candidateId
        UUID candidateId = extractCandidateIdFromMetadata(event.getMetadata());
        if (candidateId == null) {
            log.warn("Could not extract candidateId from metadata for signature request {}",
                    event.getSignatureRequestId());
            return;
        }

        // Set tenant context for the query
        TenantContext.setCurrentTenant(event.getTenantId());
        try {
            Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, event.getTenantId())
                    .orElse(null);

            if (candidate == null) {
                log.warn("Candidate {} not found for signature request {}",
                        candidateId, event.getSignatureRequestId());
                return;
            }

            // Ensure candidate is in OFFER_EXTENDED status before updating
            if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
                log.warn("Candidate {} is not in OFFER_EXTENDED status (current: {}), skipping update",
                        candidateId, candidate.getStatus());
                return;
            }

            switch (event.getStatus()) {
                case COMPLETED -> {
                    // Candidate signed the offer letter - accept offer
                    candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
                    candidate.setOfferAcceptedDate(LocalDate.now());
                    candidateRepository.save(candidate);
                    log.info("Candidate {} accepted offer via e-signature", candidateId);
                }
                case DECLINED -> {
                    // Candidate declined to sign - decline offer
                    candidate.setStatus(Candidate.CandidateStatus.OFFER_DECLINED);
                    candidate.setOfferDeclinedDate(LocalDate.now());
                    candidate.setOfferDeclineReason("Declined via e-signature");
                    candidateRepository.save(candidate);
                    log.info("Candidate {} declined offer via e-signature", candidateId);
                }
                default -> log.debug("Ignoring signature status {} for candidate {}",
                        event.getStatus(), candidateId);
            }
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Extracts candidateId from the signature request metadata JSON.
     * Expected format: {"candidateId":"uuid-here","letterId":"uuid-here"}
     */
    @Nullable
    private UUID extractCandidateIdFromMetadata(String metadata) {
        if (metadata == null || metadata.isBlank()) {
            return null;
        }

        try {
            JsonNode node = objectMapper.readTree(metadata);
            JsonNode candidateIdNode = node.get("candidateId");
            if (candidateIdNode != null && !candidateIdNode.isNull()) {
                return UUID.fromString(candidateIdNode.asText());
            }
        } catch (JsonProcessingException e) {
            log.error("Error parsing metadata JSON: {}", metadata, e);
        }

        return null;
    }
}
