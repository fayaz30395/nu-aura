package com.nulogic.domain.performance;

import com.nulogic.domain.performance.PerformanceReview.ReviewStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Guards the performance-review workflow state machine (rank #3 completeness fix).
 * Prevents illegal status jumps (e.g. DRAFT → COMPLETED) from corrupting appraisal records.
 */
@DisplayName("PerformanceReview status state machine")
class PerformanceReviewStateMachineTest {

    private static PerformanceReview reviewIn(ReviewStatus status) {
        PerformanceReview r = new PerformanceReview();
        r.setStatus(status);
        return r;
    }

    @Nested
    @DisplayName("legal transitions are allowed")
    class Legal {
        @ParameterizedTest(name = "{0} → {1}")
        @CsvSource({
                "DRAFT,SUBMITTED",
                "SUBMITTED,IN_REVIEW",
                "SUBMITTED,COMPLETED",
                "SUBMITTED,DRAFT",          // revert for rework
                "IN_REVIEW,COMPLETED",
                "IN_REVIEW,SUBMITTED",      // revert for rework
                "COMPLETED,ACKNOWLEDGED",
        })
        void allowsLegalTransition(ReviewStatus from, ReviewStatus to) {
            PerformanceReview review = reviewIn(from);
            assertThat(review.canTransitionTo(to)).isTrue();
            assertThatCode(() -> review.transitionTo(to)).doesNotThrowAnyException();
            assertThat(review.getStatus()).isEqualTo(to);
        }
    }

    @Nested
    @DisplayName("illegal transitions are rejected")
    class Illegal {
        @ParameterizedTest(name = "{0} ✗→ {1}")
        @CsvSource({
                "DRAFT,IN_REVIEW",
                "DRAFT,COMPLETED",
                "DRAFT,ACKNOWLEDGED",       // the headline bug: skip the whole workflow
                "SUBMITTED,ACKNOWLEDGED",
                "IN_REVIEW,DRAFT",
                "IN_REVIEW,ACKNOWLEDGED",
                "COMPLETED,DRAFT",
                "COMPLETED,SUBMITTED",
                "COMPLETED,IN_REVIEW",
                "ACKNOWLEDGED,DRAFT",
                "ACKNOWLEDGED,COMPLETED",
        })
        void rejectsIllegalTransition(ReviewStatus from, ReviewStatus to) {
            PerformanceReview review = reviewIn(from);
            assertThat(review.canTransitionTo(to)).isFalse();
            assertThatThrownBy(() -> review.transitionTo(to))
                    .isInstanceOf(InvalidReviewStatusTransitionException.class)
                    .hasMessageContaining(from.name())
                    .hasMessageContaining(to.name());
            // status is unchanged after a rejected transition
            assertThat(review.getStatus()).isEqualTo(from);
        }
    }

    @Test
    @DisplayName("same-status transition is an idempotent no-op")
    void sameStatusIsNoOp() {
        PerformanceReview review = reviewIn(ReviewStatus.SUBMITTED);
        assertThat(review.canTransitionTo(ReviewStatus.SUBMITTED)).isTrue();
        assertThatCode(() -> review.transitionTo(ReviewStatus.SUBMITTED)).doesNotThrowAnyException();
        assertThat(review.getStatus()).isEqualTo(ReviewStatus.SUBMITTED);
    }

    @Test
    @DisplayName("null target is never a legal transition")
    void nullTargetRejected() {
        assertThat(reviewIn(ReviewStatus.DRAFT).canTransitionTo(null)).isFalse();
    }
}
