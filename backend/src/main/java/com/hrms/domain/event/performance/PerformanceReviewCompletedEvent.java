package com.hrms.domain.event.performance;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when a performance review is marked as COMPLETED.
 *
 * <p>This event triggers downstream processes such as:</p>
 * <ul>
 *   <li>Draft salary revision generation (if an active compensation cycle requires performance ratings)</li>
 *   <li>Employee lifecycle Kafka event for external system synchronization</li>
 *   <li>Notification to HR/compensation team</li>
 * </ul>
 */
@Getter
public class PerformanceReviewCompletedEvent extends DomainEvent {

    private final UUID employeeId;
    private final UUID reviewId;
    private final UUID reviewCycleId;
    private final BigDecimal overallRating;
    private final String reviewerName;
    private final LocalDateTime completedAt;

    public PerformanceReviewCompletedEvent(Object source,
                                           UUID tenantId,
                                           UUID employeeId,
                                           UUID reviewId,
                                           UUID reviewCycleId,
                                           BigDecimal overallRating,
                                           String reviewerName,
                                           LocalDateTime completedAt) {
        super(source, tenantId, reviewId, "PerformanceReview");
        this.employeeId = employeeId;
        this.reviewId = reviewId;
        this.reviewCycleId = reviewCycleId;
        this.overallRating = overallRating;
        this.reviewerName = reviewerName;
        this.completedAt = completedAt;
    }

    /**
     * Factory method for creating the event.
     */
    public static PerformanceReviewCompletedEvent of(Object source,
                                                     UUID tenantId,
                                                     UUID employeeId,
                                                     UUID reviewId,
                                                     UUID reviewCycleId,
                                                     BigDecimal overallRating,
                                                     String reviewerName,
                                                     LocalDateTime completedAt) {
        return new PerformanceReviewCompletedEvent(source, tenantId, employeeId,
                reviewId, reviewCycleId, overallRating, reviewerName, completedAt);
    }

    @Override
    public String getEventType() {
        return "PERFORMANCE_REVIEW_COMPLETED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("employeeId", employeeId.toString());
        payload.put("reviewId", reviewId.toString());
        if (reviewCycleId != null) {
            payload.put("reviewCycleId", reviewCycleId.toString());
        }
        if (overallRating != null) {
            payload.put("overallRating", overallRating.toString());
        }
        if (reviewerName != null) {
            payload.put("reviewerName", reviewerName);
        }
        if (completedAt != null) {
            payload.put("completedAt", completedAt.toString());
        }
        return payload;
    }
}
