package com.nulogic.hrms.iam;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.iam.dto.PermissionMatrixResponse;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/iam/permission-matrix")
public class PermissionMatrixController {
    private final PermissionMatrixService permissionMatrixService;

    public PermissionMatrixController(PermissionMatrixService permissionMatrixService) {
        this.permissionMatrixService = permissionMatrixService;
    }

    @GetMapping
    public ResponseEntity<PermissionMatrixResponse> getMatrix() {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(permissionMatrixService.getMatrix(userId));
    }
}
