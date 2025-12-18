package com.hrms.api.announcement.controller;

import com.hrms.api.announcement.dto.AnnouncementDto;
import com.hrms.api.announcement.dto.CreateAnnouncementRequest;
import com.hrms.application.announcement.service.AnnouncementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
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
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @PostMapping
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<AnnouncementDto> createAnnouncement(
            @Valid @RequestBody CreateAnnouncementRequest request) {
        AnnouncementDto response = announcementService.createAnnouncement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{announcementId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<AnnouncementDto> updateAnnouncement(
            @PathVariable UUID announcementId,
            @Valid @RequestBody CreateAnnouncementRequest request) {
        AnnouncementDto response = announcementService.updateAnnouncement(announcementId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<AnnouncementDto>> getAllAnnouncements(Pageable pageable) {
        Page<AnnouncementDto> response = announcementService.getAllAnnouncements(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<AnnouncementDto>> getActiveAnnouncements(
            @RequestParam UUID employeeId,
            Pageable pageable) {
        Page<AnnouncementDto> response = announcementService.getActiveAnnouncements(employeeId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pinned")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<AnnouncementDto>> getPinnedAnnouncements() {
        List<AnnouncementDto> response = announcementService.getPinnedAnnouncements();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{announcementId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<AnnouncementDto> getAnnouncementById(
            @PathVariable UUID announcementId,
            @RequestParam(required = false) UUID employeeId) {
        AnnouncementDto response = announcementService.getAnnouncementById(announcementId, employeeId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{announcementId}/read")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID announcementId,
            @RequestParam UUID employeeId) {
        announcementService.markAsRead(announcementId, employeeId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{announcementId}/accept")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> acceptAnnouncement(
            @PathVariable UUID announcementId,
            @RequestParam UUID employeeId) {
        announcementService.acceptAnnouncement(announcementId, employeeId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{announcementId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<Void> deleteAnnouncement(@PathVariable UUID announcementId) {
        announcementService.deleteAnnouncement(announcementId);
        return ResponseEntity.noContent().build();
    }
}
