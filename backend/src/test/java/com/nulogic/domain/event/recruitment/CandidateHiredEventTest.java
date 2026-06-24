package com.nulogic.domain.event.recruitment;

import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.JobOpening;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CandidateHiredEventTest {

    @Test
    void ofCopiesCandidateAndJobOpeningDataIntoEvent() {
        Object source = new Object();
        UUID tenantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();
        UUID departmentId = UUID.randomUUID();
        Candidate candidate = candidate(tenantId, candidateId, jobOpeningId);
        JobOpening jobOpening = jobOpening(departmentId, JobOpening.EmploymentType.FULL_TIME);

        CandidateHiredEvent event = CandidateHiredEvent.of(source, candidate, jobOpening);

        assertThat(event.getSource()).isSameAs(source);
        assertThat(event.getTenantId()).isEqualTo(tenantId);
        assertThat(event.getAggregateId()).isEqualTo(candidateId);
        assertThat(event.getAggregateType()).isEqualTo("Candidate");
        assertThat(event.getEventType()).isEqualTo("CANDIDATE_HIRED");
        assertThat(event.getEventId()).isNotBlank();
        assertThat(event.getOccurredAt()).isNotNull();
        assertThat(event.getCandidateName()).isEqualTo("Ada Lovelace");
        assertThat(event.getJobTitle()).isEqualTo("Senior Engineer");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();
        assertThat(payload)
                .containsEntry("candidateId", candidateId.toString())
                .containsEntry("candidateName", "Ada Lovelace")
                .containsEntry("email", "ada@example.test")
                .containsEntry("phone", "+919876543210")
                .containsEntry("jobOpeningId", jobOpeningId.toString())
                .containsEntry("jobTitle", "Senior Engineer")
                .containsEntry("offeredDesignation", "Principal Engineer")
                .containsEntry("offeredCtc", new BigDecimal("4200000"))
                .containsEntry("proposedJoiningDate", "2026-08-01")
                .containsEntry("departmentId", departmentId.toString())
                .containsEntry("employmentType", "FULL_TIME");
    }

    @Test
    void payloadOmitsNullableDepartmentAndEmploymentType() {
        Candidate candidate = candidate(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        JobOpening jobOpening = jobOpening(null, null);

        CandidateHiredEvent event = new CandidateHiredEvent(this, candidate, jobOpening);

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();
        assertThat(payload)
                .doesNotContainKeys("departmentId", "employmentType")
                .containsEntry("jobTitle", "Senior Engineer");
    }

    private static Candidate candidate(UUID tenantId, UUID candidateId, UUID jobOpeningId) {
        Candidate candidate = new Candidate();
        candidate.setTenantId(tenantId);
        candidate.setId(candidateId);
        candidate.setJobOpeningId(jobOpeningId);
        candidate.setFirstName("Ada");
        candidate.setLastName("Lovelace");
        candidate.setEmail("ada@example.test");
        candidate.setPhone("+919876543210");
        candidate.setOfferedDesignation("Principal Engineer");
        candidate.setOfferedCtc(new BigDecimal("4200000"));
        candidate.setProposedJoiningDate(LocalDate.of(2026, 8, 1));
        return candidate;
    }

    private static JobOpening jobOpening(UUID departmentId, JobOpening.EmploymentType employmentType) {
        JobOpening jobOpening = new JobOpening();
        jobOpening.setJobTitle("Senior Engineer");
        jobOpening.setDepartmentId(departmentId);
        jobOpening.setEmploymentType(employmentType);
        return jobOpening;
    }
}
