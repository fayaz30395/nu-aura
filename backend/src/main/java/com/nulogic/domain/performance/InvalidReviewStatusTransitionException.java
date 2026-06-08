package com.nulogic.domain.performance;

/**
 * Raised when a performance review is asked to move between statuses in a way the workflow
 * state machine forbids (e.g. DRAFT → APPROVED without passing through SUBMITTED/IN_REVIEW).
 *
 * <p>Extends {@link IllegalStateException} so it maps to HTTP 409 Conflict via the global
 * exception handler (F-09): the request conflicts with the resource's current state.</p>
 */
public class InvalidReviewStatusTransitionException extends IllegalStateException {

    public InvalidReviewStatusTransitionException(PerformanceReview.ReviewStatus from,
                                                  PerformanceReview.ReviewStatus to) {
        super("Illegal performance-review status transition: " + from + " → " + to);
    }
}
