package com.nulogic.application.helpdesk.service;

import com.nulogic.api.helpdesk.dto.*;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.helpdesk.Ticket;
import com.nulogic.domain.helpdesk.TicketCategory;
import com.nulogic.domain.helpdesk.TicketComment;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.helpdesk.repository.TicketCategoryRepository;
import com.nulogic.infrastructure.helpdesk.repository.TicketCommentRepository;
import com.nulogic.infrastructure.helpdesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class HelpdeskService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final EmployeeRepository employeeRepository;
    private final TenantTimeService tenantTimeService;

    // ==================== Ticket Operations ====================

    @Transactional
    public TicketResponse createTicket(TicketRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // BUG-P1-010 FIX: Auto-resolve employeeId from SecurityContext when not provided
        UUID employeeId = request.getEmployeeId();
        if (employeeId == null) {
            employeeId = SecurityContext.getCurrentEmployeeId();
            if (employeeId == null) {
                throw new IllegalArgumentException("Employee ID is required");
            }
            request.setEmployeeId(employeeId);
        }

        log.info("Creating ticket for employee {} in tenant {}", request.getEmployeeId(), tenantId);

        // Verify employee exists within tenant (use exists check to avoid loading encrypted fields)
        if (!employeeRepository.existsByIdAndTenantId(request.getEmployeeId(), tenantId)) {
            throw new IllegalArgumentException("Employee not found");
        }

        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID());
        ticket.setTenantId(tenantId);
        ticket.setTicketNumber(generateTicketNumber(tenantId));
        ticket.setEmployeeId(request.getEmployeeId());
        ticket.setCategoryId(request.getCategoryId());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority() != null ? request.getPriority() : Ticket.TicketPriority.MEDIUM);
        ticket.setStatus(request.getStatus() != null ? request.getStatus() : Ticket.TicketStatus.OPEN);
        ticket.setAssignedTo(request.getAssignedTo());
        ticket.setAssignedAt(request.getAssignedAt());
        ticket.setResolvedAt(request.getResolvedAt());
        ticket.setClosedAt(request.getClosedAt());
        ticket.setResolutionNotes(request.getResolutionNotes());
        ticket.setDueDate(request.getDueDate());
        ticket.setTags(request.getTags());
        ticket.setAttachmentUrls(request.getAttachmentUrls());

        // Calculate due date based on category SLA if not provided
        if (ticket.getDueDate() == null && request.getCategoryId() != null) {
            ticketCategoryRepository.findByIdAndTenantId(request.getCategoryId(), tenantId)
                    .ifPresent(category -> {
                        if (category.getSlaHours() != null) {
                            // S12-B: tenant-local SLA due-date for helpdesk ticket — resolved via TenantTimeService.
                            ticket.setDueDate(tenantTimeService.now(tenantId).plusHours(category.getSlaHours()));
                        }
                    });
        }

        Ticket savedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(savedTicket);
    }

    @Transactional
    public TicketResponse updateTicket(UUID ticketId, TicketRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Updating ticket {} for tenant {}", ticketId, tenantId);

        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setCategoryId(request.getCategoryId());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority());
        ticket.setStatus(request.getStatus());
        ticket.setAssignedTo(request.getAssignedTo());
        ticket.setAssignedAt(request.getAssignedAt());
        ticket.setResolvedAt(request.getResolvedAt());
        ticket.setClosedAt(request.getClosedAt());
        ticket.setResolutionNotes(request.getResolutionNotes());
        ticket.setDueDate(request.getDueDate());
        ticket.setTags(request.getTags());
        ticket.setAttachmentUrls(request.getAttachmentUrls());

        Ticket updatedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(updatedTicket);
    }

    @Transactional
    public TicketResponse updateTicketStatus(UUID ticketId, Ticket.TicketStatus status) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Updating ticket {} status to {} for tenant {}", ticketId, status, tenantId);

        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setStatus(status);

        // Auto-set timestamps based on status
        if (status == Ticket.TicketStatus.RESOLVED && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(tenantTimeService.now(tenantId));
        } else if (status == Ticket.TicketStatus.CLOSED && ticket.getClosedAt() == null) {
            ticket.setClosedAt(tenantTimeService.now(tenantId));
        }

        Ticket updatedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(updatedTicket);
    }

    @Transactional
    public TicketResponse resolveTicket(UUID ticketId) {
        return updateTicketStatus(ticketId, Ticket.TicketStatus.RESOLVED);
    }

    @Transactional
    public TicketResponse closeTicket(UUID ticketId) {
        return updateTicketStatus(ticketId, Ticket.TicketStatus.CLOSED);
    }

    @Transactional
    public TicketResponse assignTicket(UUID ticketId, UUID assigneeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Assigning ticket {} to {} for tenant {}", ticketId, assigneeId, tenantId);

        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        // Verify assignee exists within tenant (use exists check to avoid loading encrypted fields)
        if (!employeeRepository.existsByIdAndTenantId(assigneeId, tenantId)) {
            throw new IllegalArgumentException("Assignee not found");
        }

        ticket.setAssignedTo(assigneeId);
        ticket.setAssignedAt(tenantTimeService.now(tenantId));

        // Update status to IN_PROGRESS if currently OPEN
        if (ticket.getStatus() == Ticket.TicketStatus.OPEN) {
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        }

        Ticket updatedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(updatedTicket);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(UUID ticketId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        return mapToTicketResponse(ticket);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketByNumber(String ticketNumber) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Ticket ticket = ticketRepository.findByTicketNumberAndTenantId(ticketNumber, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        return mapToTicketResponse(ticket);
    }

    @Transactional(readOnly = true)
    public Page<TicketResponse> getAllTickets(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<Ticket> page = ticketRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId), pageable);
        Map<UUID, String> nameMap = buildEmployeeNameMap(ticketEmployeeIds(page.getContent()), tenantId);
        Map<UUID, String> categoryNameMap = buildCategoryNameMap(tenantId);
        return page.map(t -> mapToTicketResponse(t, nameMap, categoryNameMap));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Ticket> tickets = ticketRepository.findByTenantIdAndEmployeeId(tenantId, employeeId);
        Map<UUID, String> nameMap = buildEmployeeNameMap(ticketEmployeeIds(tickets), tenantId);
        Map<UUID, String> categoryNameMap = buildCategoryNameMap(tenantId);
        return tickets.stream().map(t -> mapToTicketResponse(t, nameMap, categoryNameMap)).collect(Collectors.toList());
    }

    /**
     * RBAC-GF-5 FIX: Returns all tickets where the given employee is the reporter OR the assignee.
     * Used by getAllTickets when the caller only has EMPLOYEE_VIEW_SELF — they should see their own
     * submitted tickets as well as tickets currently assigned to them (e.g. after self-assignment).
     * Results are deduplicated by ticket ID to handle the overlap case.
     */
    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByCaller(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Ticket> reported = ticketRepository.findByTenantIdAndEmployeeId(tenantId, employeeId);
        List<Ticket> assigned = ticketRepository.findByTenantIdAndAssignedTo(tenantId, employeeId);
        // Merge and deduplicate — a ticket may appear in both lists if reporter == assignee
        Map<UUID, Ticket> merged = new java.util.LinkedHashMap<>();
        reported.forEach(t -> merged.put(t.getId(), t));
        assigned.forEach(t -> merged.putIfAbsent(t.getId(), t));
        List<Ticket> tickets = new java.util.ArrayList<>(merged.values());
        Map<UUID, String> nameMap = buildEmployeeNameMap(ticketEmployeeIds(tickets), tenantId);
        Map<UUID, String> categoryNameMap = buildCategoryNameMap(tenantId);
        return tickets.stream().map(t -> mapToTicketResponse(t, nameMap, categoryNameMap)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByAssignee(UUID assigneeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Ticket> tickets = ticketRepository.findByTenantIdAndAssignedTo(tenantId, assigneeId);
        Map<UUID, String> nameMap = buildEmployeeNameMap(ticketEmployeeIds(tickets), tenantId);
        Map<UUID, String> categoryNameMap = buildCategoryNameMap(tenantId);
        return tickets.stream().map(t -> mapToTicketResponse(t, nameMap, categoryNameMap)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByStatus(Ticket.TicketStatus status) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Ticket> tickets = ticketRepository.findByTenantIdAndStatus(tenantId, status);
        Map<UUID, String> nameMap = buildEmployeeNameMap(ticketEmployeeIds(tickets), tenantId);
        Map<UUID, String> categoryNameMap = buildCategoryNameMap(tenantId);
        return tickets.stream().map(t -> mapToTicketResponse(t, nameMap, categoryNameMap)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByCategory(UUID categoryId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Ticket> tickets = ticketRepository.findByTenantIdAndCategoryId(tenantId, categoryId);
        Map<UUID, String> nameMap = buildEmployeeNameMap(ticketEmployeeIds(tickets), tenantId);
        Map<UUID, String> categoryNameMap = buildCategoryNameMap(tenantId);
        return tickets.stream().map(t -> mapToTicketResponse(t, nameMap, categoryNameMap)).collect(Collectors.toList());
    }

    @Transactional
    public void deleteTicket(UUID ticketId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        ticketRepository.delete(ticket);
    }

    // ==================== Ticket Comment Operations ====================

    @Transactional
    public TicketCommentResponse addComment(TicketCommentRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Adding comment to ticket {} by {} in tenant {}",
                request.getTicketId(), request.getCommenterId(), tenantId);

        // Verify ticket exists
        ticketRepository.findByIdAndTenantId(request.getTicketId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        // Verify commenter exists within tenant (use exists check to avoid loading encrypted fields)
        if (!employeeRepository.existsByIdAndTenantId(request.getCommenterId(), tenantId)) {
            throw new IllegalArgumentException("Commenter not found");
        }

        TicketComment comment = new TicketComment();
        comment.setId(UUID.randomUUID());
        comment.setTenantId(tenantId);
        comment.setTicketId(request.getTicketId());
        comment.setCommenterId(request.getCommenterId());
        comment.setComment(request.getComment());
        comment.setIsInternal(request.getIsInternal() != null ? request.getIsInternal() : false);
        comment.setAttachmentUrls(request.getAttachmentUrls());

        TicketComment savedComment = ticketCommentRepository.save(comment);
        return mapToTicketCommentResponse(savedComment);
    }

    @Transactional
    public TicketCommentResponse updateComment(UUID commentId, TicketCommentRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Updating comment {} for tenant {}", commentId, tenantId);

        TicketComment comment = ticketCommentRepository.findByIdAndTenantId(commentId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        comment.setComment(request.getComment());
        comment.setIsInternal(request.getIsInternal());
        comment.setAttachmentUrls(request.getAttachmentUrls());

        TicketComment updatedComment = ticketCommentRepository.save(comment);
        return mapToTicketCommentResponse(updatedComment);
    }

    @Transactional(readOnly = true)
    public List<TicketCommentResponse> getCommentsByTicket(UUID ticketId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<TicketComment> comments = ticketCommentRepository.findByTenantIdAndTicketId(tenantId, ticketId);
        String ticketNumber = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .map(Ticket::getTicketNumber).orElse(null);
        Set<UUID> commenterIds = comments.stream().map(TicketComment::getCommenterId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> nameMap = buildEmployeeNameMap(commenterIds, tenantId);
        return comments.stream()
                .map(c -> mapToTicketCommentResponse(c, ticketNumber, nameMap))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteComment(UUID commentId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        TicketComment comment = ticketCommentRepository.findByIdAndTenantId(commentId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        ticketCommentRepository.delete(comment);
    }

    // ==================== Ticket Category Operations ====================

    @Transactional
    public TicketCategoryResponse createCategory(TicketCategoryRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Creating ticket category {} in tenant {}", request.getName(), tenantId);

        TicketCategory category = new TicketCategory();
        category.setId(UUID.randomUUID());
        category.setTenantId(tenantId);
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setDefaultAssigneeId(request.getDefaultAssigneeId());
        category.setSlaHours(request.getSlaHours());
        category.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        category.setDisplayOrder(request.getDisplayOrder());

        TicketCategory savedCategory = ticketCategoryRepository.save(category);
        return mapToTicketCategoryResponse(savedCategory);
    }

    @Transactional
    public TicketCategoryResponse updateCategory(UUID categoryId, TicketCategoryRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Updating ticket category {} for tenant {}", categoryId, tenantId);

        TicketCategory category = ticketCategoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setDefaultAssigneeId(request.getDefaultAssigneeId());
        category.setSlaHours(request.getSlaHours());
        category.setIsActive(request.getIsActive());
        category.setDisplayOrder(request.getDisplayOrder());

        TicketCategory updatedCategory = ticketCategoryRepository.save(category);
        return mapToTicketCategoryResponse(updatedCategory);
    }

    @Transactional(readOnly = true)
    public TicketCategoryResponse getCategoryById(UUID categoryId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        TicketCategory category = ticketCategoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        return mapToTicketCategoryResponse(category);
    }

    @Transactional(readOnly = true)
    public List<TicketCategoryResponse> getAllCategories() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return ticketCategoryRepository.findByTenantIdOrderByDisplayOrder(tenantId).stream()
                .map(this::mapToTicketCategoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketCategoryResponse> getActiveCategories() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return ticketCategoryRepository.findByTenantIdAndIsActive(tenantId, true).stream()
                .map(this::mapToTicketCategoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteCategory(UUID categoryId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        TicketCategory category = ticketCategoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        ticketCategoryRepository.delete(category);
    }

    // ==================== Helper Methods ====================

    private String generateTicketNumber(UUID tenantId) {
        String timestamp = tenantTimeService.now(tenantId).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String randomPart = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "TKT-" + timestamp + "-" + randomPart;
    }

    /**
     * BUG-HELP-001 FIX: Use projection query (findFullNameById) instead of loading
     * the full Employee entity. Loading the full entity triggers EncryptedStringConverter
     * on taxId/bankAccountNumber fields, which can throw and mark the transaction as
     * rollback-only, causing HTTP 500 on ticket creation and listing.
     */
    private TicketResponse mapToTicketResponse(Ticket ticket) {
        UUID tenantId = ticket.getTenantId();
        String employeeName = safeGetEmployeeName(ticket.getEmployeeId());
        String assignedToName = ticket.getAssignedTo() != null ? safeGetEmployeeName(ticket.getAssignedTo()) : null;
        String categoryName = ticket.getCategoryId() != null
                ? ticketCategoryRepository.findById(ticket.getCategoryId()).map(TicketCategory::getName).orElse(null)
                : null;
        return buildTicketResponse(ticket, employeeName, assignedToName, categoryName);
    }

    private TicketResponse mapToTicketResponse(Ticket ticket, Map<UUID, String> nameMap, Map<UUID, String> categoryNameMap) {
        String employeeName = ticket.getEmployeeId() != null ? nameMap.get(ticket.getEmployeeId()) : null;
        String assignedToName = ticket.getAssignedTo() != null ? nameMap.get(ticket.getAssignedTo()) : null;
        String categoryName = ticket.getCategoryId() != null ? categoryNameMap.get(ticket.getCategoryId()) : null;
        return buildTicketResponse(ticket, employeeName, assignedToName, categoryName);
    }

    private TicketResponse buildTicketResponse(Ticket ticket, String employeeName, String assignedToName, String categoryName) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .tenantId(ticket.getTenantId())
                .ticketNumber(ticket.getTicketNumber())
                .employeeId(ticket.getEmployeeId())
                .employeeName(employeeName)
                .categoryId(ticket.getCategoryId())
                .categoryName(categoryName)
                .subject(ticket.getSubject())
                .description(ticket.getDescription())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .assignedTo(ticket.getAssignedTo())
                .assignedToName(assignedToName)
                .assignedAt(ticket.getAssignedAt())
                .resolvedAt(ticket.getResolvedAt())
                .closedAt(ticket.getClosedAt())
                .resolutionNotes(ticket.getResolutionNotes())
                .dueDate(ticket.getDueDate())
                .tags(ticket.getTags())
                .attachmentUrls(ticket.getAttachmentUrls())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }

    private TicketCommentResponse mapToTicketCommentResponse(TicketComment comment) {
        String ticketNumber = ticketRepository.findByIdAndTenantId(comment.getTicketId(), comment.getTenantId())
                .map(Ticket::getTicketNumber).orElse(null);
        String commenterName = safeGetEmployeeName(comment.getCommenterId());
        return TicketCommentResponse.builder()
                .id(comment.getId()).tenantId(comment.getTenantId()).ticketId(comment.getTicketId())
                .ticketNumber(ticketNumber).commenterId(comment.getCommenterId()).commenterName(commenterName)
                .comment(comment.getComment()).isInternal(comment.getIsInternal())
                .attachmentUrls(comment.getAttachmentUrls()).createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt()).build();
    }

    private TicketCommentResponse mapToTicketCommentResponse(TicketComment comment, String ticketNumber, Map<UUID, String> nameMap) {
        String commenterName = comment.getCommenterId() != null ? nameMap.get(comment.getCommenterId()) : null;
        return TicketCommentResponse.builder()
                .id(comment.getId())
                .tenantId(comment.getTenantId())
                .ticketId(comment.getTicketId())
                .ticketNumber(ticketNumber)
                .commenterId(comment.getCommenterId())
                .commenterName(commenterName)
                .comment(comment.getComment())
                .isInternal(comment.getIsInternal())
                .attachmentUrls(comment.getAttachmentUrls())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private Set<UUID> ticketEmployeeIds(List<Ticket> tickets) {
        return tickets.stream()
                .flatMap(t -> Stream.of(t.getEmployeeId(), t.getAssignedTo()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Map<UUID, String> buildEmployeeNameMap(Set<UUID> ids, UUID tenantId) {
        if (ids.isEmpty()) return Collections.emptyMap();
        return employeeRepository.findFullNamesByIdsAndTenantId(ids, tenantId).stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (String) row[1]));
    }

    private Map<UUID, String> buildCategoryNameMap(UUID tenantId) {
        return ticketCategoryRepository.findByTenantIdOrderByDisplayOrder(tenantId).stream()
                .collect(Collectors.toMap(TicketCategory::getId, TicketCategory::getName));
    }

    /**
     * Safely get employee full name using projection query to avoid loading
     * encrypted fields that may cause transaction rollback.
     */
    private String safeGetEmployeeName(UUID employeeId) {
        if (employeeId == null) return null;
        try {
            return employeeRepository.findFullNameById(employeeId).orElse(null);
        } catch (Exception e) {
            log.warn("Failed to resolve employee name for {}: {}", employeeId, e.getMessage());
            return null;
        }
    }

    private TicketCategoryResponse mapToTicketCategoryResponse(TicketCategory category) {
        String defaultAssigneeName = null;
        if (category.getDefaultAssigneeId() != null) {
            defaultAssigneeName = safeGetEmployeeName(category.getDefaultAssigneeId());
        }

        return TicketCategoryResponse.builder()
                .id(category.getId())
                .tenantId(category.getTenantId())
                .name(category.getName())
                .description(category.getDescription())
                .defaultAssigneeId(category.getDefaultAssigneeId())
                .defaultAssigneeName(defaultAssigneeName)
                .slaHours(category.getSlaHours())
                .isActive(category.getIsActive())
                .displayOrder(category.getDisplayOrder())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}
