package com.nulogic.hrms.iam;

import com.nulogic.hrms.audit.AuditService;
import com.nulogic.hrms.iam.dto.RoleRequest;
import com.nulogic.hrms.iam.dto.RoleResponse;
import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.Role;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.iam.repo.PermissionGroupRepository;
import com.nulogic.hrms.iam.repo.PermissionRepository;
import com.nulogic.hrms.iam.repo.RoleRepository;
import com.nulogic.hrms.iam.repo.UserRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleAdminService {
    private final AuthorizationService authorizationService;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionGroupRepository permissionGroupRepository;
    private final UserRepository userRepository;
    private final OrgService orgService;
    private final AuditService auditService;

    public RoleAdminService(AuthorizationService authorizationService,
                            RoleRepository roleRepository,
                            PermissionRepository permissionRepository,
                            PermissionGroupRepository permissionGroupRepository,
                            UserRepository userRepository,
                            OrgService orgService,
                            AuditService auditService) {
        this.authorizationService = authorizationService;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.permissionGroupRepository = permissionGroupRepository;
        this.userRepository = userRepository;
        this.orgService = orgService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> list(UUID userId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        return roleRepository.findByOrg_Id(org.getId()).stream()
                .sorted(Comparator.comparing(Role::getName))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse get(UUID userId, UUID roleId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        Role role = roleRepository.findWithPermissionsByOrg_IdAndId(org.getId(), roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        return toResponse(role);
    }

    @Transactional
    public RoleResponse create(UUID userId, RoleRequest request) {
        authorizationService.checkPermission(userId, "IAM", "CREATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        String name = normalizeName(request.getName());
        roleRepository.findByOrg_IdAndName(org.getId(), name)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Role name already exists");
                });

        Role role = new Role();
        role.setOrg(org);
        role.setName(name);
        role.setDescription(normalizeOptional(request.getDescription()));
        role.setSystem(false);
        role.setPermissions(resolvePermissions(org.getId(), request));
        Role saved = roleRepository.save(role);

        auditService.recordEvent(org, loadActor(userId, org), "IAM", "ROLE_CREATE",
                "ROLE", saved.getId(), "SUCCESS", null, null,
                Map.of("name", saved.getName(), "permissionCount", saved.getPermissions().size()));

        return toResponse(saved);
    }

    @Transactional
    public RoleResponse update(UUID userId, UUID roleId, RoleRequest request) {
        authorizationService.checkPermission(userId, "IAM", "UPDATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        Role role = roleRepository.findWithPermissionsByOrg_IdAndId(org.getId(), roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        if (role.isSystem()) {
            throw new IllegalArgumentException("System roles cannot be modified");
        }

        String name = normalizeName(request.getName());
        if (!role.getName().equals(name)) {
            roleRepository.findByOrg_IdAndName(org.getId(), name)
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Role name already exists");
                    });
            role.setName(name);
        }
        role.setDescription(normalizeOptional(request.getDescription()));
        role.setPermissions(resolvePermissions(org.getId(), request));
        Role saved = roleRepository.save(role);

        auditService.recordEvent(org, loadActor(userId, org), "IAM", "ROLE_UPDATE",
                "ROLE", saved.getId(), "SUCCESS", null, null,
                Map.of("name", saved.getName(), "permissionCount", saved.getPermissions().size()));

        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID roleId) {
        authorizationService.checkPermission(userId, "IAM", "DELETE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        Role role = roleRepository.findWithPermissionsByOrg_IdAndId(org.getId(), roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        if (role.isSystem()) {
            throw new IllegalArgumentException("System roles cannot be deleted");
        }

        roleRepository.delete(role);
        auditService.recordEvent(org, loadActor(userId, org), "IAM", "ROLE_DELETE",
                "ROLE", roleId, "SUCCESS", null, null, Map.of("name", role.getName()));
    }

    private Set<Permission> resolvePermissions(UUID orgId, RoleRequest request) {
        Set<Permission> permissions = new HashSet<>();
        List<UUID> groupIds = request.getPermissionGroupIds();
        if (groupIds != null && !groupIds.isEmpty()) {
            for (UUID groupId : groupIds) {
                permissions.addAll(permissionGroupRepository.findWithPermissionsByOrg_IdAndId(orgId, groupId)
                        .orElseThrow(() -> new IllegalArgumentException("Permission group not found"))
                        .getPermissions());
            }
        }

        List<UUID> permissionIds = request.getPermissionIds();
        if (permissionIds != null && !permissionIds.isEmpty()) {
            List<Permission> direct = permissionRepository.findAllById(permissionIds);
            if (direct.size() != new HashSet<>(permissionIds).size()) {
                throw new IllegalArgumentException("One or more permissions not found");
            }
            permissions.addAll(direct);
        }

        return permissions;
    }

    private RoleResponse toResponse(Role role) {
        List<UUID> permissionIds = role.getPermissions().stream()
                .map(Permission::getId)
                .sorted(Comparator.comparing(UUID::toString))
                .toList();
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .system(role.isSystem())
                .permissionIds(permissionIds)
                .build();
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Role name is required");
        }
        return name.trim();
    }

    private String normalizeOptional(String value) {
        return value == null ? null : value.trim();
    }

    private User loadActor(UUID userId, Org org) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!user.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("User not found");
        }
        return user;
    }
}
