package com.hrms.application.engagement.service;

import com.hrms.api.engagement.dto.OneOnOneMeetingRequest;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.engagement.*;
import com.hrms.domain.engagement.MeetingActionItem.ActionStatus;
import com.hrms.domain.engagement.MeetingAgendaItem.AddedBy;
import com.hrms.domain.engagement.MeetingAgendaItem.AgendaCategory;
import com.hrms.domain.engagement.MeetingAgendaItem.Priority;
import com.hrms.domain.engagement.OneOnOneMeeting.MeetingStatus;
import com.hrms.infrastructure.engagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OneOnOneMeetingService {

    private final OneOnOneMeetingRepository meetingRepository;
    private final MeetingAgendaItemRepository agendaRepository;
    private final MeetingActionItemRepository actionRepository;

    // ==================== Meeting CRUD ====================

    @Transactional
    public OneOnOneMeeting createMeeting(OneOnOneMeetingRequest request, UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating 1-on-1 meeting: {} between manager: {} and employee: {}",
                request.getTitle(), managerId, request.getEmployeeId());

        OneOnOneMeeting meeting = OneOnOneMeeting.builder()
                .managerId(managerId)
                .employeeId(request.getEmployeeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .meetingDate(request.getMeetingDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 30)
                .meetingType(request.getMeetingType() != null ? request.getMeetingType() : OneOnOneMeeting.MeetingType.REGULAR)
                .location(request.getLocation())
                .meetingLink(request.getMeetingLink())
                .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false)
                .recurrencePattern(request.getRecurrencePattern())
                .recurrenceEndDate(request.getRecurrenceEndDate())
                .reminderMinutesBefore(request.getReminderMinutesBefore() != null ? request.getReminderMinutesBefore() : 15)
                .status(MeetingStatus.SCHEDULED)
                .build();

        meeting.setId(UUID.randomUUID());
        meeting.setTenantId(tenantId);
        meeting = meetingRepository.save(meeting);

        // Create agenda items if provided
        if (request.getAgendaItems() != null && !request.getAgendaItems().isEmpty()) {
            int order = 1;
            for (OneOnOneMeetingRequest.AgendaItemRequest agendaReq : request.getAgendaItems()) {
                createAgendaItem(meeting.getId(), agendaReq, AddedBy.MANAGER, managerId,
                        agendaReq.getItemOrder() != null ? agendaReq.getItemOrder() : order++);
            }
        }

        // Handle recurring meetings
        if (Boolean.TRUE.equals(request.getIsRecurring()) && request.getRecurrencePattern() != null) {
            meeting.setParentMeetingId(null); // This is the parent
            meetingRepository.save(meeting);
            createRecurringInstances(meeting);
        }

        return meeting;
    }

    @Transactional
    public OneOnOneMeeting updateMeeting(UUID meetingId, OneOnOneMeetingRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting meeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + meetingId));

        if (meeting.getStatus() == MeetingStatus.COMPLETED || meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot update completed or cancelled meeting");
        }

        meeting.setTitle(request.getTitle());
        meeting.setDescription(request.getDescription());
        meeting.setMeetingDate(request.getMeetingDate());
        meeting.setStartTime(request.getStartTime());
        meeting.setEndTime(request.getEndTime());
        if (request.getDurationMinutes() != null) meeting.setDurationMinutes(request.getDurationMinutes());
        if (request.getMeetingType() != null) meeting.setMeetingType(request.getMeetingType());
        meeting.setLocation(request.getLocation());
        meeting.setMeetingLink(request.getMeetingLink());

        return meetingRepository.save(meeting);
    }

    public Optional<OneOnOneMeeting> getMeetingById(UUID meetingId) {
        return meetingRepository.findByIdAndTenantId(meetingId, TenantContext.getCurrentTenant());
    }

    public Page<OneOnOneMeeting> getMeetingsForUser(UUID userId, Pageable pageable) {
        return meetingRepository.findAllByParticipant(userId, TenantContext.getCurrentTenant(), pageable);
    }

    public List<OneOnOneMeeting> getUpcomingMeetings(UUID userId) {
        return meetingRepository.findUpcomingMeetings(userId, TenantContext.getCurrentTenant(), LocalDate.now());
    }

    public Page<OneOnOneMeeting> getMeetingsAsManager(UUID managerId, Pageable pageable) {
        return meetingRepository.findAllByManagerIdAndTenantId(managerId, TenantContext.getCurrentTenant(), pageable);
    }

    public Page<OneOnOneMeeting> getMeetingsAsEmployee(UUID employeeId, Pageable pageable) {
        return meetingRepository.findAllByEmployeeIdAndTenantId(employeeId, TenantContext.getCurrentTenant(), pageable);
    }

    public List<OneOnOneMeeting> getMeetingHistory(UUID managerId, UUID employeeId) {
        return meetingRepository.findByManagerEmployeePair(TenantContext.getCurrentTenant(), managerId, employeeId);
    }

    // ==================== Meeting Lifecycle ====================

    @Transactional
    public OneOnOneMeeting startMeeting(UUID meetingId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting meeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setStatus(MeetingStatus.IN_PROGRESS);
        meeting.setActualStartTime(LocalDateTime.now());

        log.info("Started meeting: {}", meetingId);
        return meetingRepository.save(meeting);
    }

    @Transactional
    public OneOnOneMeeting completeMeeting(UUID meetingId, String summary) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting meeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setStatus(MeetingStatus.COMPLETED);
        meeting.setActualEndTime(LocalDateTime.now());
        meeting.setMeetingSummary(summary);

        log.info("Completed meeting: {}", meetingId);
        return meetingRepository.save(meeting);
    }

    @Transactional
    public OneOnOneMeeting cancelMeeting(UUID meetingId, UUID cancelledBy, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting meeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setStatus(MeetingStatus.CANCELLED);
        meeting.setCancelledAt(LocalDateTime.now());
        meeting.setCancelledBy(cancelledBy);
        meeting.setCancellationReason(reason);

        log.info("Cancelled meeting: {} by: {}", meetingId, cancelledBy);
        return meetingRepository.save(meeting);
    }

    @Transactional
    public OneOnOneMeeting rescheduleMeeting(UUID meetingId, LocalDate newDate, java.time.LocalTime newTime) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting oldMeeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        // Mark old meeting as rescheduled
        oldMeeting.setStatus(MeetingStatus.RESCHEDULED);
        meetingRepository.save(oldMeeting);

        // Create new meeting
        OneOnOneMeeting newMeeting = OneOnOneMeeting.builder()
                .managerId(oldMeeting.getManagerId())
                .employeeId(oldMeeting.getEmployeeId())
                .title(oldMeeting.getTitle())
                .description(oldMeeting.getDescription())
                .meetingDate(newDate)
                .startTime(newTime)
                .durationMinutes(oldMeeting.getDurationMinutes())
                .meetingType(oldMeeting.getMeetingType())
                .location(oldMeeting.getLocation())
                .meetingLink(oldMeeting.getMeetingLink())
                .rescheduledFrom(meetingId)
                .status(MeetingStatus.SCHEDULED)
                .build();

        newMeeting.setId(UUID.randomUUID());
        newMeeting.setTenantId(tenantId);

        log.info("Rescheduled meeting: {} to: {} {}", meetingId, newDate, newTime);
        return meetingRepository.save(newMeeting);
    }

    // ==================== Notes & Feedback ====================

    @Transactional
    public OneOnOneMeeting updateNotes(UUID meetingId, String sharedNotes, String privateNotes, boolean isManager) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting meeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (sharedNotes != null) {
            meeting.setSharedNotes(sharedNotes);
        }

        if (privateNotes != null) {
            if (isManager) {
                meeting.setManagerNotes(privateNotes);
            } else {
                meeting.setEmployeeNotes(privateNotes);
            }
        }

        return meetingRepository.save(meeting);
    }

    @Transactional
    public OneOnOneMeeting submitFeedback(UUID meetingId, UUID employeeId, Integer rating, String feedback) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OneOnOneMeeting meeting = meetingRepository.findByIdAndTenantId(meetingId, tenantId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!meeting.getEmployeeId().equals(employeeId)) {
            throw new IllegalArgumentException("Only the meeting employee can submit feedback");
        }

        meeting.setEmployeeRating(rating);
        meeting.setEmployeeFeedback(feedback);

        return meetingRepository.save(meeting);
    }

    // ==================== Agenda Items ====================

    @Transactional
    public MeetingAgendaItem createAgendaItem(UUID meetingId, OneOnOneMeetingRequest.AgendaItemRequest request,
                                              AddedBy addedBy, UUID addedById, Integer order) {
        UUID tenantId = TenantContext.getCurrentTenant();

        MeetingAgendaItem item = MeetingAgendaItem.builder()
                .meetingId(meetingId)
                .title(request.getTitle())
                .description(request.getDescription())
                .itemOrder(order != null ? order : agendaRepository.getMaxItemOrder(meetingId) + 1)
                .addedBy(addedBy)
                .addedById(addedById)
                .durationMinutes(request.getDurationMinutes())
                .build();

        if (request.getPriority() != null) {
            item.setPriority(Priority.valueOf(request.getPriority()));
        }
        if (request.getCategory() != null) {
            item.setCategory(AgendaCategory.valueOf(request.getCategory()));
        }

        item.setId(UUID.randomUUID());
        item.setTenantId(tenantId);

        return agendaRepository.save(item);
    }

    @Transactional
    public MeetingAgendaItem addAgendaItem(UUID meetingId, OneOnOneMeetingRequest.AgendaItemRequest request,
                                           AddedBy addedBy, UUID addedById) {
        return createAgendaItem(meetingId, request, addedBy, addedById, null);
    }

    public List<MeetingAgendaItem> getAgendaItems(UUID meetingId) {
        return agendaRepository.findAllByMeetingIdOrderByItemOrder(meetingId);
    }

    @Transactional
    public MeetingAgendaItem markAgendaItemDiscussed(UUID itemId, String discussionNotes) {
        MeetingAgendaItem item = agendaRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Agenda item not found"));

        item.setIsDiscussed(true);
        item.setDiscussionNotes(discussionNotes);

        return agendaRepository.save(item);
    }

    @Transactional
    public void deleteAgendaItem(UUID meetingId, UUID itemId) {
        MeetingAgendaItem item = agendaRepository.findByIdAndMeetingId(itemId, meetingId)
                .orElseThrow(() -> new RuntimeException("Agenda item not found"));
        agendaRepository.delete(item);
    }

    // ==================== Action Items ====================

    @Transactional
    public MeetingActionItem createActionItem(UUID meetingId, String title, String description,
                                              UUID assigneeId, MeetingActionItem.AssigneeRole role,
                                              LocalDate dueDate, MeetingActionItem.Priority priority) {
        UUID tenantId = TenantContext.getCurrentTenant();

        MeetingActionItem action = MeetingActionItem.builder()
                .meetingId(meetingId)
                .title(title)
                .description(description)
                .assigneeId(assigneeId)
                .assigneeRole(role)
                .dueDate(dueDate)
                .priority(priority != null ? priority : MeetingActionItem.Priority.MEDIUM)
                .status(ActionStatus.OPEN)
                .build();

        action.setId(UUID.randomUUID());
        action.setTenantId(tenantId);

        log.info("Created action item: {} for meeting: {}", title, meetingId);
        return actionRepository.save(action);
    }

    public List<MeetingActionItem> getActionItems(UUID meetingId) {
        return actionRepository.findAllByMeetingId(meetingId);
    }

    public List<MeetingActionItem> getPendingActionItems(UUID userId) {
        return actionRepository.findPendingByAssignee(TenantContext.getCurrentTenant(), userId);
    }

    public List<MeetingActionItem> getOverdueActionItems(UUID userId) {
        return actionRepository.findOverdueByAssignee(TenantContext.getCurrentTenant(), userId, LocalDate.now());
    }

    @Transactional
    public MeetingActionItem updateActionItemStatus(UUID actionId, ActionStatus status, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        MeetingActionItem action = actionRepository.findByIdAndTenantId(actionId, tenantId)
                .orElseThrow(() -> new RuntimeException("Action item not found"));

        action.setStatus(status);
        if (status == ActionStatus.COMPLETED) {
            action.setCompletedAt(LocalDateTime.now());
            action.setCompletionNotes(notes);
        }

        return actionRepository.save(action);
    }

    @Transactional
    public void carryOverActionItems(UUID fromMeetingId, UUID toMeetingId) {
        List<MeetingActionItem> pendingItems = actionRepository.findItemsToCarryOver(fromMeetingId);

        for (MeetingActionItem item : pendingItems) {
            item.setStatus(ActionStatus.CARRIED_OVER);
            actionRepository.save(item);

            // Create new item in next meeting
            MeetingActionItem newItem = MeetingActionItem.builder()
                    .meetingId(toMeetingId)
                    .title(item.getTitle())
                    .description(item.getDescription())
                    .assigneeId(item.getAssigneeId())
                    .assigneeRole(item.getAssigneeRole())
                    .dueDate(item.getDueDate())
                    .priority(item.getPriority())
                    .status(ActionStatus.OPEN)
                    .isCarriedOver(true)
                    .carriedFromMeetingId(fromMeetingId)
                    .build();

            newItem.setId(UUID.randomUUID());
            newItem.setTenantId(item.getTenantId());
            actionRepository.save(newItem);
        }

        log.info("Carried over {} action items from meeting {} to {}", pendingItems.size(), fromMeetingId, toMeetingId);
    }

    // ==================== Analytics ====================

    public Map<String, Object> getMeetingDashboard(UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = new HashMap<>();

        List<OneOnOneMeeting> upcoming = getUpcomingMeetings(userId);
        dashboard.put("upcomingMeetings", upcoming.size());
        dashboard.put("nextMeeting", upcoming.isEmpty() ? null : upcoming.get(0));

        List<MeetingActionItem> pendingActions = getPendingActionItems(userId);
        dashboard.put("pendingActionItems", pendingActions.size());

        List<MeetingActionItem> overdueActions = getOverdueActionItems(userId);
        dashboard.put("overdueActionItems", overdueActions.size());

        Long completedCount = actionRepository.countCompletedByAssignee(tenantId, userId);
        Long pendingCount = actionRepository.countPendingByAssignee(tenantId, userId);
        dashboard.put("completedActionItems", completedCount);
        dashboard.put("actionItemCompletionRate",
                (completedCount + pendingCount) > 0 ?
                        (double) completedCount / (completedCount + pendingCount) * 100 : 0.0);

        return dashboard;
    }

    public Map<String, Object> getManagerDashboard(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = getMeetingDashboard(managerId);

        Long scheduledCount = meetingRepository.countByManagerAndStatus(tenantId, managerId, MeetingStatus.SCHEDULED);
        Long completedCount = meetingRepository.countByManagerAndStatus(tenantId, managerId, MeetingStatus.COMPLETED);
        Double avgRating = meetingRepository.getAverageRatingForManager(tenantId, managerId);

        dashboard.put("totalScheduledMeetings", scheduledCount);
        dashboard.put("totalCompletedMeetings", completedCount);
        dashboard.put("averageMeetingRating", avgRating);

        return dashboard;
    }

    // ==================== Private Helpers ====================

    private void createRecurringInstances(OneOnOneMeeting parent) {
        if (parent.getRecurrencePattern() == null || parent.getRecurrenceEndDate() == null) {
            return;
        }

        LocalDate nextDate = getNextOccurrenceDate(parent.getMeetingDate(), parent.getRecurrencePattern());
        UUID tenantId = parent.getTenantId();

        while (nextDate.isBefore(parent.getRecurrenceEndDate()) || nextDate.isEqual(parent.getRecurrenceEndDate())) {
            OneOnOneMeeting instance = OneOnOneMeeting.builder()
                    .managerId(parent.getManagerId())
                    .employeeId(parent.getEmployeeId())
                    .title(parent.getTitle())
                    .description(parent.getDescription())
                    .meetingDate(nextDate)
                    .startTime(parent.getStartTime())
                    .endTime(parent.getEndTime())
                    .durationMinutes(parent.getDurationMinutes())
                    .meetingType(parent.getMeetingType())
                    .location(parent.getLocation())
                    .meetingLink(parent.getMeetingLink())
                    .isRecurring(true)
                    .recurrencePattern(parent.getRecurrencePattern())
                    .parentMeetingId(parent.getId())
                    .reminderMinutesBefore(parent.getReminderMinutesBefore())
                    .status(MeetingStatus.SCHEDULED)
                    .build();

            instance.setId(UUID.randomUUID());
            instance.setTenantId(tenantId);
            meetingRepository.save(instance);

            nextDate = getNextOccurrenceDate(nextDate, parent.getRecurrencePattern());
        }
    }

    private LocalDate getNextOccurrenceDate(LocalDate current, OneOnOneMeeting.RecurrencePattern pattern) {
        return switch (pattern) {
            case WEEKLY -> current.plusWeeks(1);
            case BI_WEEKLY -> current.plusWeeks(2);
            case MONTHLY -> current.plusMonths(1);
            case QUARTERLY -> current.plusMonths(3);
        };
    }
}
