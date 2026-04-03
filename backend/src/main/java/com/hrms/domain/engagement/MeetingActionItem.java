package com.hrms.domain.engagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "meeting_action_items", indexes = {
        @Index(name = "idx_action_meeting", columnList = "meeting_id"),
        @Index(name = "idx_action_assignee", columnList = "assignee_id"),
        @Index(name = "idx_action_status", columnList = "status"),
        @Index(name = "idx_action_due_date", columnList = "due_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MeetingActionItem extends TenantAware {

    @Column(name = "meeting_id", nullable = false)
    private UUID meetingId;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "assignee_id", nullable = false)
    private UUID assigneeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignee_role", length = 20)
    private AssigneeRole assigneeRole;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ActionStatus status = ActionStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completion_notes", columnDefinition = "TEXT")
    private String completionNotes;

    @Column(name = "is_carried_over")
    @Builder.Default
    private Boolean isCarriedOver = false;

    @Column(name = "carried_from_meeting_id")
    private UUID carriedFromMeetingId;

    @Column(name = "reminder_sent")
    @Builder.Default
    private Boolean reminderSent = false;

    public boolean isOverdue() {
        return dueDate != null &&
                dueDate.isBefore(LocalDate.now()) &&
                status != ActionStatus.COMPLETED &&
                status != ActionStatus.CANCELLED;
    }

    public enum AssigneeRole {
        MANAGER,
        EMPLOYEE
    }

    public enum ActionStatus {
        OPEN,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        CARRIED_OVER
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }
}
