package com.hrms.application.announcement.service;

import com.hrms.api.announcement.dto.AnnouncementDto;
import com.hrms.api.announcement.dto.CreateAnnouncementRequest;
import com.hrms.api.wall.dto.CreatePostRequest;
import com.hrms.api.wall.dto.WallPostResponse;
import com.hrms.application.common.service.ContentViewService;
import com.hrms.application.wall.service.WallService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.announcement.Announcement;
import com.hrms.domain.announcement.Announcement.*;
import com.hrms.domain.announcement.AnnouncementRead;
import com.hrms.domain.common.ContentView.ContentType;
import com.hrms.domain.wall.model.WallPost;
import com.hrms.infrastructure.announcement.repository.AnnouncementRepository;
import com.hrms.infrastructure.announcement.repository.AnnouncementReadRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.wall.repository.PostReactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementReadRepository announcementReadRepository;
    private final EmployeeRepository employeeRepository;
    private final ContentViewService contentViewService;
    private final WallService wallService;
    private final PostReactionRepository postReactionRepository;

    @Transactional
    public AnnouncementDto createAnnouncement(CreateAnnouncementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        // BUG-FIX: Use employeeId for employee table lookups (userId != employeeId)
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        UUID lookupId = employeeId != null ? employeeId : userId;

        String publisherName = "System";
        if (lookupId != null) {
            publisherName = employeeRepository.findByIdAndTenantId(lookupId, tenantId)
                    .map(emp -> emp.getFirstName() + " " + emp.getLastName())
                    .orElse("System");
        }

        Announcement announcement = Announcement.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(request.getCategory() != null ? request.getCategory() : AnnouncementCategory.GENERAL)
                .priority(request.getPriority() != null ? request.getPriority() : AnnouncementPriority.MEDIUM)
                .targetAudience(request.getTargetAudience() != null ? request.getTargetAudience() : TargetAudience.ALL_EMPLOYEES)
                .targetDepartmentIds(request.getTargetDepartmentIds() != null ? request.getTargetDepartmentIds() : Set.of())
                .targetEmployeeIds(request.getTargetEmployeeIds() != null ? request.getTargetEmployeeIds() : Set.of())
                .expiresAt(request.getExpiresAt())
                .isPinned(request.getIsPinned() != null && request.getIsPinned())
                .sendEmail(request.getSendEmail() != null && request.getSendEmail())
                .attachmentUrl(request.getAttachmentUrl())
                .requiresAcceptance(request.getRequiresAcceptance() != null && request.getRequiresAcceptance())
                .build();

        announcement.setTenantId(tenantId);
        announcement.publish(userId, publisherName);

        announcement = announcementRepository.save(announcement);

        // Create wall post for social features (reactions/comments)
        // BUG-FIX: Use employeeId (not userId) since WallService looks up the employee table
        try {
            CreatePostRequest wallPostRequest = new CreatePostRequest();
            wallPostRequest.setType(WallPost.PostType.POST);
            wallPostRequest.setContent(announcement.getContent());
            wallPostRequest.setVisibility(WallPost.PostVisibility.ORGANIZATION);

            WallPostResponse wallPost = wallService.createPost(wallPostRequest, lookupId);
            announcement.setWallPostId(wallPost.getId());
            announcement = announcementRepository.save(announcement);
            log.info("Created wall post {} for announcement {}", wallPost.getId(), announcement.getId());
        } catch (Exception e) { // Intentional broad catch — notification delivery error boundary
            log.error("Failed to create wall post for announcement {}: {}", announcement.getId(), e.getMessage());
            // Don't fail the announcement if wall post creation fails
        }

        log.info("Created announcement: {} by {}", announcement.getTitle(), publisherName);

        return AnnouncementDto.fromEntity(announcement);
    }

    @Transactional
    public AnnouncementDto updateAnnouncement(UUID announcementId, CreateAnnouncementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        announcement.setTitle(request.getTitle());
        announcement.setContent(request.getContent());
        if (request.getCategory() != null) announcement.setCategory(request.getCategory());
        if (request.getPriority() != null) announcement.setPriority(request.getPriority());
        if (request.getTargetAudience() != null) announcement.setTargetAudience(request.getTargetAudience());
        if (request.getTargetDepartmentIds() != null) announcement.setTargetDepartmentIds(request.getTargetDepartmentIds());
        if (request.getTargetEmployeeIds() != null) announcement.setTargetEmployeeIds(request.getTargetEmployeeIds());
        announcement.setExpiresAt(request.getExpiresAt());
        if (request.getIsPinned() != null) announcement.setIsPinned(request.getIsPinned());
        if (request.getSendEmail() != null) announcement.setSendEmail(request.getSendEmail());
        announcement.setAttachmentUrl(request.getAttachmentUrl());
        if (request.getRequiresAcceptance() != null) announcement.setRequiresAcceptance(request.getRequiresAcceptance());

        announcement = announcementRepository.save(announcement);
        log.info("Updated announcement: {}", announcement.getTitle());

        return AnnouncementDto.fromEntity(announcement);
    }

    @Transactional(readOnly = true)
    public Page<AnnouncementDto> getAllAnnouncements(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        return announcementRepository.findActiveAnnouncements(tenantId, LocalDateTime.now(), pageable)
                .map(a -> enrichAnnouncementDto(AnnouncementDto.fromEntity(a), currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<AnnouncementDto> getActiveAnnouncements(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Get employee's department for filtering
        UUID employeeDepartmentId = null;
        boolean isManager = false;
        LocalDateTime joinDate = null;

        var employeeOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
        if (employeeOpt.isPresent()) {
            var employee = employeeOpt.get();
            employeeDepartmentId = employee.getDepartmentId();
            isManager = employee.getManagerId() == null ||
                    employeeRepository.findDirectReportsByManagerId(tenantId, employeeId).size() > 0;
            joinDate = employee.getJoiningDate() != null ? employee.getJoiningDate().atStartOfDay() : null;
        }

        List<AnnouncementRead> employeeReads = announcementReadRepository.findByEmployeeIdAndTenantId(employeeId, tenantId);

        Set<UUID> readAnnouncementIds = employeeReads.stream()
                .map(AnnouncementRead::getAnnouncementId)
                .collect(Collectors.toSet());

        Map<UUID, AnnouncementRead> readMap = employeeReads.stream()
                .collect(Collectors.toMap(AnnouncementRead::getAnnouncementId, r -> r));

        // Apply targeting filter
        final UUID finalDepartmentId = employeeDepartmentId;
        final boolean finalIsManager = isManager;
        final LocalDateTime finalJoinDate = joinDate;

        Page<Announcement> announcements = announcementRepository.findActiveAnnouncements(tenantId, LocalDateTime.now(), pageable);

        List<AnnouncementDto> filteredDtos = announcements.getContent().stream()
                .filter(a -> isAnnouncementVisibleToEmployee(a, employeeId, finalDepartmentId, finalIsManager, finalJoinDate))
                .map(a -> {
                    AnnouncementDto dto = AnnouncementDto.fromEntity(a);
                    dto.setIsRead(readAnnouncementIds.contains(a.getId()));
                    AnnouncementRead readRecord = readMap.get(a.getId());
                    if (readRecord != null) {
                        dto.setIsAccepted(readRecord.getIsAccepted());
                        dto.setAcceptedAt(readRecord.getAcceptedAt());
                    }
                    // Enrich with reaction status
                    return enrichAnnouncementDto(dto, employeeId);
                })
                .collect(Collectors.toList());

        return new PageImpl<>(filteredDtos, pageable, filteredDtos.size());
    }

    /**
     * Check if an announcement is visible to a specific employee based on targeting rules
     */
    private boolean isAnnouncementVisibleToEmployee(Announcement announcement, UUID employeeId,
                                                    UUID employeeDepartmentId, boolean isManager,
                                                    LocalDateTime joinDate) {
        if (announcement.getTargetAudience() == null) {
            return true; // Default to visible
        }

        switch (announcement.getTargetAudience()) {
            case ALL_EMPLOYEES:
                return true;

            case SPECIFIC_DEPARTMENTS:
                // Check if employee's department is in the target list
                if (employeeDepartmentId == null) {
                    return false;
                }
                Set<UUID> targetDepts = announcement.getTargetDepartmentIds();
                return targetDepts != null && targetDepts.contains(employeeDepartmentId);

            case SPECIFIC_EMPLOYEES:
                // Check if employee is in the target list
                Set<UUID> targetEmployees = announcement.getTargetEmployeeIds();
                return targetEmployees != null && targetEmployees.contains(employeeId);

            case MANAGERS_ONLY:
                return isManager;

            case NEW_JOINERS:
                // Consider employees who joined in the last 90 days as new joiners
                if (joinDate == null) {
                    return false;
                }
                LocalDateTime ninetyDaysAgo = LocalDateTime.now().minusDays(90);
                return joinDate.isAfter(ninetyDaysAgo);

            default:
                return true;
        }
    }

    @Transactional(readOnly = true)
    public List<AnnouncementDto> getPinnedAnnouncements() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return announcementRepository.findPinnedAnnouncements(tenantId, LocalDateTime.now())
                .stream()
                .map(AnnouncementDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AnnouncementDto getAnnouncementById(UUID announcementId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        AnnouncementDto dto = AnnouncementDto.fromEntity(announcement);

        if (employeeId != null) {
            announcementReadRepository.findByAnnouncementIdAndEmployeeIdAndTenantId(
                            announcementId, employeeId, tenantId)
                    .ifPresent(readRecord -> {
                        dto.setIsRead(true);
                        dto.setIsAccepted(readRecord.getIsAccepted());
                        dto.setAcceptedAt(readRecord.getAcceptedAt());
                    });
        }

        return dto;
    }

    @Transactional
    public void markAsRead(UUID announcementId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if already read
        if (announcementReadRepository.existsByAnnouncementIdAndEmployeeIdAndTenantId(
                announcementId, employeeId, tenantId)) {
            // Still record in generic view system (tracks repeat views)
            contentViewService.recordView(ContentType.ANNOUNCEMENT, announcementId, employeeId, "direct");
            return;
        }

        // Get announcement and increment read count
        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        announcement.incrementReadCount();
        announcementRepository.save(announcement);

        // Record the read
        AnnouncementRead read = AnnouncementRead.builder()
                .announcementId(announcementId)
                .employeeId(employeeId)
                .readAt(LocalDateTime.now())
                .build();
        read.setTenantId(tenantId);
        announcementReadRepository.save(read);

        // Also record in generic content view system
        contentViewService.recordView(ContentType.ANNOUNCEMENT, announcementId, employeeId, "direct");

        log.debug("Marked announcement {} as read by employee {}", announcementId, employeeId);
    }

    public void acceptAnnouncement(UUID announcementId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Get announcement
        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        // Check if requires acceptance
        if (!Boolean.TRUE.equals(announcement.getRequiresAcceptance())) {
            log.warn("Announcement {} does not require acceptance", announcementId);
            return;
        }

        // Find or create read record
        AnnouncementRead readRecord = announcementReadRepository
                .findByAnnouncementIdAndEmployeeIdAndTenantId(announcementId, employeeId, tenantId)
                .orElseGet(() -> {
                    AnnouncementRead newRead = AnnouncementRead.builder()
                            .announcementId(announcementId)
                            .employeeId(employeeId)
                            .readAt(LocalDateTime.now())
                            .build();
                    newRead.setTenantId(tenantId);
                    announcement.incrementReadCount();
                    return newRead;
                });

        // Check if already accepted
        if (Boolean.TRUE.equals(readRecord.getIsAccepted())) {
            return;
        }

        // Accept
        readRecord.accept();
        announcementReadRepository.save(readRecord);

        announcement.incrementAcceptedCount();
        announcementRepository.save(announcement);

        log.info("Announcement {} accepted by employee {}", announcementId, employeeId);
    }

    @Transactional
    public AnnouncementDto pinAnnouncement(UUID announcementId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        announcement.setIsPinned(true);
        announcement = announcementRepository.save(announcement);
        log.info("Pinned announcement: {}", announcementId);

        return AnnouncementDto.fromEntity(announcement);
    }

    @Transactional
    public AnnouncementDto unpinAnnouncement(UUID announcementId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        announcement.setIsPinned(false);
        announcement = announcementRepository.save(announcement);
        log.info("Unpinned announcement: {}", announcementId);

        return AnnouncementDto.fromEntity(announcement);
    }

    @Transactional
    public void deleteAnnouncement(UUID announcementId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Announcement announcement = announcementRepository.findByIdAndTenantId(announcementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        announcementRepository.delete(announcement);
        log.info("Deleted announcement: {}", announcementId);
    }

    /**
     * Enrich announcement DTO with user-specific data (hasReacted status)
     */
    private AnnouncementDto enrichAnnouncementDto(AnnouncementDto dto, UUID currentUserId) {
        if (dto.getWallPostId() != null && currentUserId != null) {
            boolean hasReacted = postReactionRepository.findByPostIdAndEmployeeId(
                    dto.getWallPostId(), currentUserId
            ).isPresent();
            dto.setHasReacted(hasReacted);
        }
        return dto;
    }
}
