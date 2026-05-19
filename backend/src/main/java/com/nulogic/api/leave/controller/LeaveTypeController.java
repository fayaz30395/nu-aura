package com.nulogic.api.leave.controller;

import com.nulogic.api.leave.dto.LeaveTypeRequest;
import com.nulogic.api.leave.dto.LeaveTypeResponse;
import com.nulogic.api.leave.mapper.LeaveTypeMapper;
import com.nulogic.application.leave.service.LeaveTypeService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.leave.LeaveType;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/leave-types")
@RequiredArgsConstructor
@Tag(name = "Leave Types", description = "Configuration of leave types: accrual rules, gender-specificity, activation toggles")
public class LeaveTypeController {

    private final LeaveTypeService leaveTypeService;
    private final LeaveTypeMapper leaveTypeMapper;

    @PostMapping
    @RequiresPermission(Permission.LEAVE_APPROVE)
    @Operation(summary = "Create leave type",
            description = "Define a new leave type with accrual policy and applicability rules (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Leave type created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires LEAVE:APPROVE permission")
    })
    public ResponseEntity<LeaveTypeResponse> createLeaveType(@Valid @RequestBody LeaveTypeRequest request) {
        // T3-10: MapStruct mapper enforces the mass-assignment ignore-list at compile time
        // (see LeaveTypeMapper). String→enum conversion is handled by mapper default methods.
        LeaveType leaveType = leaveTypeMapper.toEntity(request);
        LeaveType created = leaveTypeService.createLeaveType(leaveType);
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveTypeMapper.toResponse(created));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    @Operation(summary = "Update leave type",
            description = "Update an existing leave type definition; sensitive identifiers cannot be mutated")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave type updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Leave type not found")
    })
    public ResponseEntity<LeaveTypeResponse> updateLeaveType(
            @Parameter(description = "Leave type UUID") @PathVariable UUID id,
            @Valid @RequestBody LeaveTypeRequest request) {
        // T3-10: MapStruct enforces the mass-assignment ignore-list at compile time.
        // Service still expects a data-shell entity (current contract); a future pass
        // can switch the service to use mapper.updateEntity() on the loaded entity.
        LeaveType leaveTypeData = leaveTypeMapper.toEntity(request);
        LeaveType updated = leaveTypeService.updateLeaveType(id, leaveTypeData);
        return ResponseEntity.ok(leaveTypeMapper.toResponse(updated));
    }

    @GetMapping("/{id}")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_SELF})
    @Operation(summary = "Get leave type by ID", description = "Returns a single leave type by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave type found"),
            @ApiResponse(responseCode = "404", description = "Leave type not found")
    })
    public ResponseEntity<LeaveTypeResponse> getLeaveType(
            @Parameter(description = "Leave type UUID") @PathVariable UUID id) {
        LeaveType leaveType = leaveTypeService.getLeaveTypeById(id);
        return ResponseEntity.ok(leaveTypeMapper.toResponse(leaveType));
    }

    @GetMapping
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_SELF})
    @Operation(summary = "List all leave types", description = "Returns a paginated list of all leave types (active and inactive)")
    @ApiResponse(responseCode = "200", description = "Leave types retrieved successfully")
    public ResponseEntity<Page<LeaveTypeResponse>> getAllLeaveTypes(Pageable pageable) {
        Page<LeaveType> leaveTypes = leaveTypeService.getAllLeaveTypes(pageable);
        return ResponseEntity.ok(leaveTypes.map(leaveTypeMapper::toResponse));
    }

    @GetMapping("/active")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_SELF})
    @Operation(summary = "List active leave types", description = "Returns only leave types currently available for new requests")
    @ApiResponse(responseCode = "200", description = "Active leave types retrieved successfully")
    public ResponseEntity<List<LeaveTypeResponse>> getActiveLeaveTypes() {
        List<LeaveType> leaveTypes = leaveTypeService.getActiveLeaveTypes();
        return ResponseEntity.ok(leaveTypes.stream().map(leaveTypeMapper::toResponse).collect(Collectors.toList()));
    }

    @PatchMapping("/{id}/activate")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    @Operation(summary = "Activate leave type", description = "Re-enable a previously deactivated leave type")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave type activated successfully"),
            @ApiResponse(responseCode = "404", description = "Leave type not found")
    })
    public ResponseEntity<LeaveTypeResponse> activateLeaveType(
            @Parameter(description = "Leave type UUID") @PathVariable UUID id) {
        leaveTypeService.activateLeaveType(id);
        LeaveType leaveType = leaveTypeService.getLeaveTypeById(id);
        return ResponseEntity.ok(leaveTypeMapper.toResponse(leaveType));
    }

    @PatchMapping("/{id}/deactivate")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    @Operation(summary = "Deactivate leave type",
            description = "Disable a leave type from new requests (existing balances retained)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leave type deactivated successfully"),
            @ApiResponse(responseCode = "404", description = "Leave type not found")
    })
    public ResponseEntity<LeaveTypeResponse> deactivateLeaveType(
            @Parameter(description = "Leave type UUID") @PathVariable UUID id) {
        leaveTypeService.deactivateLeaveType(id);
        LeaveType leaveType = leaveTypeService.getLeaveTypeById(id);
        return ResponseEntity.ok(leaveTypeMapper.toResponse(leaveType));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    @Operation(summary = "Delete leave type", description = "Soft-delete a leave type (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Leave type deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Leave type not found"),
            @ApiResponse(responseCode = "409", description = "Leave type still in use; cannot delete")
    })
    public ResponseEntity<Void> deleteLeaveType(
            @Parameter(description = "Leave type UUID") @PathVariable UUID id) {
        leaveTypeService.deleteLeaveType(id);
        return ResponseEntity.noContent().build();
    }

}
