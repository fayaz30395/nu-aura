package com.nulogic.hrms.iam;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.iam.dto.PermissionGroupRequest;
import com.nulogic.hrms.iam.dto.PermissionGroupResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/iam/permission-groups")
public class PermissionGroupController {
    private final PermissionGroupService permissionGroupService;

    public PermissionGroupController(PermissionGroupService permissionGroupService) {
        this.permissionGroupService = permissionGroupService;
    }

    @GetMapping
    public ResponseEntity<List<PermissionGroupResponse>> list() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(permissionGroupService.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PermissionGroupResponse> get(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(permissionGroupService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<PermissionGroupResponse> create(@Valid @RequestBody PermissionGroupRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(permissionGroupService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PermissionGroupResponse> update(@PathVariable UUID id,
                                                         @Valid @RequestBody PermissionGroupRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(permissionGroupService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        permissionGroupService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
