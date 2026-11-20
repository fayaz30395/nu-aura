package com.nulogic.application.recruitment.service;

import com.nulogic.domain.recruitment.Applicant;
import com.nulogic.domain.recruitment.ApplicationStatus;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.infrastructure.recruitment.repository.ApplicantRepository;
import com.nulogic.common.util.TenantTimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * H-016: when the offer lifecycle moves a Candidate directly, bring the candidate's live
 * applicants (pipeline board) along. Writes applicant fields directly and never calls
 * ApplicantService, so ApplicantService.syncCandidate cannot be re-triggered. Runs in the caller's tx.
 */
@Component
@RequiredArgsConstructor
public class ApplicantOfferSync {

    private final ApplicantRepository applicantRepository;
    private final TenantTimeService tenantTimeService;

    public void sync(UUID candidateId, UUID tenantId, Candidate.CandidateStatus candidateStatus) {
        ApplicationStatus target = switch (candidateStatus) {
            case OFFER_EXTENDED -> ApplicationStatus.OFFERED;
            case OFFER_ACCEPTED -> ApplicationStatus.ACCEPTED;
            case OFFER_DECLINED -> ApplicationStatus.WITHDRAWN;
            default -> null;
        };
        if (target == null) {
            return;
        }
        List<Applicant> changed = applicantRepository.findByCandidateIdAndTenantId(candidateId, tenantId).stream()
                .filter(a -> a.getStatus() != target && isLive(a.getStatus()))
                .toList();
        for (Applicant a : changed) {
            a.setStatus(target);
            a.setCurrentStageEnteredAt(tenantTimeService.now(tenantId));
        }
        if (!changed.isEmpty()) {
            applicantRepository.saveAll(changed);
        }
    }

    private static boolean isLive(ApplicationStatus status) {
        return status != ApplicationStatus.REJECTED
                && status != ApplicationStatus.WITHDRAWN
                && status != ApplicationStatus.ACCEPTED;
    }
}
