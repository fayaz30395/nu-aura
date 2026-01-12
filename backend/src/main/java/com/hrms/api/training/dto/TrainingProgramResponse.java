package com.hrms.api.training.dto;

import com.hrms.domain.training.TrainingProgram;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TrainingProgramResponse {

    private UUID id;
    private UUID tenantId;
    private String programCode;
    private String programName;
    private String description;
    private TrainingProgram.TrainingCategory category;
    private TrainingProgram.DeliveryMode deliveryMode;
    private UUID instructorId;
    private String instructorName;
    private Integer durationHours;
    private Integer maxParticipants;
    private Integer currentEnrollments;
    private LocalDate startDate;
    private LocalDate endDate;
    private String location;
    private BigDecimal cost;
    private TrainingProgram.ProgramStatus status;
    private String prerequisites;
    private String learningObjectives;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
