package com.nulogic.domain.event.recruitment;

import com.nulogic.domain.event.DomainEvent;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.JobOpening;
import lombok.Getter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event raised when an offer's internal approval workflow completes and
 * the offer is ready to be extended to the candidate.
 *
 * <p>Consumed to notify the assigned recruiter and hiring manager.</p>
 */
@Getter
public class OfferReadyToSendEvent extends DomainEvent {

    private final UUID candidateId;
    private final String candidateName;
    private final UUID jobOpeningId;
    private final String jobTitle;
    private final UUID recruiterId;
    private final UUID hiringManagerId;

    public OfferReadyToSendEvent(Object source, Candidate candidate, JobOpening jobOpening) {
        super(source, candidate.getTenantId(), candidate.getId(), "Candidate");
        this.candidateId = candidate.getId();
        this.candidateName = candidate.getFullName();
        this.jobOpeningId = candidate.getJobOpeningId();
        this.jobTitle = jobOpening.getJobTitle();
        this.recruiterId = candidate.getAssignedRecruiterId();
        this.hiringManagerId = jobOpening.getHiringManagerId();
    }

    public static OfferReadyToSendEvent of(Object source, Candidate candidate, JobOpening jobOpening) {
        return new OfferReadyToSendEvent(source, candidate, jobOpening);
    }

    @Override
    public String getEventType() {
        return "OFFER_READY_TO_SEND";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateId", candidateId.toString());
        payload.put("candidateName", candidateName);
        payload.put("jobOpeningId", jobOpeningId.toString());
        payload.put("jobTitle", jobTitle);
        return payload;
    }
}
