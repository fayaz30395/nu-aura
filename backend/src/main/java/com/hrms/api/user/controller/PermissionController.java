package com.hrms.api.user.controller;

import com.hrms.api.user.dto.PermissionResponse;
import com.hrms.application.user.service.PermissionService;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.hrms.common.security.Permission.PERMISSION_MANAGE;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @RequiresPermission(PERMISSION_MANAGE)
    public ResponseEntity<Page<PermissionResponse>> getAllPermissions(
            @PageableDefault(size = 50, sort = "resource", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<PermissionResponse> permissions = permissionService.getAllPermissions(pageable);
        return ResponseEntity.ok(permissions);
    }

    @GetMapping("/resource/{resource}")
    @RequiresPermission(PERMISSION_MANAGE)
    public ResponseEntity<List<PermissionResponse>> getPermissionsByResource(@PathVariable String resource) {
        List<PermissionResponse> permissions = permissionService.getPermissionsByResource(resource);
        return ResponseEntity.ok(permissions);
    }
}
