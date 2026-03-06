package com.hrms.api.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompletionStatsResponse {

    private UUID courseId;
    private long totalEnrolled;
    private long completedCount;
    private double avgProgress;

    public double getCompletionRate() {
        if (totalEnrolled == 0) return 0.0;
        return (double) completedCount / totalEnrolled * 100.0;
    }
}
