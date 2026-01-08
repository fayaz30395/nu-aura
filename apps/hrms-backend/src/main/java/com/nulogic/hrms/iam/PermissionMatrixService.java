package com.nulogic.hrms.iam;

import com.nulogic.hrms.iam.bootstrap.PermissionCatalog;
import com.nulogic.hrms.iam.dto.PermissionMatrixResponse;
import com.nulogic.hrms.iam.dto.PermissionResponse;
import com.nulogic.hrms.iam.dto.RolePermissionAssignment;
import com.nulogic.hrms.iam.dto.RoleSummaryResponse;
import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.Role;
import com.nulogic.hrms.iam.repo.PermissionRepository;
import com.nulogic.hrms.iam.repo.RoleRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PermissionMatrixService {
    private final AuthorizationService authorizationService;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final OrgService orgService;

    public PermissionMatrixService(AuthorizationService authorizationService,
                                   RoleRepository roleRepository,
                                   PermissionRepository permissionRepository,
                                   OrgService orgService) {
        this.authorizationService = authorizationService;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.orgService = orgService;
    }

    @Transactional(readOnly = true)
    public PermissionMatrixResponse getMatrix(UUID userId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        List<Role> roles = roleRepository.findByOrg_Id(org.getId());
        List<Permission> permissions = permissionRepository.findAll();

        List<RoleSummaryResponse> roleSummaries = roles.stream()
                .sorted(Comparator.comparing(Role::getName))
                .map(this::toRoleSummary)
                .toList();

        List<PermissionResponse> permissionResponses = permissions.stream()
                .sorted(permissionComparator())
                .map(this::toPermissionResponse)
                .toList();

        List<RolePermissionAssignment> assignments = roles.stream()
                .map(role -> RolePermissionAssignment.builder()
                        .roleId(role.getId())
                        .permissionIds(role.getPermissions().stream()
                                .map(Permission::getId)
                                .sorted(Comparator.comparing(UUID::toString))
                                .toList())
                        .build())
                .toList();

        return PermissionMatrixResponse.builder()
                .roles(roleSummaries)
                .permissions(permissionResponses)
                .assignments(assignments)
                .build();
    }

    private RoleSummaryResponse toRoleSummary(Role role) {
        return RoleSummaryResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .system(role.isSystem())
                .build();
    }

    private PermissionResponse toPermissionResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .module(permission.getModule())
                .action(permission.getAction())
                .scope(permission.getScope().name())
                .build();
    }

    private Comparator<Permission> permissionComparator() {
        Map<String, Integer> moduleOrder = indexMap(PermissionCatalog.MODULES);
        Map<String, Integer> actionOrder = indexMap(PermissionCatalog.ACTIONS);
        return Comparator
                .comparing((Permission permission) -> moduleOrder.getOrDefault(permission.getModule(), 999))
                .thenComparing(permission -> actionOrder.getOrDefault(permission.getAction(), 999))
                .thenComparing(permission -> scopeOrder(permission.getScope()))
                .thenComparing(Permission::getModule)
                .thenComparing(Permission::getAction);
    }

    private int scopeOrder(PermissionScope scope) {
        return switch (scope) {
            case ORG -> 0;
            case DEPARTMENT -> 1;
            case TEAM -> 2;
            case SELF -> 3;
        };
    }

    private Map<String, Integer> indexMap(List<String> values) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < values.size(); i++) {
            map.put(values.get(i), i);
        }
        return map;
    }
}
