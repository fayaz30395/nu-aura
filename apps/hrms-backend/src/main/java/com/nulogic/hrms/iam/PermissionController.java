package com.nulogic.hrms.iam;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.iam.dto.PermissionResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/iam/permissions")
public class PermissionController {
    private final PermissionQueryService permissionQueryService;

    public PermissionController(PermissionQueryService permissionQueryService) {
        this.permissionQueryService = permissionQueryService;
    }

    @GetMapping
    public ResponseEntity<List<PermissionResponse>> list() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(permissionQueryService.list(userId));
    }
}
