package com.hrms.api.helpdesk.controller;

import com.hrms.api.helpdesk.dto.*;
import com.hrms.application.helpdesk.service.HelpdeskService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.helpdesk.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/helpdesk")
@RequiredArgsConstructor
public class HelpdeskController {

    private final HelpdeskService helpdeskService;

    // ==================== Ticket Endpoints ====================

    @PostMapping("/tickets")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<TicketResponse> createTicket(@Valid @RequestBody TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(helpdeskService.createTicket(request));
    }

    @PutMapping("/tickets/{id}")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<TicketResponse> updateTicket(
            @PathVariable UUID id,
            @Valid @RequestBody TicketRequest request) {
        return ResponseEntity.ok(helpdeskService.updateTicket(id, request));
    }

    @PatchMapping("/tickets/{id}/status")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<TicketResponse> updateTicketStatus(
            @PathVariable UUID id,
            @RequestParam Ticket.TicketStatus status) {
        return ResponseEntity.ok(helpdeskService.updateTicketStatus(id, status));
    }

    @PatchMapping("/tickets/{id}/resolve")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<TicketResponse> resolveTicket(@PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.resolveTicket(id));
    }

    @PatchMapping("/tickets/{id}/close")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<TicketResponse> closeTicket(@PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.closeTicket(id));
    }

    @PatchMapping("/tickets/{id}/assign")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<TicketResponse> assignTicket(
            @PathVariable UUID id,
            @RequestParam UUID assigneeId) {
        return ResponseEntity.ok(helpdeskService.assignTicket(id, assigneeId));
    }

    @GetMapping("/tickets/{id}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.getTicketById(id));
    }

    @GetMapping("/tickets/number/{ticketNumber}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<TicketResponse> getTicketByNumber(@PathVariable String ticketNumber) {
        return ResponseEntity.ok(helpdeskService.getTicketByNumber(ticketNumber));
    }

    @GetMapping("/tickets")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<Page<TicketResponse>> getAllTickets(Pageable pageable) {
        return ResponseEntity.ok(helpdeskService.getAllTickets(pageable));
    }

    @GetMapping("/tickets/employee/{employeeId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<TicketResponse>> getTicketsByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(helpdeskService.getTicketsByEmployee(employeeId));
    }

    @GetMapping("/tickets/assignee/{assigneeId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<TicketResponse>> getTicketsByAssignee(@PathVariable UUID assigneeId) {
        return ResponseEntity.ok(helpdeskService.getTicketsByAssignee(assigneeId));
    }

    @GetMapping("/tickets/status/{status}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<TicketResponse>> getTicketsByStatus(@PathVariable Ticket.TicketStatus status) {
        return ResponseEntity.ok(helpdeskService.getTicketsByStatus(status));
    }

    @GetMapping("/tickets/category/{categoryId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<TicketResponse>> getTicketsByCategory(@PathVariable UUID categoryId) {
        return ResponseEntity.ok(helpdeskService.getTicketsByCategory(categoryId));
    }

    @DeleteMapping("/tickets/{id}")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<Void> deleteTicket(@PathVariable UUID id) {
        helpdeskService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Comment Endpoints ====================

    @PostMapping("/comments")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<TicketCommentResponse> addComment(@Valid @RequestBody TicketCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(helpdeskService.addComment(request));
    }

    @PutMapping("/comments/{id}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<TicketCommentResponse> updateComment(
            @PathVariable UUID id,
            @Valid @RequestBody TicketCommentRequest request) {
        return ResponseEntity.ok(helpdeskService.updateComment(id, request));
    }

    @GetMapping("/comments/ticket/{ticketId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<List<TicketCommentResponse>> getCommentsByTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(helpdeskService.getCommentsByTicket(ticketId));
    }

    @DeleteMapping("/comments/{id}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id) {
        helpdeskService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Category Endpoints ====================

    @PostMapping("/categories")
    @RequiresPermission(HELPDESK_CATEGORY_MANAGE)
    public ResponseEntity<TicketCategoryResponse> createCategory(@Valid @RequestBody TicketCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(helpdeskService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @RequiresPermission(HELPDESK_CATEGORY_MANAGE)
    public ResponseEntity<TicketCategoryResponse> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody TicketCategoryRequest request) {
        return ResponseEntity.ok(helpdeskService.updateCategory(id, request));
    }

    @GetMapping("/categories/{id}")
    @RequiresPermission(HELPDESK_TICKET_VIEW)
    public ResponseEntity<TicketCategoryResponse> getCategoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.getCategoryById(id));
    }

    @GetMapping("/categories")
    @RequiresPermission(HELPDESK_TICKET_VIEW)
    public ResponseEntity<List<TicketCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(helpdeskService.getAllCategories());
    }

    @GetMapping("/categories/active")
    @RequiresPermission(HELPDESK_TICKET_VIEW)
    public ResponseEntity<List<TicketCategoryResponse>> getActiveCategories() {
        return ResponseEntity.ok(helpdeskService.getActiveCategories());
    }

    @DeleteMapping("/categories/{id}")
    @RequiresPermission(HELPDESK_CATEGORY_MANAGE)
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        helpdeskService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
