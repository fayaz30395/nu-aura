package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.OrganizationHealthResponse;
import com.hrms.application.analytics.service.OrganizationHealthService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics/org-health")
@RequiredArgsConstructor
public class OrganizationHealthController {

    private final OrganizationHealthService organizationHealthService;

    @GetMapping
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public OrganizationHealthResponse getOrganizationHealth() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return organizationHealthService.getOrganizationHealth(tenantId);
    }
}
