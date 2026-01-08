package com.nulogic.hrms.iam.bootstrap;

import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionGroup;
import com.nulogic.hrms.iam.repo.PermissionGroupRepository;
import com.nulogic.hrms.iam.repo.PermissionRepository;
import com.nulogic.hrms.org.Org;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PermissionGroupSeeder {
    private final PermissionGroupRepository permissionGroupRepository;
    private final PermissionRepository permissionRepository;

    public PermissionGroupSeeder(PermissionGroupRepository permissionGroupRepository,
                                 PermissionRepository permissionRepository) {
        this.permissionGroupRepository = permissionGroupRepository;
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public void seedGroups(Org org) {
        List<Permission> permissions = permissionRepository.findAll();
        Map<String, List<Permission>> byModule = new HashMap<>();
        for (Permission permission : permissions) {
            byModule.computeIfAbsent(permission.getModule(), key -> new java.util.ArrayList<>())
                    .add(permission);
        }

        for (Map.Entry<String, List<Permission>> entry : byModule.entrySet()) {
            String groupName = entry.getKey();
            permissionGroupRepository.findByOrg_IdAndName(org.getId(), groupName)
                    .orElseGet(() -> {
                        PermissionGroup group = new PermissionGroup();
                        group.setOrg(org);
                        group.setName(groupName);
                        group.setDescription("Default permissions for " + groupName);
                        group.setPermissions(new HashSet<>(entry.getValue()));
                        return permissionGroupRepository.save(group);
                    });
        }
    }
}
