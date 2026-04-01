package com.hrms.api.training.dto;

import com.hrms.domain.training.TrainingProgram;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class TrainingProgramRequest {

    @NotBlank(message = "Program code is required")
    private String programCode;

    @NotBlank(message = "Program name is required")
    private String programName;

    private String description;

    @NotNull(message = "Category is required")
    private TrainingProgram.TrainingCategory category;

    @NotNull(message = "Delivery mode is required")
    private TrainingProgram.DeliveryMode deliveryMode;

    private UUID instructorId;

    private Integer durationHours;

    private Integer maxParticipants;

    private LocalDate startDate;

    private LocalDate endDate;

    private String location;

    private BigDecimal cost;

    private TrainingProgram.ProgramStatus status;

    private String prerequisites;

    private String learningObjectives;
}
