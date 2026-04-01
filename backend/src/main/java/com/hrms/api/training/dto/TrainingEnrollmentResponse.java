package com.hrms.api.training.dto;

import com.hrms.domain.training.TrainingEnrollment;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TrainingEnrollmentResponse {

    private UUID id;
    private UUID tenantId;
    private UUID programId;
    private String programName;
    private UUID employeeId;
    private String employeeName;
    private LocalDate enrollmentDate;
    private LocalDate completionDate;
    private TrainingEnrollment.EnrollmentStatus status;
    private Integer scorePercentage;
    private String feedback;
    private String certificateUrl;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
