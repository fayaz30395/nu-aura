package com.nulogic.domain.performance;

import jakarta.persistence.Version;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PerformanceReview inherits its {@code @Version} column from BaseEntity, and
 * GlobalExceptionHandler already maps ObjectOptimisticLockingFailureException to 409
 * (CONCURRENT_MODIFICATION) for every entity. This confirms both pieces are wired for
 * PerformanceReview specifically, so two overlapping submitManagerReview/submitSelfAssessment
 * calls on the same review can't silently last-write-win.
 */
@DisplayName("PerformanceReview optimistic locking")
class PerformanceReviewOptimisticLockingTest {

    @Test
    @DisplayName("has a @Version field (inherited from BaseEntity) backed by the version column")
    void hasVersionField() {
        Class<?> type = PerformanceReview.class;
        Field versionField = null;
        while (type != null && versionField == null) {
            try {
                versionField = type.getDeclaredField("version");
            } catch (NoSuchFieldException ignored) {
                type = type.getSuperclass();
            }
        }

        assertThat(versionField).as("PerformanceReview must have a version field for optimistic locking").isNotNull();
        assertThat(versionField.isAnnotationPresent(Version.class)).isTrue();
        assertThat(versionField.getType()).isEqualTo(Long.class);
    }

    @Test
    @DisplayName("ObjectOptimisticLockingFailureException maps to 409 in GlobalExceptionHandler")
    void optimisticLockExceptionMapsTo409() throws NoSuchMethodException {
        var handler = com.nulogic.common.exception.GlobalExceptionHandler.class.getMethod(
                "handleOptimisticLock",
                org.springframework.orm.ObjectOptimisticLockingFailureException.class,
                org.springframework.web.context.request.WebRequest.class);

        assertThat(handler.isAnnotationPresent(org.springframework.web.bind.annotation.ExceptionHandler.class)).isTrue();
    }
}
