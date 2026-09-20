package com.nulogic.domain.event.recruitment;

import com.nulogic.domain.event.DomainEvent;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.JobOpening;
import lombok.Getter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event raised when a candidate accepts a job offer.
 *
 * <p>Consumed to notify the assigned recruiter and hiring manager.</p>
 */
@Getter
public class OfferAcceptedEvent extends DomainEvent {

    private final UUID candidateId;
    private final String candidateName;
    private final UUID jobOpeningId;
    private final String jobTitle;
    private final UUID recruiterId;
    private final UUID hiringManagerId;
    private final LocalDate confirmedJoiningDate;

    public OfferAcceptedEvent(Object source, Candidate candidate, JobOpening jobOpening) {
        super(source, candidate.getTenantId(), candidate.getId(), "Candidate");
        this.candidateId = candidate.getId();
        this.candidateName = candidate.getFullName();
        this.jobOpeningId = candidate.getJobOpeningId();
        this.jobTitle = jobOpening.getJobTitle();
        this.recruiterId = candidate.getAssignedRecruiterId();
        this.hiringManagerId = jobOpening.getHiringManagerId();
        this.confirmedJoiningDate = candidate.getProposedJoiningDate();
    }

    public static OfferAcceptedEvent of(Object source, Candidate candidate, JobOpening jobOpening) {
        return new OfferAcceptedEvent(source, candidate, jobOpening);
    }

    @Override
    public String getEventType() {
        return "OFFER_ACCEPTED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateId", candidateId.toString());
        payload.put("candidateName", candidateName);
        payload.put("jobOpeningId", jobOpeningId.toString());
        payload.put("jobTitle", jobTitle);
        if (confirmedJoiningDate != null) {
            payload.put("confirmedJoiningDate", confirmedJoiningDate.toString());
        }
        return payload;
    }
}
