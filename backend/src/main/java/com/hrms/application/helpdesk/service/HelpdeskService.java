package com.hrms.application.helpdesk.service;

import com.hrms.api.helpdesk.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.helpdesk.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.helpdesk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class HelpdeskService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final EmployeeRepository employeeRepository;

    // ==================== Ticket Operations ====================

    @Transactional
    public TicketResponse createTicket(TicketRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating ticket for employee {} in tenant {}", request.getEmployeeId(), tenantId);

        // Verify employee exists
        employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        Ticket ticket = new Ticket();
        ticket.setId(UUID.randomUUID());
        ticket.setTenantId(tenantId);
        ticket.setTicketNumber(generateTicketNumber());
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
                            ticket.setDueDate(LocalDateTime.now().plusHours(category.getSlaHours()));
                        }
                    });
        }

        Ticket savedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(savedTicket);
    }

    @Transactional
    public TicketResponse updateTicket(UUID ticketId, TicketRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating ticket {} status to {} for tenant {}", ticketId, status, tenantId);

        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setStatus(status);

        // Auto-set timestamps based on status
        if (status == Ticket.TicketStatus.RESOLVED && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(LocalDateTime.now());
        } else if (status == Ticket.TicketStatus.CLOSED && ticket.getClosedAt() == null) {
            ticket.setClosedAt(LocalDateTime.now());
        }

        Ticket updatedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(updatedTicket);
    }

    @Transactional
    public TicketResponse assignTicket(UUID ticketId, UUID assigneeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Assigning ticket {} to {} for tenant {}", ticketId, assigneeId, tenantId);

        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        // Verify assignee exists
        employeeRepository.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));

        ticket.setAssignedTo(assigneeId);
        ticket.setAssignedAt(LocalDateTime.now());

        // Update status to IN_PROGRESS if currently OPEN
        if (ticket.getStatus() == Ticket.TicketStatus.OPEN) {
            ticket.setStatus(Ticket.TicketStatus.IN_PROGRESS);
        }

        Ticket updatedTicket = ticketRepository.save(ticket);
        return mapToTicketResponse(updatedTicket);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(UUID ticketId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        return mapToTicketResponse(ticket);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketByNumber(String ticketNumber) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Ticket ticket = ticketRepository.findByTicketNumberAndTenantId(ticketNumber, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        return mapToTicketResponse(ticket);
    }

    @Transactional(readOnly = true)
    public Page<TicketResponse> getAllTickets(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToTicketResponse);
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(this::mapToTicketResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByAssignee(UUID assigneeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketRepository.findByTenantIdAndAssignedTo(tenantId, assigneeId).stream()
                .map(this::mapToTicketResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByStatus(Ticket.TicketStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToTicketResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByCategory(UUID categoryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketRepository.findByTenantIdAndCategoryId(tenantId, categoryId).stream()
                .map(this::mapToTicketResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteTicket(UUID ticketId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        ticketRepository.delete(ticket);
    }

    // ==================== Ticket Comment Operations ====================

    @Transactional
    public TicketCommentResponse addComment(TicketCommentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Adding comment to ticket {} by {} in tenant {}",
                request.getTicketId(), request.getCommenterId(), tenantId);

        // Verify ticket exists
        ticketRepository.findByIdAndTenantId(request.getTicketId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        // Verify commenter exists
        employeeRepository.findById(request.getCommenterId())
                .orElseThrow(() -> new IllegalArgumentException("Commenter not found"));

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
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketCommentRepository.findByTenantIdAndTicketId(tenantId, ticketId).stream()
                .map(this::mapToTicketCommentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteComment(UUID commentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TicketComment comment = ticketCommentRepository.findByIdAndTenantId(commentId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        ticketCommentRepository.delete(comment);
    }

    // ==================== Ticket Category Operations ====================

    @Transactional
    public TicketCategoryResponse createCategory(TicketCategoryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        TicketCategory category = ticketCategoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        return mapToTicketCategoryResponse(category);
    }

    @Transactional(readOnly = true)
    public List<TicketCategoryResponse> getAllCategories() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketCategoryRepository.findByTenantIdOrderByDisplayOrder(tenantId).stream()
                .map(this::mapToTicketCategoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketCategoryResponse> getActiveCategories() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return ticketCategoryRepository.findByTenantIdAndIsActive(tenantId, true).stream()
                .map(this::mapToTicketCategoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteCategory(UUID categoryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TicketCategory category = ticketCategoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        ticketCategoryRepository.delete(category);
    }

    // ==================== Helper Methods ====================

    private String generateTicketNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String randomPart = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "TKT-" + timestamp + "-" + randomPart;
    }

    private TicketResponse mapToTicketResponse(Ticket ticket) {
        String employeeName = employeeRepository.findById(ticket.getEmployeeId())
                .map(Employee::getFullName)
                .orElse(null);

        String assignedToName = null;
        if (ticket.getAssignedTo() != null) {
            assignedToName = employeeRepository.findById(ticket.getAssignedTo())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        String categoryName = null;
        if (ticket.getCategoryId() != null) {
            categoryName = ticketCategoryRepository.findById(ticket.getCategoryId())
                    .map(TicketCategory::getName)
                    .orElse(null);
        }

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
        String ticketNumber = ticketRepository.findById(comment.getTicketId())
                .map(Ticket::getTicketNumber)
                .orElse(null);

        String commenterName = employeeRepository.findById(comment.getCommenterId())
                .map(Employee::getFullName)
                .orElse(null);

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

    private TicketCategoryResponse mapToTicketCategoryResponse(TicketCategory category) {
        String defaultAssigneeName = null;
        if (category.getDefaultAssigneeId() != null) {
            defaultAssigneeName = employeeRepository.findById(category.getDefaultAssigneeId())
                    .map(Employee::getFullName)
                    .orElse(null);
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
