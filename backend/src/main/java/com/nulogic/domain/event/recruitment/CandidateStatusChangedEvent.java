package com.nulogic.domain.event.recruitment;

import com.nulogic.domain.event.DomainEvent;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.JobOpening;
import lombok.Getter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event raised when a candidate's pipeline stage/status changes.
 *
 * <p>Consumed to notify the assigned recruiter and hiring manager.</p>
 */
@Getter
public class CandidateStatusChangedEvent extends DomainEvent {

    private final UUID candidateId;
    private final String candidateName;
    private final UUID jobOpeningId;
    private final String jobTitle;
    private final UUID recruiterId;
    private final UUID hiringManagerId;
    private final Candidate.CandidateStatus oldStatus;
    private final Candidate.CandidateStatus newStatus;

    public CandidateStatusChangedEvent(Object source, Candidate candidate, JobOpening jobOpening,
                                        Candidate.CandidateStatus oldStatus, Candidate.CandidateStatus newStatus) {
        super(source, candidate.getTenantId(), candidate.getId(), "Candidate");
        this.candidateId = candidate.getId();
        this.candidateName = candidate.getFullName();
        this.jobOpeningId = candidate.getJobOpeningId();
        this.jobTitle = jobOpening.getJobTitle();
        this.recruiterId = candidate.getAssignedRecruiterId();
        this.hiringManagerId = jobOpening.getHiringManagerId();
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
    }

    public static CandidateStatusChangedEvent of(Object source, Candidate candidate, JobOpening jobOpening,
                                                  Candidate.CandidateStatus oldStatus, Candidate.CandidateStatus newStatus) {
        return new CandidateStatusChangedEvent(source, candidate, jobOpening, oldStatus, newStatus);
    }

    @Override
    public String getEventType() {
        return "CANDIDATE_STATUS_CHANGED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateId", candidateId.toString());
        payload.put("candidateName", candidateName);
        payload.put("jobOpeningId", jobOpeningId.toString());
        payload.put("jobTitle", jobTitle);
        payload.put("oldStatus", oldStatus != null ? oldStatus.name() : null);
        payload.put("newStatus", newStatus != null ? newStatus.name() : null);
        return payload;
    }
}
