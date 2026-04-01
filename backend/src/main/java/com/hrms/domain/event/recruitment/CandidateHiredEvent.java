package com.hrms.domain.event.recruitment;

import com.hrms.domain.event.DomainEvent;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Domain event raised when a candidate is hired and moves to JOINED stage.
 *
 * <p>This event triggers downstream processes such as:</p>
 * <ul>
 *   <li>Employee creation from candidate data</li>
 *   <li>Onboarding checklist generation</li>
 *   <li>System provisioning (email, access, etc.)</li>
 *   <li>Welcome communications</li>
 * </ul>
 */
@Getter
public class CandidateHiredEvent extends DomainEvent {

    private final UUID candidateId;
    private final String candidateName;
    private final String email;
    private final String phone;
    private final UUID jobOpeningId;
    private final String jobTitle;
    private final String offeredDesignation;
    private final BigDecimal offeredCtc;
    private final LocalDate proposedJoiningDate;
    private final UUID departmentId;
    private final JobOpening.EmploymentType employmentType;

    public CandidateHiredEvent(Object source, Candidate candidate, JobOpening jobOpening) {
        super(source, candidate.getTenantId(), candidate.getId(), "Candidate");
        this.candidateId = candidate.getId();
        this.candidateName = candidate.getFullName();
        this.email = candidate.getEmail();
        this.phone = candidate.getPhone();
        this.jobOpeningId = candidate.getJobOpeningId();
        this.jobTitle = jobOpening.getJobTitle();
        this.offeredDesignation = candidate.getOfferedDesignation();
        this.offeredCtc = candidate.getOfferedCtc();
        this.proposedJoiningDate = candidate.getProposedJoiningDate();
        this.departmentId = jobOpening.getDepartmentId();
        this.employmentType = jobOpening.getEmploymentType();
    }

    @Override
    public String getEventType() {
        return "CANDIDATE_HIRED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("candidateId", candidateId.toString());
        payload.put("candidateName", candidateName);
        payload.put("email", email);
        payload.put("phone", phone);
        payload.put("jobOpeningId", jobOpeningId.toString());
        payload.put("jobTitle", jobTitle);
        payload.put("offeredDesignation", offeredDesignation);
        payload.put("offeredCtc", offeredCtc);
        payload.put("proposedJoiningDate", proposedJoiningDate.toString());
        if (departmentId != null) {
            payload.put("departmentId", departmentId.toString());
        }
        if (employmentType != null) {
            payload.put("employmentType", employmentType.name());
        }
        return payload;
    }

    /**
     * Factory method for creating the event.
     */
    public static CandidateHiredEvent of(Object source, Candidate candidate, JobOpening jobOpening) {
        return new CandidateHiredEvent(source, candidate, jobOpening);
    }
}
