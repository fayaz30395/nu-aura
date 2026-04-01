package com.hrms.api.travel.controller;

import com.hrms.api.travel.dto.CreateTravelExpenseRequest;
import com.hrms.api.travel.dto.TravelExpenseDto;
import com.hrms.application.travel.service.TravelExpenseService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.hrms.common.exception.ValidationException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/travel/expenses")
@RequiredArgsConstructor
@Tag(name = "Travel Expense Management", description = "Manage expenses for travel requests")
public class TravelExpenseController {

    private final TravelExpenseService travelExpenseService;

    @PostMapping
    @RequiresPermission(Permission.TRAVEL_CREATE)
    @Operation(summary = "Create travel expense", description = "Create a new expense for a travel request")
    public ResponseEntity<TravelExpenseDto> createExpense(
            @Valid @RequestBody CreateTravelExpenseRequest request
    ) {
        return ResponseEntity.ok(travelExpenseService.createExpense(request));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.TRAVEL_UPDATE)
    @Operation(summary = "Update travel expense", description = "Update an existing travel expense")
    public ResponseEntity<TravelExpenseDto> updateExpense(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTravelExpenseRequest request
    ) {
        return ResponseEntity.ok(travelExpenseService.updateExpense(id, request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.TRAVEL_VIEW)
    @Operation(summary = "Get travel expense", description = "Get a travel expense by ID")
    public ResponseEntity<TravelExpenseDto> getExpense(@PathVariable UUID id) {
        return ResponseEntity.ok(travelExpenseService.getById(id));
    }

    @GetMapping("/request/{travelRequestId}")
    @RequiresPermission(Permission.TRAVEL_VIEW)
    @Operation(summary = "Get expenses by travel request", description = "Get all expenses for a travel request")
    public ResponseEntity<Page<TravelExpenseDto>> getByTravelRequest(
            @PathVariable UUID travelRequestId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(travelExpenseService.getByTravelRequest(travelRequestId, pageable));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.TRAVEL_VIEW)
    @Operation(summary = "Get expenses by employee", description = "Get all travel expenses for an employee")
    public ResponseEntity<Page<TravelExpenseDto>> getByEmployee(
            @PathVariable UUID employeeId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(travelExpenseService.getByEmployee(employeeId, pageable));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.TRAVEL_APPROVE)
    @Operation(summary = "Approve travel expense", description = "Approve a travel expense")
    public ResponseEntity<TravelExpenseDto> approveExpense(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        UUID approverId = parseUuid(body, "approverId");
        BigDecimal approvedAmount = parseBigDecimal(body, "approvedAmount");
        String comments = readString(body, "comments");

        return ResponseEntity.ok(travelExpenseService.approveExpense(id, approverId, approvedAmount, comments));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.TRAVEL_APPROVE)
    @Operation(summary = "Reject travel expense", description = "Reject a travel expense")
    public ResponseEntity<TravelExpenseDto> rejectExpense(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        UUID approverId = parseUuid(body, "approverId");
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(travelExpenseService.rejectExpense(id, approverId, reason));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.TRAVEL_CREATE)
    @Operation(summary = "Delete travel expense", description = "Delete a pending travel expense")
    public ResponseEntity<Void> deleteExpense(@PathVariable UUID id) {
        travelExpenseService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/request/{travelRequestId}/summary")
    @RequiresPermission(Permission.TRAVEL_VIEW)
    @Operation(summary = "Get expense summary", description = "Get expense summary for a travel request")
    public ResponseEntity<Map<String, Object>> getExpenseSummary(
            @PathVariable UUID travelRequestId
    ) {
        return ResponseEntity.ok(travelExpenseService.getExpenseSummary(travelRequestId));
    }

    private UUID parseUuid(Map<String, ?> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        try {
            return UUID.fromString(body.get(key).toString());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid " + key + " format: " + body.get(key));
        }
    }

    private BigDecimal parseBigDecimal(Map<String, ?> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        try {
            return new BigDecimal(body.get(key).toString());
        } catch (NumberFormatException e) {
            throw new ValidationException("Invalid " + key + " format: " + body.get(key));
        }
    }

    private String readString(Map<String, ?> body, String key) {
        return body != null && body.get(key) != null ? body.get(key).toString() : null;
    }
}
