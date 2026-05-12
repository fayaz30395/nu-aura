package com.nulogic.api.announcement.controller;

import com.nulogic.api.announcement.dto.AnnouncementDto;
import com.nulogic.api.announcement.dto.CreateAnnouncementRequest;
import com.nulogic.application.announcement.service.AnnouncementService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
@Tag(name = "Announcements", description = "Organization-wide announcements: publish, pin, read receipts, and acknowledgement")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @PostMapping
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Create announcement",
            description = "Create a new announcement; visible to all employees when active (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Announcement created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission")
    })
    public ResponseEntity<AnnouncementDto> createAnnouncement(
            @Valid @RequestBody CreateAnnouncementRequest request) {
        AnnouncementDto response = announcementService.createAnnouncement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{announcementId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Update announcement",
            description = "Mutate an existing announcement (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcement updated successfully"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<AnnouncementDto> updateAnnouncement(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId,
            @Valid @RequestBody CreateAnnouncementRequest request) {
        AnnouncementDto response = announcementService.updateAnnouncement(announcementId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "List all announcements",
            description = "Returns a paginated list of all announcements (active, scheduled, expired)")
    @ApiResponse(responseCode = "200", description = "Announcements retrieved successfully")
    public ResponseEntity<Page<AnnouncementDto>> getAllAnnouncements(Pageable pageable) {
        Page<AnnouncementDto> response = announcementService.getAllAnnouncements(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "List active announcements",
            description = "Returns announcements active for the specified employee (defaults to current user)")
    @ApiResponse(responseCode = "200", description = "Active announcements retrieved successfully")
    public ResponseEntity<Page<AnnouncementDto>> getActiveAnnouncements(
            @Parameter(description = "Optional employee UUID; defaults to authenticated user") @RequestParam(required = false) UUID employeeId,
            Pageable pageable) {
        UUID effectiveEmployeeId = employeeId != null ? employeeId : SecurityContext.getCurrentEmployeeId();
        Page<AnnouncementDto> response = announcementService.getActiveAnnouncements(effectiveEmployeeId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pinned")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "List pinned announcements",
            description = "Returns announcements pinned to the top of the feed (admin-controlled)")
    @ApiResponse(responseCode = "200", description = "Pinned announcements retrieved successfully")
    public ResponseEntity<List<AnnouncementDto>> getPinnedAnnouncements() {
        List<AnnouncementDto> response = announcementService.getPinnedAnnouncements();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{announcementId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Get announcement by ID",
            description = "Returns a single announcement; includes read/accept status for the specified employee")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcement found"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<AnnouncementDto> getAnnouncementById(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId,
            @Parameter(description = "Optional employee UUID; defaults to authenticated user") @RequestParam(required = false) UUID employeeId) {
        UUID effectiveEmployeeId = employeeId != null ? employeeId : SecurityContext.getCurrentEmployeeId();
        AnnouncementDto response = announcementService.getAnnouncementById(announcementId, effectiveEmployeeId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{announcementId}/read")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Mark announcement as read",
            description = "Record that the employee has viewed the announcement (read receipt)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Read receipt recorded"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<Void> markAsRead(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId,
            @Parameter(description = "Optional employee UUID; defaults to authenticated user") @RequestParam(required = false) UUID employeeId) {
        UUID effectiveEmployeeId = employeeId != null ? employeeId : SecurityContext.getCurrentEmployeeId();
        announcementService.markAsRead(announcementId, effectiveEmployeeId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{announcementId}/accept")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Accept announcement",
            description = "Explicitly acknowledge an announcement that requires acceptance (e.g. policy updates)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Acceptance recorded"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<Void> acceptAnnouncement(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId,
            @Parameter(description = "Optional employee UUID; defaults to authenticated user") @RequestParam(required = false) UUID employeeId) {
        UUID effectiveEmployeeId = employeeId != null ? employeeId : SecurityContext.getCurrentEmployeeId();
        announcementService.acceptAnnouncement(announcementId, effectiveEmployeeId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{announcementId}/pin")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Pin announcement",
            description = "Pin the announcement to the top of the feed (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcement pinned"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<AnnouncementDto> pinAnnouncement(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId) {
        return ResponseEntity.ok(announcementService.pinAnnouncement(announcementId));
    }

    @PostMapping("/{announcementId}/unpin")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Unpin announcement",
            description = "Remove the announcement from the pinned section (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcement unpinned"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<AnnouncementDto> unpinAnnouncement(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId) {
        return ResponseEntity.ok(announcementService.unpinAnnouncement(announcementId));
    }

    @DeleteMapping("/{announcementId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Delete announcement",
            description = "Soft-delete an announcement (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Announcement deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Announcement not found")
    })
    public ResponseEntity<Void> deleteAnnouncement(
            @Parameter(description = "Announcement UUID") @PathVariable UUID announcementId) {
        announcementService.deleteAnnouncement(announcementId);
        return ResponseEntity.noContent().build();
    }
}
