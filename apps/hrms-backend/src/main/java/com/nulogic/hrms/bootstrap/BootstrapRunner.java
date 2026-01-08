package com.nulogic.hrms.bootstrap;

import com.nulogic.hrms.iam.bootstrap.PermissionSeeder;
import com.nulogic.hrms.iam.bootstrap.PermissionGroupSeeder;
import com.nulogic.hrms.iam.bootstrap.RoleSeeder;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class BootstrapRunner implements ApplicationRunner {
    private final OrgService orgService;
    private final PermissionSeeder permissionSeeder;
    private final PermissionGroupSeeder permissionGroupSeeder;
    private final RoleSeeder roleSeeder;

    public BootstrapRunner(OrgService orgService,
                           PermissionSeeder permissionSeeder,
                           PermissionGroupSeeder permissionGroupSeeder,
                           RoleSeeder roleSeeder) {
        this.orgService = orgService;
        this.permissionSeeder = permissionSeeder;
        this.permissionGroupSeeder = permissionGroupSeeder;
        this.roleSeeder = roleSeeder;
    }

    @Override
    public void run(ApplicationArguments args) {
        Org org = orgService.getOrCreateOrg();
        permissionSeeder.seedPermissions();
        permissionGroupSeeder.seedGroups(org);
        roleSeeder.seedRoles(org);
    }
}
