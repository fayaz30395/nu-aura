package com.hrms.api.wellness.dto;

import com.hrms.domain.wellness.HealthLog.MetricType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthLogDto {

    private UUID id;
    private UUID employeeId;
    private UUID participantId;
    private UUID challengeId;
    private LocalDate logDate;
    private MetricType metricType;
    private Double value;
    private String unit;
    private String source;
    private String notes;
    private Boolean verified;
    private Integer pointsAwarded;
    private LocalDateTime loggedAt;
}
