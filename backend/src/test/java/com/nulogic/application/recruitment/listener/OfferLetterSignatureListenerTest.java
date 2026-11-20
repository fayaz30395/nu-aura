package com.nulogic.application.recruitment.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.application.esignature.event.SignatureCompletedEvent;
import com.nulogic.application.recruitment.service.ApplicantOfferSync;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.esignature.SignatureRequest;
import com.nulogic.domain.recruitment.Applicant;
import com.nulogic.domain.recruitment.ApplicationStatus;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.infrastructure.recruitment.repository.ApplicantRepository;
import com.nulogic.infrastructure.recruitment.repository.CandidateRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("OfferLetterSignatureListener Tests")
class OfferLetterSignatureListenerTest {

    private final CandidateRepository candidateRepository = mock(CandidateRepository.class);
    private final ApplicantRepository applicantRepository = mock(ApplicantRepository.class);
    private final TenantTimeService tenantTimeService = mock(TenantTimeService.class);
    private final OfferLetterSignatureListener listener = new OfferLetterSignatureListener(
            candidateRepository, new ObjectMapper(), tenantTimeService,
            new ApplicantOfferSync(applicantRepository, tenantTimeService));

    private Applicant applicantFor(UUID tenantId, UUID candidateId, ApplicationStatus status) {
        Applicant a = new Applicant();
        a.setId(UUID.randomUUID());
        a.setTenantId(tenantId);
        a.setCandidateId(candidateId);
        a.setStatus(status);
        return a;
    }

    private SignatureCompletedEvent event(UUID tenantId, UUID candidateId, SignatureRequest.SignatureStatus status) {
        return new SignatureCompletedEvent(this, UUID.randomUUID(), tenantId,
                SignatureRequest.DocumentType.OFFER_LETTER, status, "{\"candidateId\":\"" + candidateId + "\"}");
    }

    private Candidate offerCandidate(UUID tenantId, UUID candidateId) {
        Candidate c = new Candidate();
        c.setId(candidateId);
        c.setTenantId(tenantId);
        c.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
        when(candidateRepository.findByIdAndTenantId(candidateId, tenantId)).thenReturn(Optional.of(c));
        when(tenantTimeService.now(any())).thenReturn(LocalDateTime.of(2026, 1, 1, 10, 0));
        return c;
    }

    @Test
    @DisplayName("signature COMPLETED accepts candidate and moves applicants to ACCEPTED")
    void signedOfferAcceptsApplicants() {
        UUID tenantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        Candidate c = offerCandidate(tenantId, candidateId);
        Applicant a = applicantFor(tenantId, candidateId, ApplicationStatus.OFFERED);
        when(applicantRepository.findByCandidateIdAndTenantId(candidateId, tenantId)).thenReturn(List.of(a));

        listener.handleSignatureCompleted(event(tenantId, candidateId, SignatureRequest.SignatureStatus.COMPLETED));

        assertThat(c.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_ACCEPTED);
        assertThat(a.getStatus()).isEqualTo(ApplicationStatus.ACCEPTED);
    }

    @Test
    @DisplayName("signature DECLINED declines candidate and moves applicants to WITHDRAWN")
    void declinedSignatureWithdrawsApplicants() {
        UUID tenantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        Candidate c = offerCandidate(tenantId, candidateId);
        Applicant a = applicantFor(tenantId, candidateId, ApplicationStatus.OFFERED);
        when(applicantRepository.findByCandidateIdAndTenantId(candidateId, tenantId)).thenReturn(List.of(a));

        listener.handleSignatureCompleted(event(tenantId, candidateId, SignatureRequest.SignatureStatus.DECLINED));

        assertThat(c.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_DECLINED);
        assertThat(a.getStatus()).isEqualTo(ApplicationStatus.WITHDRAWN);
    }
}
