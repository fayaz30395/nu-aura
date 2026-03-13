package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.Interview;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class InterviewResponse {
    private UUID id;
    private UUID tenantId;
    private UUID candidateId;
    private String candidateName;
    private UUID jobOpeningId;
    private String jobTitle;
    private Interview.InterviewRound interviewRound;
    private Interview.InterviewType interviewType;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private UUID interviewerId;
    private String interviewerName;
    private String location;
    private String meetingLink;
    private Interview.InterviewStatus status;
    private String feedback;
    private Integer rating;
    private Interview.InterviewResult result;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;
    private Long version;
}
