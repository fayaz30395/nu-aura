package com.nulogic.api.lms.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * A published learning path plus the calling employee's own progress through it.
 *
 * <p>Field names are the contract rendered by {@code frontend/app/learning/paths/page.tsx}
 * and its detail page — do not rename them without changing both.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningPathSummaryResponse {

    private UUID id;
    private String title;
    private String description;
    /** {@code LearningPath.DifficultyLevel} name: BEGINNER | INTERMEDIATE | ADVANCED | EXPERT. */
    private String difficulty;
    /** {@code LearningPath.estimatedHours}. */
    private Integer durationHours;
    private int courseCount;
    private long totalEnrollments;
    private String thumbnailUrl;

    /**
     * Explicit @JsonProperty: Lombok generates {@code isEnrolled()} for a boolean named
     * {@code isEnrolled}, which Jackson would serialise as {@code "enrolled"} — the UI reads
     * {@code path.isEnrolled} and would silently never show progress or the Continue button.
     */
    @JsonProperty("isEnrolled")
    private boolean isEnrolled;

    private int progressPercentage;
    /** NOT_STARTED | IN_PROGRESS | COMPLETED. */
    private String status;
}
