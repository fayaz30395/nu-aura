package com.hrms.api.user.controller;

import com.hrms.api.user.dto.AssignRolesRequest;
import com.hrms.api.user.dto.UserResponse;
import com.hrms.application.user.service.RoleManagementService;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.USER_MANAGE;
import static com.hrms.common.security.Permission.USER_VIEW;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final RoleManagementService roleManagementService;

    @GetMapping
    @RequiresPermission(USER_VIEW)
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = roleManagementService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}/roles")
    @RequiresPermission(USER_MANAGE)
    public ResponseEntity<UserResponse> assignRoles(
            @PathVariable UUID id,
            @Valid @RequestBody AssignRolesRequest request) {
        UserResponse user = roleManagementService.assignRolesToUser(id, request);
        return ResponseEntity.ok(user);
    }
}
