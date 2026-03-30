package com.hrms.api.performance;

import com.hrms.application.performance.dto.ClosePIPRequest;
import com.hrms.application.performance.dto.CreatePIPRequest;
import com.hrms.application.performance.dto.PIPCheckInRequest;
import com.hrms.application.performance.dto.PIPCheckInResponse;
import com.hrms.application.performance.dto.PIPResponse;
import com.hrms.application.performance.service.PIPService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
        return ResponseEntity.ok(pipService.getById(id));
    }

    @GetMapping
    @RequiresPermission(Permission.PIP_VIEW)
    public ResponseEntity<List<PIPResponse>> getAll(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID managerId) {
        if (employeeId != null) return ResponseEntity.ok(pipService.getForEmployee(employeeId));
        if (managerId != null) return ResponseEntity.ok(pipService.getForManager(managerId));
        return ResponseEntity.ok(pipService.getAll());
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
