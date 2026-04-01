package com.hrms.api.travel.controller;

import com.hrms.api.travel.dto.CreateTravelRequest;
import com.hrms.api.travel.dto.TravelRequestDto;
import com.hrms.application.travel.service.TravelService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.travel.TravelRequest.TravelStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/travel")
@RequiredArgsConstructor
@Tag(name = "Travel Management", description = "Employee travel request management")
public class TravelController {

    private final TravelService travelService;

    @GetMapping
    @RequiresPermission(Permission.TRAVEL_VIEW_ALL)
    @Operation(summary = "Get all travel requests", description = "Get all travel requests (redirects to /requests)")
    public ResponseEntity<Page<TravelRequestDto>> getAll(
            @RequestParam(required = false) TravelStatus status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(travelService.getAllRequests(status, pageable));
    }

    @PostMapping("/requests")
    @RequiresPermission(Permission.TRAVEL_CREATE)
    @Operation(summary = "Create travel request", description = "Create a new travel request")
    public ResponseEntity<TravelRequestDto> createRequest(
            @Valid @RequestBody CreateTravelRequest request
    ) {
        return ResponseEntity.ok(travelService.createRequest(request));
    }

    @PutMapping("/requests/{id}")
    @RequiresPermission(Permission.TRAVEL_UPDATE)
    @Operation(summary = "Update travel request", description = "Update an existing travel request")
    public ResponseEntity<TravelRequestDto> updateRequest(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTravelRequest request
    ) {
        return ResponseEntity.ok(travelService.updateRequest(id, request));
    }

    @GetMapping("/requests/{id}")
    @RequiresPermission(Permission.TRAVEL_VIEW)
    @Operation(summary = "Get travel request", description = "Get travel request by ID")
    public ResponseEntity<TravelRequestDto> getRequest(@PathVariable UUID id) {
        return ResponseEntity.ok(travelService.getById(id));
    }

    @PostMapping("/requests/{id}/submit")
    @RequiresPermission(Permission.TRAVEL_CREATE)
    @Operation(summary = "Submit travel request", description = "Submit travel request for approval")
    public ResponseEntity<TravelRequestDto> submitRequest(@PathVariable UUID id) {
        return ResponseEntity.ok(travelService.submitRequest(id));
    }

    @PostMapping("/requests/{id}/approve")
    @RequiresPermission(Permission.TRAVEL_APPROVE)
    @Operation(summary = "Approve travel request", description = "Approve a submitted travel request")
    public ResponseEntity<TravelRequestDto> approveRequest(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) Map<String, String> body
    ) {
        String comments = body != null ? body.get("comments") : null;
        return ResponseEntity.ok(travelService.approveRequest(id, comments));
    }

    @PostMapping("/requests/{id}/reject")
    @RequiresPermission(Permission.TRAVEL_APPROVE)
    @Operation(summary = "Reject travel request", description = "Reject a submitted travel request")
    public ResponseEntity<TravelRequestDto> rejectRequest(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(travelService.rejectRequest(id, reason));
    }

    @PostMapping("/requests/{id}/cancel")
    @RequiresPermission(Permission.TRAVEL_UPDATE)
    @Operation(summary = "Cancel travel request", description = "Cancel a travel request")
    public ResponseEntity<TravelRequestDto> cancelRequest(@PathVariable UUID id) {
        return ResponseEntity.ok(travelService.cancelRequest(id));
    }

    @DeleteMapping("/requests/{id}")
    @RequiresPermission(Permission.TRAVEL_CREATE)
    @Operation(summary = "Delete travel request", description = "Delete a draft travel request")
    public ResponseEntity<Void> deleteRequest(@PathVariable UUID id) {
        travelService.deleteRequest(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/requests/my")
    @RequiresPermission(Permission.TRAVEL_VIEW)
    @Operation(summary = "Get my travel requests", description = "Get current user's travel requests")
    public ResponseEntity<Page<TravelRequestDto>> getMyRequests(Pageable pageable) {
        return ResponseEntity.ok(travelService.getMyRequests(pageable));
    }

    @GetMapping("/requests/pending")
    @RequiresPermission(Permission.TRAVEL_APPROVE)
    @Operation(summary = "Get pending approvals", description = "Get travel requests pending approval")
    public ResponseEntity<Page<TravelRequestDto>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(travelService.getPendingApprovals(pageable));
    }

    @GetMapping("/requests")
    @RequiresPermission(Permission.TRAVEL_VIEW_ALL)
    @Operation(summary = "Get all travel requests", description = "Get all travel requests with optional status filter")
    public ResponseEntity<Page<TravelRequestDto>> getAllRequests(
            @RequestParam(required = false) TravelStatus status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(travelService.getAllRequests(status, pageable));
    }

    @GetMapping("/requests/upcoming")
    @RequiresPermission(Permission.TRAVEL_VIEW_ALL)
    @Operation(summary = "Get upcoming travel", description = "Get approved travel for the next month")
    public ResponseEntity<List<TravelRequestDto>> getUpcomingTravel() {
        return ResponseEntity.ok(travelService.getUpcomingTravel());
    }
}
