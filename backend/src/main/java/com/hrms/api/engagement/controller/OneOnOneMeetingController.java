package com.hrms.api.engagement.controller;

import com.hrms.api.engagement.dto.OneOnOneMeetingRequest;
import com.hrms.api.engagement.dto.OneOnOneMeetingResponse;
import com.hrms.application.engagement.service.OneOnOneMeetingService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.engagement.MeetingActionItem;
import com.hrms.domain.engagement.MeetingAgendaItem;
import com.hrms.domain.engagement.OneOnOneMeeting;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class OneOnOneMeetingController {

    private final OneOnOneMeetingService meetingService;

    // ==================== Meeting CRUD ====================

    @PostMapping
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse> createMeeting(
            @Valid @RequestBody OneOnOneMeetingRequest request) {
        UUID managerId = SecurityContext.getCurrentEmployeeId();
        OneOnOneMeeting meeting = meetingService.createMeeting(request, managerId);
        return ResponseEntity.created(URI.create("/api/v1/meetings/" + meeting.getId()))
                .body(buildResponse(meeting));
    }

    @PutMapping("/{meetingId}")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse> updateMeeting(
            @PathVariable UUID meetingId,
            @Valid @RequestBody OneOnOneMeetingRequest request) {
        OneOnOneMeeting meeting = meetingService.updateMeeting(meetingId, request);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    @GetMapping("/{meetingId}")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<OneOnOneMeetingResponse> getMeeting(@PathVariable UUID meetingId) {
        return meetingService.getMeetingById(meetingId)
                .map(meeting -> ResponseEntity.ok(buildFullResponse(meeting)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<Page<OneOnOneMeetingResponse>> getMyMeetings(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        Page<OneOnOneMeeting> meetings = meetingService.getMeetingsForUser(userId, pageable);
        return ResponseEntity.ok(meetings.map(OneOnOneMeetingResponse::fromEntity));
    }

    @GetMapping("/upcoming")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<List<OneOnOneMeetingResponse>> getUpcomingMeetings() {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        List<OneOnOneMeeting> meetings = meetingService.getUpcomingMeetings(userId);
        return ResponseEntity.ok(meetings.stream()
                .map(OneOnOneMeetingResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/as-manager")
    @RequiresPermission(Permission.MEETING_MANAGE)
    public ResponseEntity<Page<OneOnOneMeetingResponse>> getMeetingsAsManager(Pageable pageable) {
        UUID managerId = SecurityContext.getCurrentEmployeeId();
        Page<OneOnOneMeeting> meetings = meetingService.getMeetingsAsManager(managerId, pageable);
        return ResponseEntity.ok(meetings.map(OneOnOneMeetingResponse::fromEntity));
    }

    @GetMapping("/history/{employeeId}")
    @RequiresPermission(Permission.MEETING_MANAGE)
    public ResponseEntity<List<OneOnOneMeetingResponse>> getMeetingHistory(@PathVariable UUID employeeId) {
        UUID managerId = SecurityContext.getCurrentEmployeeId();
        List<OneOnOneMeeting> meetings = meetingService.getMeetingHistory(managerId, employeeId);
        return ResponseEntity.ok(meetings.stream()
                .map(OneOnOneMeetingResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    // ==================== Meeting Lifecycle ====================

    @PostMapping("/{meetingId}/start")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse> startMeeting(@PathVariable UUID meetingId) {
        OneOnOneMeeting meeting = meetingService.startMeeting(meetingId);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    @PostMapping("/{meetingId}/complete")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse> completeMeeting(
            @PathVariable UUID meetingId,
            @Valid @RequestBody(required = false) Map<String, String> body) {
        String summary = body != null ? body.get("summary") : null;
        OneOnOneMeeting meeting = meetingService.completeMeeting(meetingId, summary);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    @PostMapping("/{meetingId}/cancel")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse> cancelMeeting(
            @PathVariable UUID meetingId,
            @Valid @RequestBody(required = false) Map<String, String> body) {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        String reason = body != null ? body.get("reason") : null;
        OneOnOneMeeting meeting = meetingService.cancelMeeting(meetingId, userId, reason);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    @PostMapping("/{meetingId}/reschedule")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse> rescheduleMeeting(
            @PathVariable UUID meetingId,
            @Valid @RequestBody Map<String, String> body) {
        LocalDate newDate = LocalDate.parse(body.get("date"));
        LocalTime newTime = LocalTime.parse(body.get("time"));
        OneOnOneMeeting meeting = meetingService.rescheduleMeeting(meetingId, newDate, newTime);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    // ==================== Notes & Feedback ====================

    @PutMapping("/{meetingId}/notes")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<OneOnOneMeetingResponse> updateNotes(
            @PathVariable UUID meetingId,
            @Valid @RequestBody Map<String, String> body) {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        OneOnOneMeeting meeting = meetingService.getMeetingById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        boolean isManager = meeting.getManagerId().equals(userId);
        String sharedNotes = body.get("sharedNotes");
        String privateNotes = body.get("privateNotes");

        meeting = meetingService.updateNotes(meetingId, sharedNotes, privateNotes, isManager);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    @PostMapping("/{meetingId}/feedback")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<OneOnOneMeetingResponse> submitFeedback(
            @PathVariable UUID meetingId,
            @Valid @RequestBody Map<String, Object> body) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        Integer rating = (Integer) body.get("rating");
        String feedback = (String) body.get("feedback");

        OneOnOneMeeting meeting = meetingService.submitFeedback(meetingId, employeeId, rating, feedback);
        return ResponseEntity.ok(buildResponse(meeting));
    }

    // ==================== Agenda Items ====================

    @PostMapping("/{meetingId}/agenda")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<OneOnOneMeetingResponse.AgendaItemResponse> addAgendaItem(
            @PathVariable UUID meetingId,
            @Valid @RequestBody OneOnOneMeetingRequest.AgendaItemRequest request) {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        OneOnOneMeeting meeting = meetingService.getMeetingById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        MeetingAgendaItem.AddedBy addedBy = meeting.getManagerId().equals(userId)
                ? MeetingAgendaItem.AddedBy.MANAGER : MeetingAgendaItem.AddedBy.EMPLOYEE;

        MeetingAgendaItem item = meetingService.addAgendaItem(meetingId, request, addedBy, userId);
        return ResponseEntity.created(URI.create("/api/v1/meetings/" + meetingId + "/agenda/" + item.getId()))
                .body(toAgendaResponse(item));
    }

    @GetMapping("/{meetingId}/agenda")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<List<OneOnOneMeetingResponse.AgendaItemResponse>> getAgendaItems(
            @PathVariable UUID meetingId) {
        List<MeetingAgendaItem> items = meetingService.getAgendaItems(meetingId);
        return ResponseEntity.ok(items.stream().map(this::toAgendaResponse).collect(Collectors.toList()));
    }

    @PutMapping("/{meetingId}/agenda/{itemId}/discussed")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse.AgendaItemResponse> markAgendaItemDiscussed(
            @PathVariable UUID meetingId,
            @PathVariable UUID itemId,
            @Valid @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.get("notes") : null;
        MeetingAgendaItem item = meetingService.markAgendaItemDiscussed(itemId, notes);
        return ResponseEntity.ok(toAgendaResponse(item));
    }

    @DeleteMapping("/{meetingId}/agenda/{itemId}")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<Void> deleteAgendaItem(
            @PathVariable UUID meetingId,
            @PathVariable UUID itemId) {
        meetingService.deleteAgendaItem(meetingId, itemId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Action Items ====================

    @PostMapping("/{meetingId}/actions")
    @RequiresPermission(Permission.MEETING_CREATE)
    public ResponseEntity<OneOnOneMeetingResponse.ActionItemResponse> createActionItem(
            @PathVariable UUID meetingId,
            @Valid @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");
        UUID assigneeId = UUID.fromString((String) body.get("assigneeId"));
        MeetingActionItem.AssigneeRole role = MeetingActionItem.AssigneeRole.valueOf((String) body.get("assigneeRole"));
        LocalDate dueDate = body.get("dueDate") != null ? LocalDate.parse((String) body.get("dueDate")) : null;
        MeetingActionItem.Priority priority = body.get("priority") != null
                ? MeetingActionItem.Priority.valueOf((String) body.get("priority"))
                : MeetingActionItem.Priority.MEDIUM;

        MeetingActionItem action = meetingService.createActionItem(meetingId, title, description,
                assigneeId, role, dueDate, priority);
        return ResponseEntity.created(URI.create("/api/v1/meetings/" + meetingId + "/actions/" + action.getId()))
                .body(toActionResponse(action));
    }

    @GetMapping("/{meetingId}/actions")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<List<OneOnOneMeetingResponse.ActionItemResponse>> getActionItems(
            @PathVariable UUID meetingId) {
        List<MeetingActionItem> items = meetingService.getActionItems(meetingId);
        return ResponseEntity.ok(items.stream().map(this::toActionResponse).collect(Collectors.toList()));
    }

    @GetMapping("/actions/pending")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<List<OneOnOneMeetingResponse.ActionItemResponse>> getPendingActionItems() {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        List<MeetingActionItem> items = meetingService.getPendingActionItems(userId);
        return ResponseEntity.ok(items.stream().map(this::toActionResponse).collect(Collectors.toList()));
    }

    @GetMapping("/actions/overdue")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<List<OneOnOneMeetingResponse.ActionItemResponse>> getOverdueActionItems() {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        List<MeetingActionItem> items = meetingService.getOverdueActionItems(userId);
        return ResponseEntity.ok(items.stream().map(this::toActionResponse).collect(Collectors.toList()));
    }

    @PutMapping("/actions/{actionId}/status")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<OneOnOneMeetingResponse.ActionItemResponse> updateActionItemStatus(
            @PathVariable UUID actionId,
            @Valid @RequestBody Map<String, String> body) {
        MeetingActionItem.ActionStatus status = MeetingActionItem.ActionStatus.valueOf(body.get("status"));
        String notes = body.get("notes");
        MeetingActionItem action = meetingService.updateActionItemStatus(actionId, status, notes);
        return ResponseEntity.ok(toActionResponse(action));
    }

    // ==================== Dashboard ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.MEETING_VIEW)
    public ResponseEntity<Map<String, Object>> getMeetingDashboard() {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        return ResponseEntity.ok(meetingService.getMeetingDashboard(userId));
    }

    @GetMapping("/dashboard/manager")
    @RequiresPermission(Permission.MEETING_MANAGE)
    public ResponseEntity<Map<String, Object>> getManagerDashboard() {
        UUID managerId = SecurityContext.getCurrentEmployeeId();
        return ResponseEntity.ok(meetingService.getManagerDashboard(managerId));
    }

    // ==================== Helpers ====================

    private OneOnOneMeetingResponse buildResponse(OneOnOneMeeting meeting) {
        return OneOnOneMeetingResponse.fromEntity(meeting);
    }

    private OneOnOneMeetingResponse buildFullResponse(OneOnOneMeeting meeting) {
        OneOnOneMeetingResponse response = OneOnOneMeetingResponse.fromEntity(meeting);
        response.setAgendaItems(meetingService.getAgendaItems(meeting.getId()).stream()
                .map(this::toAgendaResponse).collect(Collectors.toList()));
        response.setActionItems(meetingService.getActionItems(meeting.getId()).stream()
                .map(this::toActionResponse).collect(Collectors.toList()));
        return response;
    }

    private OneOnOneMeetingResponse.AgendaItemResponse toAgendaResponse(MeetingAgendaItem item) {
        return OneOnOneMeetingResponse.AgendaItemResponse.builder()
                .id(item.getId())
                .title(item.getTitle())
                .description(item.getDescription())
                .itemOrder(item.getItemOrder())
                .addedBy(item.getAddedBy())
                .isDiscussed(item.getIsDiscussed())
                .discussionNotes(item.getDiscussionNotes())
                .priority(item.getPriority())
                .category(item.getCategory())
                .build();
    }

    private OneOnOneMeetingResponse.ActionItemResponse toActionResponse(MeetingActionItem item) {
        return OneOnOneMeetingResponse.ActionItemResponse.builder()
                .id(item.getId())
                .title(item.getTitle())
                .description(item.getDescription())
                .assigneeId(item.getAssigneeId())
                .assigneeRole(item.getAssigneeRole())
                .dueDate(item.getDueDate())
                .status(item.getStatus())
                .priority(item.getPriority())
                .isOverdue(item.isOverdue())
                .build();
    }
}
