package com.hrms.application.performance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalibrationResponse {

    private UUID cycleId;
    private String cycleName;
    private int totalEmployees;
    private Map<Integer, Long> distribution; // {1: count, 2: count, ...5: count}
    private List<CalibrationEmployee> employees;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CalibrationEmployee {
        private UUID employeeId;
        private UUID reviewId;
        private String employeeName;
        private String department;
        private Integer selfRating;
        private Integer managerRating;
        private Integer finalRating;
        private boolean editable;
    }
}
