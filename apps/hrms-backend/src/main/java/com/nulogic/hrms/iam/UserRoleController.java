package com.nulogic.hrms.iam;

import com.nulogic.hrms.common.SecurityUtils;
import com.nulogic.hrms.iam.dto.EffectivePermissionResponse;
import com.nulogic.hrms.iam.dto.UserRoleUpdateRequest;
import com.nulogic.hrms.iam.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/iam/users")
public class UserRoleController {
    private final UserRoleService userRoleService;

    public UserRoleController(UserRoleService userRoleService) {
        this.userRoleService = userRoleService;
    }

    @GetMapping
    public ResponseEntity<Page<UserSummaryResponse>> list(@RequestParam(value = "search", required = false) String search,
                                                         @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(userRoleService.list(userId, search, pageable));
    }

    @PutMapping("/{id}/roles")
    public ResponseEntity<UserSummaryResponse> updateRoles(@PathVariable UUID id,
                                                           @Valid @RequestBody UserRoleUpdateRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(userRoleService.updateRoles(userId, id, request));
    }

    @GetMapping("/{id}/effective-permissions")
    public ResponseEntity<List<EffectivePermissionResponse>> effectivePermissions(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(userRoleService.effectivePermissions(userId, id));
    }
}
