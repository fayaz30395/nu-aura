package com.hrms.api.admin.controller;

import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.kafka.FailedKafkaEvent;
import com.hrms.domain.kafka.FailedKafkaEvent.FailedEventStatus;
import com.hrms.infrastructure.kafka.consumer.DeadLetterHandler;
import com.hrms.infrastructure.kafka.repository.FailedKafkaEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;
import java.util.Map;

import static com.hrms.common.security.Permission.SYSTEM_ADMIN;

/**
 * REST controller for managing Kafka Dead Letter Queue events.
 *
 * <p>All endpoints are restricted to {@code SYSTEM_ADMIN} — SuperAdmin role only.
 * Provides visibility into and control over messages that exhausted all Kafka retry
 * attempts and landed in a dead letter topic (DLT).
 *
 * <h3>Endpoints</h3>
 * <ul>
 *   <li>{@code GET  /api/v1/admin/kafka/failed-events}         — paginated list of DLT events</li>
 *   <li>{@code GET  /api/v1/admin/kafka/failed-events/{id}}    — single event detail</li>
 *   <li>{@code POST /api/v1/admin/kafka/replay/{id}}           — replay a PENDING_REPLAY event</li>
 *   <li>{@code POST /api/v1/admin/kafka/ignore/{id}}           — mark an event IGNORED</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/admin/kafka")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Kafka Admin", description = "Dead Letter Queue management — SuperAdmin only")
public class KafkaAdminController {

    private final DeadLetterHandler deadLetterHandler;
    private final FailedKafkaEventRepository failedKafkaEventRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Query endpoints
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns a paginated list of failed Kafka events filtered by status.
     * Defaults to {@code PENDING_REPLAY} if no status is supplied.
     */
    @GetMapping("/failed-events")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(
            summary = "List failed Kafka events",
            description = "Paginated list of DLT events. Filter by status: PENDING_REPLAY (default), REPLAYED, IGNORED."
    )
    public ResponseEntity<Page<FailedKafkaEvent>> listFailedEvents(
            @Parameter(description = "Filter by status. Omit for PENDING_REPLAY.")
            @RequestParam(required = false, defaultValue = "PENDING_REPLAY") FailedEventStatus status,
            @PageableDefault(size = 25, sort = "createdAt") Pageable pageable) {

        Page<FailedKafkaEvent> page = failedKafkaEventRepository
                .findByStatusOrderByCreatedAtDesc(status, pageable);
        return ResponseEntity.ok(page);
    }

    /**
     * Returns a single failed Kafka event by its primary key.
     * Returns 404 if not found.
     */
    @GetMapping("/failed-events/{id}")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Get failed Kafka event detail")
    public ResponseEntity<FailedKafkaEvent> getFailedEvent(
            @Parameter(description = "UUID of the failed event record")
            @PathVariable UUID id) {

        return failedKafkaEventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Action endpoints
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Replays a {@code PENDING_REPLAY} failed event by republishing its stored payload
     * to the configured {@code targetTopic}.
     *
     * <p>Returns:
     * <ul>
     *   <li>{@code 204 No Content} — replay published successfully.</li>
     *   <li>{@code 404 Not Found}  — event does not exist.</li>
     *   <li>{@code 409 Conflict}   — event is not in {@code PENDING_REPLAY} status, or
     *       has exceeded the safe replay count (suspected poison pill).</li>
     * </ul>
     */
    @PostMapping("/replay/{id}")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(
            summary = "Replay a dead-lettered Kafka event",
            description = "Republishes the stored payload to the original topic. " +
                    "Only PENDING_REPLAY events can be replayed. " +
                    "Events that have been replayed more than 3 times are flagged as poison pills and blocked."
    )
    public ResponseEntity<Void> replayFailedEvent(
            @Parameter(description = "UUID of the failed event to replay")
            @PathVariable UUID id) {

        UUID currentUserId = SecurityContext.getCurrentUserId();
        log.info("[KafkaAdmin] Replay requested for event={} by admin={}", id, currentUserId);

        try {
            deadLetterHandler.replayFailedEvent(id, currentUserId);
            return ResponseEntity.noContent().build();

        } catch (IllegalArgumentException e) {
            log.warn("[KafkaAdmin] Replay failed — event not found: {}", id);
            return ResponseEntity.notFound().build();

        } catch (IllegalStateException e) {
            // Either wrong status or poison-pill guard triggered
            log.warn("[KafkaAdmin] Replay rejected for event={}: {}", id, e.getMessage());
            return ResponseEntity.status(409).build();
        }
    }

    /**
     * Returns a list of events that have been replayed more than {@code MAX_SAFE_REPLAY_COUNT}
     * times and are still in PENDING_REPLAY status — these are suspected poison pills.
     */
    @GetMapping("/poison-pills")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(
            summary = "List suspected poison-pill events",
            description = "Returns failed events with replayCount > 3 still in PENDING_REPLAY status. " +
                    "These should be investigated and then either ignored or manually fixed."
    )
    public ResponseEntity<List<FailedKafkaEvent>> listPoisonPills() {
        // Mirror MAX_SAFE_REPLAY_COUNT from DeadLetterHandler
        List<FailedKafkaEvent> poisonPills = failedKafkaEventRepository.findSuspectedPoisonPills(3);
        return ResponseEntity.ok(poisonPills);
    }

    /**
     * Bulk-ignores all {@code PENDING_REPLAY} events for a given DLT topic.
     * Useful when an entire topic contains poison pills that cannot be reprocessed.
     *
     * <p>Returns {@code 200 OK} with the count of records updated.
     */
    @PostMapping("/ignore-topic")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(
            summary = "Bulk-ignore all pending events for a DLT topic",
            description = "Marks all PENDING_REPLAY events for the specified topic as IGNORED. " +
                    "Use when an entire topic contains known poison pills."
    )
    public ResponseEntity<Map<String, Object>> ignoreAllForTopic(
            @Parameter(description = "The DLT topic name (e.g. nu-aura.approvals.dlt)")
            @RequestParam String topic) {

        UUID currentUserId = SecurityContext.getCurrentUserId();
        log.info("[KafkaAdmin] Bulk-ignore for topic={} by admin={}", topic, currentUserId);

        int updated = failedKafkaEventRepository.ignoreAllPendingForTopic(topic);
        log.info("[KafkaAdmin] Bulk-ignored {} events for topic={}", updated, topic);
        return ResponseEntity.ok(Map.of("topic", topic, "updatedCount", updated));
    }

    /**
     * Marks a {@code PENDING_REPLAY} failed event as {@code IGNORED} without replaying it.
     * Use for known poison pills or stale events that should not be reprocessed.
     *
     * <p>Returns:
     * <ul>
     *   <li>{@code 204 No Content} — event marked IGNORED successfully.</li>
     *   <li>{@code 404 Not Found}  — event does not exist.</li>
     *   <li>{@code 409 Conflict}   — event is not in {@code PENDING_REPLAY} status.</li>
     * </ul>
     */
    @PostMapping("/ignore/{id}")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(
            summary = "Ignore a dead-lettered Kafka event",
            description = "Marks the event as IGNORED — it will no longer be shown in the default PENDING_REPLAY queue. " +
                    "Use for known poison pills or events that are permanently unprocessable."
    )
    public ResponseEntity<Void> ignoreFailedEvent(
            @Parameter(description = "UUID of the failed event to ignore")
            @PathVariable UUID id) {

        UUID currentUserId = SecurityContext.getCurrentUserId();
        log.info("[KafkaAdmin] Ignore requested for event={} by admin={}", id, currentUserId);

        try {
            deadLetterHandler.ignoreFailedEvent(id, currentUserId);
            return ResponseEntity.noContent().build();

        } catch (IllegalArgumentException e) {
            log.warn("[KafkaAdmin] Ignore failed — event not found: {}", id);
            return ResponseEntity.notFound().build();

        } catch (IllegalStateException e) {
            log.warn("[KafkaAdmin] Ignore rejected for event={}: {}", id, e.getMessage());
            return ResponseEntity.status(409).build();
        }
    }
}
