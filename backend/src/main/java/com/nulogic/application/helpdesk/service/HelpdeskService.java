package com.nulogic.application.helpdesk.service;

import com.nulogic.api.helpdesk.dto.*;
import com.nulogic.common.security.Permission;
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
import org.springframework.security.access.AccessDeniedException;
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

        // The requester is always the authenticated caller; employeeId/status/assignee/lifecycle
        // timestamps/dueDate in the body are client-supplied and deliberately ignored.
        UUID employeeId = requireCallerEmployeeId();
        log.info("Creating ticket for employee {} in tenant {}", employeeId, tenantId);

        // Verify employee exists within tenant (use exists check to avoid loading encrypted fields)
        if (!employeeRepository.existsByIdAndTenantId(employeeId, tenantId)) {
            throw new IllegalArgumentException("Employee not found");
        }

        TicketCategory category = null;
        if (request.getCategoryId() != null) {
            category = ticketCategoryRepository.findByIdAndTenantId(request.getCategoryId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        }

        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID());
        ticket.setTenantId(tenantId);
        ticket.setTicketNumber(generateTicketNumber(tenantId));
        ticket.setEmployeeId(employeeId);
        ticket.setCategoryId(request.getCategoryId());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority() != null ? request.getPriority() : Ticket.TicketPriority.MEDIUM);
        ticket.setStatus(Ticket.TicketStatus.OPEN);
        ticket.setTags(request.getTags());
        ticket.setAttachmentUrls(request.getAttachmentUrls());

        // Due date is server-derived from the category SLA
        if (category != null && category.getSlaHours() != null) {
            // S12-B: tenant-local SLA due-date for helpdesk ticket — resolved via TenantTimeService.
            ticket.setDueDate(tenantTimeService.now(tenantId).plusHours(category.getSlaHours()));
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
        assertCanHandleTicket(ticket);

        if (request.getCategoryId() != null && !request.getCategoryId().equals(ticket.getCategoryId())) {
            ticketCategoryRepository.findByIdAndTenantId(request.getCategoryId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        }
        // Reassignment goes through assignTicket (HELPDESK_TICKET_ASSIGN); lifecycle timestamps and
        // dueDate are server-set, so assignedTo/assignedAt/resolvedAt/closedAt/dueDate are ignored here.
        applyStatus(ticket, request.getStatus(), tenantId);
        ticket.setCategoryId(request.getCategoryId());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        if (request.getPriority() != null) {
            ticket.setPriority(request.getPriority());
        }
        ticket.setResolutionNotes(request.getResolutionNotes());
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
        assertCanHandleTicket(ticket);
        applyStatus(ticket, status, tenantId);

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
        UUID callerId = requireCallerEmployeeId();
        log.info("Adding comment to ticket {} by {} in tenant {}", request.getTicketId(), callerId, tenantId);

        Ticket ticket = loadAccessibleTicket(request.getTicketId(), tenantId);

        boolean internal = Boolean.TRUE.equals(request.getIsInternal());
        if (internal && !canSeeInternalComments(ticket)) {
            throw new AccessDeniedException("Only helpdesk agents may post internal comments");
        }

        // Verify commenter exists within tenant (use exists check to avoid loading encrypted fields)
        if (!employeeRepository.existsByIdAndTenantId(callerId, tenantId)) {
            throw new IllegalArgumentException("Commenter not found");
        }

        TicketComment comment = new TicketComment();
        comment.setId(UUID.randomUUID());
        comment.setTenantId(tenantId);
        comment.setTicketId(ticket.getId());
        // The author is always the authenticated caller; any commenterId in the body is ignored.
        comment.setCommenterId(callerId);
        comment.setComment(request.getComment());
        comment.setIsInternal(internal);
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
        assertCanModifyComment(comment);

        if (request.getIsInternal() != null) {
            if (Boolean.TRUE.equals(request.getIsInternal())) {
                Ticket ticket = ticketRepository.findByIdAndTenantId(comment.getTicketId(), tenantId)
                        .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
                if (!canSeeInternalComments(ticket)) {
                    throw new AccessDeniedException("Only helpdesk agents may mark comments as internal");
                }
            }
            comment.setIsInternal(request.getIsInternal());
        }
        comment.setComment(request.getComment());
        comment.setAttachmentUrls(request.getAttachmentUrls());

        TicketComment updatedComment = ticketCommentRepository.save(comment);
        return mapToTicketCommentResponse(updatedComment);
    }

    @Transactional(readOnly = true)
    public List<TicketCommentResponse> getCommentsByTicket(UUID ticketId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Ticket ticket = loadAccessibleTicket(ticketId, tenantId);
        boolean includeInternal = canSeeInternalComments(ticket);
        List<TicketComment> comments = ticketCommentRepository.findByTenantIdAndTicketId(tenantId, ticketId).stream()
                .filter(c -> includeInternal || !Boolean.TRUE.equals(c.getIsInternal()))
                .collect(Collectors.toList());
        String ticketNumber = ticket.getTicketNumber();
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
        assertCanModifyComment(comment);
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

    // ==================== Ticket State / Access Guards ====================

    private static final Map<Ticket.TicketStatus, Set<Ticket.TicketStatus>> ALLOWED_TRANSITIONS = Map.of(
            Ticket.TicketStatus.OPEN, EnumSet.of(Ticket.TicketStatus.IN_PROGRESS,
                    Ticket.TicketStatus.WAITING_FOR_RESPONSE, Ticket.TicketStatus.RESOLVED, Ticket.TicketStatus.CANCELLED),
            Ticket.TicketStatus.IN_PROGRESS, EnumSet.of(Ticket.TicketStatus.OPEN,
                    Ticket.TicketStatus.WAITING_FOR_RESPONSE, Ticket.TicketStatus.RESOLVED, Ticket.TicketStatus.CANCELLED),
            Ticket.TicketStatus.WAITING_FOR_RESPONSE, EnumSet.of(Ticket.TicketStatus.OPEN,
                    Ticket.TicketStatus.IN_PROGRESS, Ticket.TicketStatus.RESOLVED, Ticket.TicketStatus.CANCELLED),
            // RESOLVED -> OPEN/IN_PROGRESS is a reopen; CLOSED and CANCELLED are terminal
            Ticket.TicketStatus.RESOLVED, EnumSet.of(Ticket.TicketStatus.CLOSED,
                    Ticket.TicketStatus.OPEN, Ticket.TicketStatus.IN_PROGRESS),
            Ticket.TicketStatus.CLOSED, EnumSet.noneOf(Ticket.TicketStatus.class),
            Ticket.TicketStatus.CANCELLED, EnumSet.noneOf(Ticket.TicketStatus.class));

    /** Validates the transition and stamps lifecycle timestamps server-side. No-op for null/unchanged status. */
    private void applyStatus(Ticket ticket, Ticket.TicketStatus target, UUID tenantId) {
        Ticket.TicketStatus current = ticket.getStatus();
        if (target == null || target == current) return;
        if (!ALLOWED_TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw new IllegalStateException("Illegal ticket status transition: " + current + " -> " + target);
        }
        ticket.setStatus(target);
        if (target == Ticket.TicketStatus.RESOLVED) {
            ticket.setResolvedAt(tenantTimeService.now(tenantId));
        } else if (target == Ticket.TicketStatus.CLOSED) {
            ticket.setClosedAt(tenantTimeService.now(tenantId));
        } else if (current == Ticket.TicketStatus.RESOLVED) {
            ticket.setResolvedAt(null); // reopened
        }
    }

    /** Agents and the current assignee may work a ticket; the requester alone may not. */
    private void assertCanHandleTicket(Ticket ticket) {
        if (isHelpdeskAgent()) return;
        UUID self = requireCallerEmployeeId();
        if (!self.equals(ticket.getAssignedTo())) {
            throw new AccessDeniedException("Only a helpdesk agent or the ticket assignee may do this");
        }
    }

    /** Ticket-level guard for SLA escalation/metrics endpoints; returns normally only for agent or assignee. */
    @Transactional(readOnly = true)
    public void requireTicketHandlerAccess(UUID ticketId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        assertCanHandleTicket(ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found")));
    }

    /** Guard for escalating a ticket: caller handles the ticket and the target is an in-tenant employee. */
    @Transactional(readOnly = true)
    public void requireEscalationAccess(UUID ticketId, UUID escalatedTo) {
        requireTicketHandlerAccess(ticketId);
        if (!employeeRepository.existsByIdAndTenantId(escalatedTo, TenantContext.requireCurrentTenant())) {
            throw new IllegalArgumentException("Escalation target not found");
        }
    }

    /** CSAT guard: only the employee who raised the ticket may rate it. */
    @Transactional(readOnly = true)
    public void requireTicketOwner(UUID ticketId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        if (!requireCallerEmployeeId().equals(ticket.getEmployeeId())) {
            throw new AccessDeniedException("Only the ticket requester may rate this ticket");
        }
    }

    // ==================== Comment Access Control ====================

    /**
     * Same agent definition as HelpdeskController.isHelpdeskAgent: tenant-wide helpdesk triage rights.
     */
    private boolean isHelpdeskAgent() {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) return true;
        if (SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)) return true;
        return SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL);
    }

    private UUID requireCallerEmployeeId() {
        UUID self = SecurityContext.getCurrentEmployeeId();
        if (self == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return self;
    }

    private Ticket loadAccessibleTicket(UUID ticketId, UUID tenantId) {
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        assertCanAccessTicket(ticket);
        return ticket;
    }

    /**
     * Mirrors HelpdeskController.enforceTicketOwnershipCheck: agent, reporter, assignee,
     * or a manager of the reporter (VIEW_TEAM).
     */
    private void assertCanAccessTicket(Ticket ticket) {
        if (isHelpdeskAgent()) return;
        UUID self = requireCallerEmployeeId();
        if (self.equals(ticket.getEmployeeId())) return;
        if (self.equals(ticket.getAssignedTo())) return;
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)
                && SecurityContext.getAllReporteeIds().contains(ticket.getEmployeeId())) {
            return;
        }
        throw new AccessDeniedException("You are not authorized to access this ticket");
    }

    /**
     * Internal comments are visible to agents and to the working assignee, but never to the
     * requester (even when the requester is also the assignee).
     */
    private boolean canSeeInternalComments(Ticket ticket) {
        if (isHelpdeskAgent()) return true;
        UUID self = SecurityContext.getCurrentEmployeeId();
        return self != null
                && self.equals(ticket.getAssignedTo())
                && !self.equals(ticket.getEmployeeId());
    }

    private void assertCanModifyComment(TicketComment comment) {
        if (isHelpdeskAgent()) return;
        UUID self = requireCallerEmployeeId();
        if (!self.equals(comment.getCommenterId())) {
            throw new AccessDeniedException("Only the comment author or a helpdesk admin may modify this comment");
        }
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
