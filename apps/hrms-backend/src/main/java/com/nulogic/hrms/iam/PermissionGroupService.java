package com.nulogic.hrms.iam;

import com.nulogic.hrms.audit.AuditService;
import com.nulogic.hrms.iam.dto.PermissionGroupRequest;
import com.nulogic.hrms.iam.dto.PermissionGroupResponse;
import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionGroup;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.iam.repo.PermissionGroupRepository;
import com.nulogic.hrms.iam.repo.PermissionRepository;
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
public class PermissionGroupService {
    private final AuthorizationService authorizationService;
    private final PermissionGroupRepository permissionGroupRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final OrgService orgService;
    private final AuditService auditService;

    public PermissionGroupService(AuthorizationService authorizationService,
                                  PermissionGroupRepository permissionGroupRepository,
                                  PermissionRepository permissionRepository,
                                  UserRepository userRepository,
                                  OrgService orgService,
                                  AuditService auditService) {
        this.authorizationService = authorizationService;
        this.permissionGroupRepository = permissionGroupRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.orgService = orgService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<PermissionGroupResponse> list(UUID userId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        return permissionGroupRepository.findByOrg_Id(org.getId()).stream()
                .sorted(Comparator.comparing(PermissionGroup::getName))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PermissionGroupResponse get(UUID userId, UUID groupId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        PermissionGroup group = permissionGroupRepository.findWithPermissionsByOrg_IdAndId(org.getId(), groupId)
                .orElseThrow(() -> new IllegalArgumentException("Permission group not found"));
        return toResponse(group);
    }

    @Transactional
    public PermissionGroupResponse create(UUID userId, PermissionGroupRequest request) {
        authorizationService.checkPermission(userId, "IAM", "CREATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        String name = normalizeName(request.getName());
        permissionGroupRepository.findByOrg_IdAndName(org.getId(), name)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Permission group name already exists");
                });

        PermissionGroup group = new PermissionGroup();
        group.setOrg(org);
        group.setName(name);
        group.setDescription(normalizeOptional(request.getDescription()));
        group.setPermissions(resolvePermissions(request));
        PermissionGroup saved = permissionGroupRepository.save(group);

        auditService.recordEvent(org, loadActor(userId, org), "IAM", "PERMISSION_GROUP_CREATE",
                "PERMISSION_GROUP", saved.getId(), "SUCCESS", null, null,
                Map.of("name", saved.getName(), "permissionCount", saved.getPermissions().size()));

        return toResponse(saved);
    }

    @Transactional
    public PermissionGroupResponse update(UUID userId, UUID groupId, PermissionGroupRequest request) {
        authorizationService.checkPermission(userId, "IAM", "UPDATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        PermissionGroup group = permissionGroupRepository.findWithPermissionsByOrg_IdAndId(org.getId(), groupId)
                .orElseThrow(() -> new IllegalArgumentException("Permission group not found"));

        String name = normalizeName(request.getName());
        if (!group.getName().equals(name)) {
            permissionGroupRepository.findByOrg_IdAndName(org.getId(), name)
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Permission group name already exists");
                    });
            group.setName(name);
        }
        group.setDescription(normalizeOptional(request.getDescription()));
        group.setPermissions(resolvePermissions(request));
        PermissionGroup saved = permissionGroupRepository.save(group);

        auditService.recordEvent(org, loadActor(userId, org), "IAM", "PERMISSION_GROUP_UPDATE",
                "PERMISSION_GROUP", saved.getId(), "SUCCESS", null, null,
                Map.of("name", saved.getName(), "permissionCount", saved.getPermissions().size()));

        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID groupId) {
        authorizationService.checkPermission(userId, "IAM", "DELETE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        PermissionGroup group = permissionGroupRepository.findWithPermissionsByOrg_IdAndId(org.getId(), groupId)
                .orElseThrow(() -> new IllegalArgumentException("Permission group not found"));
        permissionGroupRepository.delete(group);
        auditService.recordEvent(org, loadActor(userId, org), "IAM", "PERMISSION_GROUP_DELETE",
                "PERMISSION_GROUP", groupId, "SUCCESS", null, null, Map.of("name", group.getName()));
    }

    private Set<Permission> resolvePermissions(PermissionGroupRequest request) {
        List<UUID> permissionIds = request.getPermissionIds();
        if (permissionIds == null || permissionIds.isEmpty()) {
            return new HashSet<>();
        }
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        if (permissions.size() != new HashSet<>(permissionIds).size()) {
            throw new IllegalArgumentException("One or more permissions not found");
        }
        return new HashSet<>(permissions);
    }

    private PermissionGroupResponse toResponse(PermissionGroup group) {
        List<UUID> permissionIds = group.getPermissions().stream()
                .map(Permission::getId)
                .sorted(Comparator.comparing(UUID::toString))
                .toList();
        return PermissionGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .permissionIds(permissionIds)
                .build();
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Group name is required");
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
