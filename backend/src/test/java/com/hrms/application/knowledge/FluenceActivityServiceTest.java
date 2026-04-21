package com.hrms.application.knowledge;

import com.hrms.application.knowledge.service.FluenceActivityService;
import com.hrms.domain.knowledge.FluenceActivity;
import com.hrms.infrastructure.knowledge.repository.FluenceActivityRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FluenceActivityService}.
 *
 * Covers the F-02 regression: feed endpoint must cleanly return an empty page
 * when the database has zero rows (no 500, no NPE).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FluenceActivityService — F-02 regression")
class FluenceActivityServiceTest {

    @Mock
    private FluenceActivityRepository fluenceActivityRepository;

    @InjectMocks
    private FluenceActivityService fluenceActivityService;

    @Test
    @DisplayName("getActivityFeed returns empty page when DB has zero rows (no exception)")
    void getActivityFeed_returnsEmptyPage_whenNoRows() {
        UUID tenantId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        Page<FluenceActivity> empty = new PageImpl<>(Collections.emptyList(), pageable, 0);
        when(fluenceActivityRepository
                .findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(eq(tenantId), any(Pageable.class)))
                .thenReturn(empty);

        Page<FluenceActivity> result = fluenceActivityService.getActivityFeed(tenantId, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("getActivityFeedByType returns empty page when no matching content type")
    void getActivityFeedByType_returnsEmptyPage_whenNoRows() {
        UUID tenantId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        Page<FluenceActivity> empty = new PageImpl<>(Collections.emptyList(), pageable, 0);
        when(fluenceActivityRepository
                .findByTenantIdAndContentTypeAndIsDeletedFalseOrderByCreatedAtDesc(
                        eq(tenantId), eq("WIKI"), any(Pageable.class)))
                .thenReturn(empty);

        Page<FluenceActivity> result =
                fluenceActivityService.getActivityFeedByType(tenantId, "WIKI", pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("getUserActivity returns empty page when user has no activity")
    void getUserActivity_returnsEmptyPage_whenNoRows() {
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        Page<FluenceActivity> empty = new PageImpl<>(Collections.emptyList(), pageable, 0);
        when(fluenceActivityRepository
                .findByTenantIdAndActorIdAndIsDeletedFalseOrderByCreatedAtDesc(
                        eq(tenantId), eq(userId), any(Pageable.class)))
                .thenReturn(empty);

        Page<FluenceActivity> result =
                fluenceActivityService.getUserActivity(tenantId, userId, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
    }
}
