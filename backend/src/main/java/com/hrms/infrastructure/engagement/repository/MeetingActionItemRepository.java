package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.MeetingActionItem;
import com.hrms.domain.engagement.MeetingActionItem.ActionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingActionItemRepository extends JpaRepository<MeetingActionItem, UUID> {

    List<MeetingActionItem> findAllByMeetingId(UUID meetingId);

    Optional<MeetingActionItem> findByIdAndTenantId(UUID id, UUID tenantId);

    // By assignee
    List<MeetingActionItem> findAllByAssigneeIdAndTenantId(UUID assigneeId, UUID tenantId);

    List<MeetingActionItem> findAllByAssigneeIdAndStatusAndTenantId(UUID assigneeId, ActionStatus status, UUID tenantId);

    // Open/pending items
    @Query("SELECT a FROM MeetingActionItem a WHERE a.tenantId = :tenantId " +
            "AND a.assigneeId = :assigneeId AND a.status IN ('OPEN', 'IN_PROGRESS') " +
            "ORDER BY a.dueDate ASC NULLS LAST")
    List<MeetingActionItem> findPendingByAssignee(@Param("tenantId") UUID tenantId,
                                                  @Param("assigneeId") UUID assigneeId);

    // Overdue items
    @Query("SELECT a FROM MeetingActionItem a WHERE a.tenantId = :tenantId " +
            "AND a.assigneeId = :assigneeId AND a.dueDate < :today " +
            "AND a.status IN ('OPEN', 'IN_PROGRESS')")
    List<MeetingActionItem> findOverdueByAssignee(@Param("tenantId") UUID tenantId,
                                                  @Param("assigneeId") UUID assigneeId,
                                                  @Param("today") LocalDate today);

    // Items to carry over
    @Query("SELECT a FROM MeetingActionItem a WHERE a.meetingId = :meetingId " +
            "AND a.status IN ('OPEN', 'IN_PROGRESS')")
    List<MeetingActionItem> findItemsToCarryOver(@Param("meetingId") UUID meetingId);

    // For reminders
    @Query("SELECT a FROM MeetingActionItem a WHERE a.tenantId = :tenantId " +
            "AND a.dueDate = :dueDate AND a.status IN ('OPEN', 'IN_PROGRESS') " +
            "AND a.reminderSent = false")
    List<MeetingActionItem> findItemsForReminder(@Param("tenantId") UUID tenantId,
                                                 @Param("dueDate") LocalDate dueDate);

    // Statistics
    @Query("SELECT COUNT(a) FROM MeetingActionItem a WHERE a.tenantId = :tenantId " +
            "AND a.assigneeId = :assigneeId AND a.status = 'COMPLETED'")
    Long countCompletedByAssignee(@Param("tenantId") UUID tenantId,
                                  @Param("assigneeId") UUID assigneeId);

    @Query("SELECT COUNT(a) FROM MeetingActionItem a WHERE a.tenantId = :tenantId " +
            "AND a.assigneeId = :assigneeId AND a.status IN ('OPEN', 'IN_PROGRESS')")
    Long countPendingByAssignee(@Param("tenantId") UUID tenantId,
                                @Param("assigneeId") UUID assigneeId);

    @Modifying
    @Query("DELETE FROM MeetingActionItem a WHERE a.meetingId = :meetingId")
    void deleteAllByMeetingId(@Param("meetingId") UUID meetingId);
}
