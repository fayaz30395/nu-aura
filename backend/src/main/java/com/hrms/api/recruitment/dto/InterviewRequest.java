package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.Interview;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class InterviewRequest {
    private UUID candidateId;
    private UUID jobOpeningId;
    private Interview.InterviewRound interviewRound;
    private Interview.InterviewType interviewType;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private UUID interviewerId;
    private String location;
    private String meetingLink;
    private Interview.InterviewStatus status;
    private String feedback;
    private Integer rating;
    private Interview.InterviewResult result;
    private String notes;
}
