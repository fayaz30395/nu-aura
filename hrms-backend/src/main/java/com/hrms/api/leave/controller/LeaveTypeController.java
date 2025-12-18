package com.hrms.api.leave.controller;

import com.hrms.api.leave.dto.LeaveTypeRequest;
import com.hrms.api.leave.dto.LeaveTypeResponse;
import com.hrms.application.leave.service.LeaveTypeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.leave.LeaveType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
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
public class LeaveTypeController {

    private final LeaveTypeService leaveTypeService;

    @PostMapping
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<LeaveTypeResponse> createLeaveType(@Valid @RequestBody LeaveTypeRequest request) {
        LeaveType leaveType = new LeaveType();
        BeanUtils.copyProperties(request, leaveType);
        if (request.getAccrualType() != null) {
            leaveType.setAccrualType(LeaveType.AccrualType.valueOf(request.getAccrualType()));
        }
        if (request.getGenderSpecific() != null) {
            leaveType.setGenderSpecific(LeaveType.GenderSpecific.valueOf(request.getGenderSpecific()));
        }
        LeaveType created = leaveTypeService.createLeaveType(leaveType);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<LeaveTypeResponse> updateLeaveType(@PathVariable UUID id, @Valid @RequestBody LeaveTypeRequest request) {
        LeaveType leaveTypeData = new LeaveType();
        BeanUtils.copyProperties(request, leaveTypeData);
        if (request.getAccrualType() != null) {
            leaveTypeData.setAccrualType(LeaveType.AccrualType.valueOf(request.getAccrualType()));
        }
        if (request.getGenderSpecific() != null) {
            leaveTypeData.setGenderSpecific(LeaveType.GenderSpecific.valueOf(request.getGenderSpecific()));
        }
        LeaveType updated = leaveTypeService.updateLeaveType(id, leaveTypeData);
        return ResponseEntity.ok(toResponse(updated));
    }

    @GetMapping("/{id}")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_SELF})
    public ResponseEntity<LeaveTypeResponse> getLeaveType(@PathVariable UUID id) {
        LeaveType leaveType = leaveTypeService.getLeaveTypeById(id);
        return ResponseEntity.ok(toResponse(leaveType));
    }

    @GetMapping
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_SELF})
    public ResponseEntity<Page<LeaveTypeResponse>> getAllLeaveTypes(Pageable pageable) {
        Page<LeaveType> leaveTypes = leaveTypeService.getAllLeaveTypes(pageable);
        return ResponseEntity.ok(leaveTypes.map(this::toResponse));
    }

    @GetMapping("/active")
    @RequiresPermission({Permission.LEAVE_VIEW_ALL, Permission.LEAVE_VIEW_SELF})
    public ResponseEntity<List<LeaveTypeResponse>> getActiveLeaveTypes() {
        List<LeaveType> leaveTypes = leaveTypeService.getActiveLeaveTypes();
        return ResponseEntity.ok(leaveTypes.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @PatchMapping("/{id}/activate")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<Void> activateLeaveType(@PathVariable UUID id) {
        leaveTypeService.activateLeaveType(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<Void> deactivateLeaveType(@PathVariable UUID id) {
        leaveTypeService.deactivateLeaveType(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<Void> deleteLeaveType(@PathVariable UUID id) {
        leaveTypeService.deleteLeaveType(id);
        return ResponseEntity.noContent().build();
    }

    private LeaveTypeResponse toResponse(LeaveType leaveType) {
        LeaveTypeResponse response = new LeaveTypeResponse();
        BeanUtils.copyProperties(leaveType, response);
        if (leaveType.getAccrualType() != null) {
            response.setAccrualType(leaveType.getAccrualType().name());
        }
        if (leaveType.getGenderSpecific() != null) {
            response.setGenderSpecific(leaveType.getGenderSpecific().name());
        }
        return response;
    }
}
