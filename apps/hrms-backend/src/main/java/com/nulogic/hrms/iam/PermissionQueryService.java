package com.nulogic.hrms.iam;

import com.nulogic.hrms.iam.dto.PermissionResponse;
import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.repo.PermissionRepository;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PermissionQueryService {
    private final AuthorizationService authorizationService;
    private final PermissionRepository permissionRepository;

    public PermissionQueryService(AuthorizationService authorizationService,
                                  PermissionRepository permissionRepository) {
        this.authorizationService = authorizationService;
        this.permissionRepository = permissionRepository;
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> list(UUID userId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        return permissionRepository.findAll().stream()
                .sorted(Comparator.comparing(Permission::getModule)
                        .thenComparing(Permission::getAction)
                        .thenComparing(permission -> permission.getScope().name()))
                .map(this::toResponse)
                .toList();
    }

    private PermissionResponse toResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .module(permission.getModule())
                .action(permission.getAction())
                .scope(permission.getScope().name())
                .build();
    }
}
