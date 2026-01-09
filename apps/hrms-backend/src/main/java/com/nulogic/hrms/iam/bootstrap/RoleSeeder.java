package com.nulogic.hrms.iam.bootstrap;

import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.Role;
import com.nulogic.hrms.iam.repo.PermissionRepository;
import com.nulogic.hrms.iam.repo.RoleRepository;
import com.nulogic.hrms.org.Org;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RoleSeeder {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public RoleSeeder(RoleRepository roleRepository, PermissionRepository permissionRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public void seedRoles(Org org) {
        List<Permission> allPermissions = permissionRepository.findAll();

        Role superAdmin = ensureRole(org, "SUPER_ADMIN", "Break-glass super admin", true);
        superAdmin.setPermissions(new java.util.HashSet<>(allPermissions));
        roleRepository.save(superAdmin);

        Role hrAdmin = ensureRole(org, "HR_ADMIN", "HR admin", true);
        hrAdmin.setPermissions(new java.util.HashSet<>(filter(allPermissions,
                Set.of("IAM", "ORG", "EMP", "LEAVE", "ATT", "DOC", "ANN", "REP", "AUDIT", "PROJECT", "ALLOCATION"),
                Set.of(PermissionScope.ORG),
                Set.of("VIEW", "CREATE", "UPDATE", "DELETE", "APPROVE", "EXPORT", "UPLOAD", "DOWNLOAD", "MANAGE",
                        "ACTIVATE", "CLOSE", "END"))
        ));
        roleRepository.save(hrAdmin);

        Role hrExecutive = ensureRole(org, "HR_EXECUTIVE", "HR executive", true);
        Set<Permission> hrExecutivePermissions = new java.util.HashSet<>(filter(allPermissions,
                Set.of("ORG", "EMP", "LEAVE", "ATT", "DOC", "ANN", "REP"),
                Set.of(PermissionScope.DEPARTMENT),
                Set.of("VIEW", "CREATE", "UPDATE", "APPROVE", "EXPORT", "UPLOAD", "DOWNLOAD"))
        );
        hrExecutivePermissions.addAll(filter(allPermissions,
                Set.of("PROJECT", "ALLOCATION"),
                Set.of(PermissionScope.DEPARTMENT),
                Set.of("VIEW", "EXPORT"))
        );
        hrExecutive.setPermissions(hrExecutivePermissions);
        roleRepository.save(hrExecutive);

        Role manager = ensureRole(org, "MANAGER", "Manager", true);
        Set<Permission> managerPermissions = new java.util.HashSet<>(filter(allPermissions,
                Set.of("EMP", "LEAVE", "ATT", "ANN"),
                Set.of(PermissionScope.TEAM),
                Set.of("VIEW", "CREATE", "UPDATE", "APPROVE"))
        );
        managerPermissions.addAll(filter(allPermissions,
                Set.of("PROJECT"),
                Set.of(PermissionScope.TEAM),
                Set.of("VIEW", "CREATE", "UPDATE", "ACTIVATE", "CLOSE", "EXPORT"))
        );
        managerPermissions.addAll(filter(allPermissions,
                Set.of("ALLOCATION"),
                Set.of(PermissionScope.TEAM),
                Set.of("VIEW", "CREATE", "UPDATE", "END", "EXPORT"))
        );
        manager.setPermissions(managerPermissions);
        roleRepository.save(manager);

        Role employee = ensureRole(org, "EMPLOYEE", "Employee", true);
        Set<Permission> employeePermissions = new java.util.HashSet<>(filter(allPermissions,
                Set.of("EMP", "LEAVE", "ATT", "DOC", "ANN"),
                Set.of(PermissionScope.SELF),
                Set.of("VIEW", "CREATE", "UPDATE", "UPLOAD", "DOWNLOAD"))
        );
        employeePermissions.addAll(filter(allPermissions,
                Set.of("PROJECT"),
                Set.of(PermissionScope.SELF),
                Set.of("VIEW"))
        );
        employeePermissions.addAll(filter(allPermissions,
                Set.of("ALLOCATION"),
                Set.of(PermissionScope.SELF),
                Set.of("VIEW"))
        );
        employee.setPermissions(employeePermissions);
        roleRepository.save(employee);

        Role itAdmin = ensureRole(org, "IT_ADMIN", "IT admin", true);
        itAdmin.setPermissions(new java.util.HashSet<>(filter(allPermissions,
                Set.of("INTEGRATION", "SYSTEM"),
                Set.of(PermissionScope.ORG),
                Set.of("VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"))
        ));
        roleRepository.save(itAdmin);
    }

    private Role ensureRole(Org org, String name, String description, boolean system) {
        return roleRepository.findByOrg_IdAndName(org.getId(), name)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setOrg(org);
                    role.setName(name);
                    role.setDescription(description);
                    role.setSystem(system);
                    return role;
                });
    }

    private Set<Permission> filter(List<Permission> permissions, Set<String> modules,
                                   Set<PermissionScope> scopes, Set<String> actions) {
        return permissions.stream()
                .filter(permission -> modules.contains(permission.getModule()))
                .filter(permission -> scopes.contains(permission.getScope()))
                .filter(permission -> actions.contains(permission.getAction()))
                .collect(Collectors.toSet());
    }
}
