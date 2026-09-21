package com.nulogic.api.performance;

import com.nulogic.application.performance.dto.*;
import com.nulogic.application.performance.service.PIPService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/performance/pip")
public class PIPController {

    private final PIPService pipService;

    public PIPController(PIPService pipService) {
        this.pipService = pipService;
    }

    @PostMapping
    @RequiresPermission(Permission.PIP_CREATE)
    public ResponseEntity<PIPResponse> create(@Valid @RequestBody CreatePIPRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pipService.create(request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.PIP_VIEW)
    public ResponseEntity<PIPResponse> getById(@PathVariable UUID id) {
        PIPResponse response = pipService.getById(id);
        enforcePIPOwnershipCheck(response);
        return ResponseEntity.ok(response);
    }

    /**
     * IDOR FIX: same class as FeedbackController.enforceFeedbackOwnershipCheck, ported here.
     * Allows the caller to view the PIP if they are the employee or manager on it, or hold
     * HR-manager/EMPLOYEE_VIEW_ALL privileges. Managers may also view PIPs for reportees.
     */
    private void enforcePIPOwnershipCheck(PIPResponse pip) {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) return;
        if (SecurityContext.isHRManager()) return;
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) return;
        UUID self = SecurityContext.getCurrentEmployeeId();
        if (self == null) throw new AccessDeniedException("Authentication required");
        if (self.equals(pip.getEmployeeId())) return;
        if (self.equals(pip.getManagerId())) return;
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
            if (reporteeIds.contains(pip.getEmployeeId())) return;
        }
        throw new AccessDeniedException("You are not authorized to view this PIP record");
    }

    @GetMapping
    @RequiresPermission(Permission.PIP_VIEW)
    public ResponseEntity<Page<PIPResponse>> getAll(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID managerId,
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable) {
        if (employeeId != null) return ResponseEntity.ok(pipService.getForEmployee(employeeId, pageable));
        if (managerId != null) return ResponseEntity.ok(pipService.getForManager(managerId, pageable));
        return ResponseEntity.ok(pipService.getAll(pageable));
    }

    @PostMapping("/{id}/check-in")
    @RequiresPermission(Permission.PIP_MANAGE)
    public ResponseEntity<PIPCheckInResponse> recordCheckIn(
            @PathVariable UUID id,
            @Valid @RequestBody PIPCheckInRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pipService.recordCheckIn(id, request));
    }

    @PutMapping("/{id}/close")
    @RequiresPermission(Permission.PIP_MANAGE)
    public ResponseEntity<Void> close(
            @PathVariable UUID id,
            @Valid @RequestBody ClosePIPRequest request) {
        pipService.close(id, request);
        return ResponseEntity.ok().build();
    }
}
