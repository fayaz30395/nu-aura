package com.nulogic.hrms.iam;

import com.nulogic.hrms.audit.AuditService;
import com.nulogic.hrms.iam.bootstrap.PermissionCatalog;
import com.nulogic.hrms.iam.dto.EffectivePermissionResponse;
import com.nulogic.hrms.iam.dto.RoleSummaryResponse;
import com.nulogic.hrms.iam.dto.UserRoleUpdateRequest;
import com.nulogic.hrms.iam.dto.UserSummaryResponse;
import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.Role;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.iam.repo.RoleRepository;
import com.nulogic.hrms.iam.repo.UserRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserRoleService {
    private final AuthorizationService authorizationService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrgService orgService;
    private final AuditService auditService;

    public UserRoleService(AuthorizationService authorizationService,
                           UserRepository userRepository,
                           RoleRepository roleRepository,
                           OrgService orgService,
                           AuditService auditService) {
        this.authorizationService = authorizationService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.orgService = orgService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> list(UUID userId, String search, Pageable pageable) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        Page<User> users = (search == null || search.isBlank())
                ? userRepository.findByOrg_Id(org.getId(), pageable)
                : userRepository.searchByOrg(org.getId(), search.trim(), pageable);
        return users.map(this::toSummaryResponse);
    }

    @Transactional
    public UserSummaryResponse updateRoles(UUID userId, UUID targetUserId, UserRoleUpdateRequest request) {
        authorizationService.checkPermission(userId, "IAM", "MANAGE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!target.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("User not found");
        }

        Set<UUID> roleIds = new HashSet<>(request.getRoleIds());
        List<Role> roles = roleRepository.findByOrg_IdAndIdIn(org.getId(), new ArrayList<>(roleIds));
        if (roles.size() != roleIds.size()) {
            throw new IllegalArgumentException("One or more roles not found");
        }

        target.setRoles(new HashSet<>(roles));
        User saved = userRepository.save(target);
        auditService.recordEvent(org, loadActor(userId, org), "IAM", "USER_ROLE_UPDATE",
                "USER", saved.getId(), "SUCCESS", null, null,
                Map.of("roleCount", saved.getRoles().size()));
        return toSummaryResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<EffectivePermissionResponse> effectivePermissions(UUID userId, UUID targetUserId) {
        authorizationService.checkPermission(userId, "IAM", "VIEW", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        User target = userRepository.findWithRolesById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!target.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("User not found");
        }

        Map<String, Map<String, Set<PermissionScope>>> permissions = new HashMap<>();
        for (Role role : target.getRoles()) {
            for (Permission permission : role.getPermissions()) {
                permissions
                        .computeIfAbsent(permission.getModule(), key -> new HashMap<>())
                        .computeIfAbsent(permission.getAction(), key -> EnumSet.noneOf(PermissionScope.class))
                        .add(permission.getScope());
            }
        }

        List<EffectivePermissionResponse> responses = new ArrayList<>();
        for (Map.Entry<String, Map<String, Set<PermissionScope>>> moduleEntry : permissions.entrySet()) {
            for (Map.Entry<String, Set<PermissionScope>> actionEntry : moduleEntry.getValue().entrySet()) {
                List<String> scopes = orderedScopes(actionEntry.getValue()).stream()
                        .map(Enum::name)
                        .toList();
                responses.add(EffectivePermissionResponse.builder()
                        .module(moduleEntry.getKey())
                        .action(actionEntry.getKey())
                        .scopes(scopes)
                        .highestScope(scopes.isEmpty() ? null : scopes.get(0))
                        .build());
            }
        }

        responses.sort(effectivePermissionComparator());
        return responses;
    }

    private UserSummaryResponse toSummaryResponse(User user) {
        List<RoleSummaryResponse> roles = user.getRoles().stream()
                .sorted(Comparator.comparing(Role::getName))
                .map(role -> RoleSummaryResponse.builder()
                        .id(role.getId())
                        .name(role.getName())
                        .description(role.getDescription())
                        .system(role.isSystem())
                        .build())
                .toList();
        return UserSummaryResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .status(user.getStatus().name())
                .roles(roles)
                .build();
    }

    private List<PermissionScope> orderedScopes(Set<PermissionScope> scopes) {
        List<PermissionScope> order = List.of(
                PermissionScope.ORG,
                PermissionScope.DEPARTMENT,
                PermissionScope.TEAM,
                PermissionScope.SELF
        );
        List<PermissionScope> ordered = new ArrayList<>();
        for (PermissionScope scope : order) {
            if (scopes.contains(scope)) {
                ordered.add(scope);
            }
        }
        return ordered;
    }

    private Comparator<EffectivePermissionResponse> effectivePermissionComparator() {
        Map<String, Integer> moduleOrder = indexMap(PermissionCatalog.MODULES);
        Map<String, Integer> actionOrder = indexMap(PermissionCatalog.ACTIONS);
        return Comparator
                .comparing((EffectivePermissionResponse permission) -> moduleOrder.getOrDefault(permission.getModule(), 999))
                .thenComparing(permission -> actionOrder.getOrDefault(permission.getAction(), 999))
                .thenComparing(EffectivePermissionResponse::getModule)
                .thenComparing(EffectivePermissionResponse::getAction);
    }

    private Map<String, Integer> indexMap(List<String> values) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < values.size(); i++) {
            map.put(values.get(i), i);
        }
        return map;
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
