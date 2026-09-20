package com.nulogic.domain.event.recruitment;

import com.nulogic.domain.event.DomainEvent;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.JobOpening;
import lombok.Getter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event raised when a candidate declines a job offer.
 *
 * <p>Consumed to notify the assigned recruiter and hiring manager.</p>
 */
@Getter
public class OfferDeclinedEvent extends DomainEvent {

    private final UUID candidateId;
    private final String candidateName;
    private final UUID jobOpeningId;
    private final String jobTitle;
    private final UUID recruiterId;
    private final UUID hiringManagerId;
    private final String declineReason;

    public OfferDeclinedEvent(Object source, Candidate candidate, JobOpening jobOpening, String declineReason) {
        super(source, candidate.getTenantId(), candidate.getId(), "Candidate");
        this.candidateId = candidate.getId();
        this.candidateName = candidate.getFullName();
        this.jobOpeningId = candidate.getJobOpeningId();
        this.jobTitle = jobOpening.getJobTitle();
        this.recruiterId = candidate.getAssignedRecruiterId();
        this.hiringManagerId = jobOpening.getHiringManagerId();
        this.declineReason = declineReason;
    }

    public static OfferDeclinedEvent of(Object source, Candidate candidate, JobOpening jobOpening, String declineReason) {
        return new OfferDeclinedEvent(source, candidate, jobOpening, declineReason);
    }

    @Override
    public String getEventType() {
        return "OFFER_DECLINED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateId", candidateId.toString());
        payload.put("candidateName", candidateName);
        payload.put("jobOpeningId", jobOpeningId.toString());
        payload.put("jobTitle", jobTitle);
        if (declineReason != null) {
            payload.put("declineReason", declineReason);
        }
        return payload;
    }
}
