package com.hrms.common.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the soft-delete behaviour defined in {@link BaseEntity}.
 *
 * <p>Verifies:
 * <ul>
 *   <li>softDelete() sets isDeleted=true and populates deletedAt</li>
 *   <li>restore() clears isDeleted and deletedAt</li>
 *   <li>Default state: isDeleted=false, deletedAt=null</li>
 * </ul>
 */
class BaseEntitySoftDeleteTest {

    /**
     * Concrete subclass used for testing the abstract BaseEntity.
     */
    private static class TestEntity extends BaseEntity {
        TestEntity() {
            super();
        }
    }

    @Nested
    @DisplayName("softDelete()")
    class SoftDeleteTests {

        @Test
        @DisplayName("should set isDeleted to true and populate deletedAt")
        void shouldMarkAsDeleted() {
            TestEntity entity = new TestEntity();
            assertThat(entity.isDeleted()).isFalse();
            assertThat(entity.getDeletedAt()).isNull();

            LocalDateTime before = LocalDateTime.now();
            entity.softDelete();
            LocalDateTime after = LocalDateTime.now();

            assertThat(entity.isDeleted()).isTrue();
            assertThat(entity.getDeletedAt()).isNotNull();
            assertThat(entity.getDeletedAt()).isAfterOrEqualTo(before);
            assertThat(entity.getDeletedAt()).isBeforeOrEqualTo(after);
        }

        @Test
        @DisplayName("should be idempotent — calling twice updates deletedAt")
        void shouldBeIdempotent() {
            TestEntity entity = new TestEntity();
            entity.softDelete();
            LocalDateTime firstDeletedAt = entity.getDeletedAt();

            // Small delay to ensure timestamp changes
            entity.softDelete();

            assertThat(entity.isDeleted()).isTrue();
            assertThat(entity.getDeletedAt()).isAfterOrEqualTo(firstDeletedAt);
        }
    }

    @Nested
    @DisplayName("restore()")
    class RestoreTests {

        @Test
        @DisplayName("should clear isDeleted and deletedAt")
        void shouldRestoreEntity() {
            TestEntity entity = new TestEntity();
            entity.softDelete();

            assertThat(entity.isDeleted()).isTrue();
            assertThat(entity.getDeletedAt()).isNotNull();

            entity.restore();

            assertThat(entity.isDeleted()).isFalse();
            assertThat(entity.getDeletedAt()).isNull();
        }

        @Test
        @DisplayName("should be safe to call on non-deleted entity")
        void shouldBeNoOpOnNonDeleted() {
            TestEntity entity = new TestEntity();

            entity.restore();

            assertThat(entity.isDeleted()).isFalse();
            assertThat(entity.getDeletedAt()).isNull();
        }
    }

    @Nested
    @DisplayName("Default state")
    class DefaultStateTests {

        @Test
        @DisplayName("new entity should not be deleted")
        void newEntityShouldNotBeDeleted() {
            TestEntity entity = new TestEntity();

            assertThat(entity.isDeleted()).isFalse();
            assertThat(entity.getDeletedAt()).isNull();
        }
    }
}
