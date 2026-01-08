package com.nulogic.hrms.iam.bootstrap;

import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.repo.PermissionRepository;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PermissionSeeder {
    private final PermissionRepository permissionRepository;

    public PermissionSeeder(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public void seedPermissions() {
        Set<String> existing = new HashSet<>();
        permissionRepository.findAll().forEach(permission ->
                existing.add(key(permission.getModule(), permission.getAction(), permission.getScope().name()))
        );

        for (String module : PermissionCatalog.MODULES) {
            for (String action : PermissionCatalog.ACTIONS) {
                for (PermissionScope scope : PermissionScope.values()) {
                    String key = key(module, action, scope.name());
                    if (existing.contains(key)) {
                        continue;
                    }
                    Permission permission = new Permission();
                    permission.setModule(module);
                    permission.setAction(action);
                    permission.setScope(scope);
                    permissionRepository.save(permission);
                    existing.add(key);
                }
            }
        }
    }

    private String key(String module, String action, String scope) {
        return module + ":" + action + ":" + scope;
    }
}
