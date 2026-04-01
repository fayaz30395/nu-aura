package com.hrms.api.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftPatternResponse {
    private UUID id;
    private String name;
    private String description;
    private String rotationType;
    private String pattern;
    private Integer cycleDays;
    private Boolean isActive;
    private String colorCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
