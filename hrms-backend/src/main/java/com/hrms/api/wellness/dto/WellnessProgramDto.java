package com.hrms.api.wellness.dto;

import com.hrms.domain.wellness.WellnessProgram.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WellnessProgramDto {

    private UUID id;
    private String name;
    private String description;
    private ProgramType programType;
    private ProgramCategory category;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer maxParticipants;
    private Integer currentParticipants;
    private Integer pointsReward;
    private BigDecimal budgetAmount;
    private Boolean isActive;
    private Boolean isFeatured;
    private String imageUrl;
    private String externalLink;
    private String instructions;
    private List<WellnessChallengeDto> challenges;
    private LocalDateTime createdAt;
}
