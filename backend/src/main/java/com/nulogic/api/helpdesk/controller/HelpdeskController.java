package com.nulogic.api.helpdesk.controller;

import com.nulogic.api.helpdesk.dto.*;
import com.nulogic.application.helpdesk.service.HelpdeskService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import org.springframework.security.access.AccessDeniedException;
import com.nulogic.domain.helpdesk.Ticket;
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
import java.util.Set;
import java.util.UUID;

import static com.nulogic.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/helpdesk")
@RequiredArgsConstructor
@Tag(name = "Helpdesk", description = "Helpdesk ticket lifecycle, comments, and category configuration")
public class HelpdeskController {

    private final HelpdeskService helpdeskService;

    // ==================== Ticket Endpoints ====================

    @PostMapping("/tickets")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Create helpdesk ticket", description = "Submit a new helpdesk ticket; defaults to OPEN status")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Ticket created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated")
    })
    public ResponseEntity<TicketResponse> createTicket(@Valid @RequestBody TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(helpdeskService.createTicket(request));
    }

    @PutMapping("/tickets/{id}")
    @RequiresPermission(HELPDESK_TICKET_RESOLVE)
    @Operation(summary = "Update ticket", description = "Mutate a ticket's content or metadata (resolver/admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    public ResponseEntity<TicketResponse> updateTicket(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id,
            @Valid @RequestBody TicketRequest request) {
        return ResponseEntity.ok(helpdeskService.updateTicket(id, request));
    }

    @PatchMapping("/tickets/{id}/status")
    @RequiresPermission(HELPDESK_TICKET_RESOLVE)
    @Operation(summary = "Update ticket status",
            description = "Transition a ticket to a new status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, etc.)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "404", description = "Ticket not found"),
            @ApiResponse(responseCode = "409", description = "Illegal status transition")
    })
    public ResponseEntity<TicketResponse> updateTicketStatus(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id,
            @Parameter(description = "Target status", example = "IN_PROGRESS") @RequestParam Ticket.TicketStatus status) {
        return ResponseEntity.ok(helpdeskService.updateTicketStatus(id, status));
    }

    @PatchMapping("/tickets/{id}/resolve")
    @RequiresPermission(HELPDESK_TICKET_RESOLVE)
    @Operation(summary = "Resolve ticket", description = "Mark a ticket as RESOLVED (pending requester confirmation to close)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket resolved successfully"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    public ResponseEntity<TicketResponse> resolveTicket(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.resolveTicket(id));
    }

    @PatchMapping("/tickets/{id}/close")
    @RequiresPermission(HELPDESK_TICKET_RESOLVE)
    @Operation(summary = "Close ticket", description = "Permanently close a resolved ticket")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket closed successfully"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    public ResponseEntity<TicketResponse> closeTicket(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.closeTicket(id));
    }

    @PatchMapping("/tickets/{id}/assign")
    @RequiresPermission(HELPDESK_TICKET_ASSIGN)
    @Operation(summary = "Assign ticket", description = "Assign a ticket to a specific employee (assignee)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket assigned successfully"),
            @ApiResponse(responseCode = "404", description = "Ticket or assignee not found")
    })
    public ResponseEntity<TicketResponse> assignTicket(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id,
            @Parameter(description = "Assignee employee UUID") @RequestParam UUID assigneeId) {
        return ResponseEntity.ok(helpdeskService.assignTicket(id, assigneeId));
    }

    @GetMapping("/tickets/{id}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get ticket by ID", description = "Returns a single ticket by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket found"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    public ResponseEntity<TicketResponse> getTicketById(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.getTicketById(id));
    }

    @GetMapping("/tickets/number/{ticketNumber}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Get ticket by ticket number",
            description = "Returns a single ticket by its human-readable ticket number")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket found"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    public ResponseEntity<TicketResponse> getTicketByNumber(
            @Parameter(description = "Ticket number", example = "TKT-2026-00123") @PathVariable String ticketNumber) {
        return ResponseEntity.ok(helpdeskService.getTicketByNumber(ticketNumber));
    }

    @GetMapping("/tickets")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List all tickets", description = "Returns a paginated list of helpdesk tickets")
    @ApiResponse(responseCode = "200", description = "Tickets retrieved successfully")
    public ResponseEntity<Page<TicketResponse>> getAllTickets(Pageable pageable) {
        return ResponseEntity.ok(helpdeskService.getAllTickets(pageable));
    }

    @GetMapping("/tickets/employee/{employeeId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List tickets by reporter employee",
            description = "Returns tickets raised by the specified employee")
    @ApiResponse(responseCode = "200", description = "Tickets retrieved successfully")
    public ResponseEntity<List<TicketResponse>> getTicketsByEmployee(
            @Parameter(description = "Reporter employee UUID") @PathVariable UUID employeeId) {
        enforceHelpdeskViewScope(employeeId);
        return ResponseEntity.ok(helpdeskService.getTicketsByEmployee(employeeId));
    }

    @GetMapping("/tickets/assignee/{assigneeId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List tickets by assignee",
            description = "Returns tickets currently assigned to the specified employee")
    @ApiResponse(responseCode = "200", description = "Tickets retrieved successfully")
    public ResponseEntity<List<TicketResponse>> getTicketsByAssignee(
            @Parameter(description = "Assignee employee UUID") @PathVariable UUID assigneeId) {
        enforceHelpdeskViewScope(assigneeId);
        return ResponseEntity.ok(helpdeskService.getTicketsByAssignee(assigneeId));
    }

    @GetMapping("/tickets/status/{status}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List tickets by status",
            description = "Filter tickets by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, etc.)")
    @ApiResponse(responseCode = "200", description = "Tickets retrieved successfully")
    public ResponseEntity<List<TicketResponse>> getTicketsByStatus(
            @Parameter(description = "Ticket status", example = "OPEN") @PathVariable Ticket.TicketStatus status) {
        return ResponseEntity.ok(helpdeskService.getTicketsByStatus(status));
    }

    @GetMapping("/tickets/category/{categoryId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List tickets by category", description = "Filter tickets by category UUID")
    @ApiResponse(responseCode = "200", description = "Tickets retrieved successfully")
    public ResponseEntity<List<TicketResponse>> getTicketsByCategory(
            @Parameter(description = "Category UUID") @PathVariable UUID categoryId) {
        return ResponseEntity.ok(helpdeskService.getTicketsByCategory(categoryId));
    }

    @DeleteMapping("/tickets/{id}")
    @RequiresPermission(HELPDESK_TICKET_MANAGE)
    @Operation(summary = "Delete ticket", description = "Soft-delete a ticket (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Ticket deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    public ResponseEntity<Void> deleteTicket(
            @Parameter(description = "Ticket UUID") @PathVariable UUID id) {
        helpdeskService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Comment Endpoints ====================

    @PostMapping("/comments")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Add ticket comment", description = "Append a comment to an existing ticket")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Comment added successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Parent ticket not found")
    })
    public ResponseEntity<TicketCommentResponse> addComment(@Valid @RequestBody TicketCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(helpdeskService.addComment(request));
    }

    @PutMapping("/comments/{id}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Update ticket comment", description = "Edit an existing ticket comment (author or admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Comment updated successfully"),
            @ApiResponse(responseCode = "404", description = "Comment not found")
    })
    public ResponseEntity<TicketCommentResponse> updateComment(
            @Parameter(description = "Comment UUID") @PathVariable UUID id,
            @Valid @RequestBody TicketCommentRequest request) {
        return ResponseEntity.ok(helpdeskService.updateComment(id, request));
    }

    @GetMapping("/comments/ticket/{ticketId}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List comments for a ticket", description = "Returns the full comment thread for a ticket")
    @ApiResponse(responseCode = "200", description = "Comments retrieved successfully")
    public ResponseEntity<List<TicketCommentResponse>> getCommentsByTicket(
            @Parameter(description = "Ticket UUID") @PathVariable UUID ticketId) {
        return ResponseEntity.ok(helpdeskService.getCommentsByTicket(ticketId));
    }

    @DeleteMapping("/comments/{id}")
    @RequiresPermission({SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "Delete ticket comment", description = "Remove a ticket comment (author or admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Comment deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Comment not found")
    })
    public ResponseEntity<Void> deleteComment(
            @Parameter(description = "Comment UUID") @PathVariable UUID id) {
        helpdeskService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Category Endpoints ====================

    @PostMapping("/categories")
    @RequiresPermission(HELPDESK_CATEGORY_MANAGE)
    @Operation(summary = "Create ticket category",
            description = "Create a new helpdesk ticket category (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Category created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public ResponseEntity<TicketCategoryResponse> createCategory(@Valid @RequestBody TicketCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(helpdeskService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @RequiresPermission(HELPDESK_CATEGORY_MANAGE)
    @Operation(summary = "Update ticket category", description = "Mutate an existing ticket category (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Category updated successfully"),
            @ApiResponse(responseCode = "404", description = "Category not found")
    })
    public ResponseEntity<TicketCategoryResponse> updateCategory(
            @Parameter(description = "Category UUID") @PathVariable UUID id,
            @Valid @RequestBody TicketCategoryRequest request) {
        return ResponseEntity.ok(helpdeskService.updateCategory(id, request));
    }

    @GetMapping("/categories/{id}")
    @RequiresPermission(HELPDESK_TICKET_VIEW)
    @Operation(summary = "Get ticket category by ID", description = "Returns a single ticket category by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Category found"),
            @ApiResponse(responseCode = "404", description = "Category not found")
    })
    public ResponseEntity<TicketCategoryResponse> getCategoryById(
            @Parameter(description = "Category UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(helpdeskService.getCategoryById(id));
    }

    @GetMapping("/categories")
    @RequiresPermission(HELPDESK_TICKET_VIEW)
    @Operation(summary = "List all ticket categories", description = "Returns all helpdesk categories (active and inactive)")
    @ApiResponse(responseCode = "200", description = "Categories retrieved successfully")
    public ResponseEntity<List<TicketCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(helpdeskService.getAllCategories());
    }

    @GetMapping("/categories/active")
    @RequiresPermission(HELPDESK_TICKET_VIEW)
    @Operation(summary = "List active ticket categories",
            description = "Returns only categories currently active for ticket creation")
    @ApiResponse(responseCode = "200", description = "Active categories retrieved successfully")
    public ResponseEntity<List<TicketCategoryResponse>> getActiveCategories() {
        return ResponseEntity.ok(helpdeskService.getActiveCategories());
    }

    @DeleteMapping("/categories/{id}")
    @RequiresPermission(HELPDESK_CATEGORY_MANAGE)
    @Operation(summary = "Delete ticket category", description = "Soft-delete a ticket category (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Category deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Category not found")
    })
    public ResponseEntity<Void> deleteCategory(
            @Parameter(description = "Category UUID") @PathVariable UUID id) {
        helpdeskService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
    /**
     * IDOR FIX: Enforces ownership scope on /tickets/employee/{employeeId} and
     * /tickets/assignee/{assigneeId} endpoints.
     * Scope hierarchy: HELPDESK_TICKET_MANAGE (tenant-wide) > VIEW_TEAM (reportees) > VIEW_SELF.
     * Department-level scope is omitted for helpdesk: ticket ownership is personal/assignee-based
     * and does not follow department boundaries, so VIEW_DEPARTMENT would create false access.
     * SuperAdmin and TenantAdmin bypass all scope checks.
     */
    private void enforceHelpdeskViewScope(UUID targetEmployeeId) {
        // SuperAdmin and TenantAdmin bypass all scope checks
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) {
            return;
        }

        // HELPDESK_TICKET_MANAGE: tenant-wide helpdesk administration — can view any employee's tickets
        if (SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)) {
            return;
        }

        // EMPLOYEE_VIEW_ALL: cross-department visibility implies all helpdesk ticket views
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return;
        }

        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // VIEW_SELF: caller may only access their own ticket history
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return;
        }

        // VIEW_TEAM: managers/team-leads may view their direct and indirect reportees' tickets
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
            if (reporteeIds.contains(targetEmployeeId)) {
                return;
            }
        }

        throw new AccessDeniedException(
                "You are not authorized to view helpdesk tickets for this employee");
    }


}
