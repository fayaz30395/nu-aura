package com.nulogic.api.employee.controller;

import com.nulogic.api.employee.dto.TalentProfileResponse;
import com.nulogic.application.employee.service.TalentProfileService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/employees/{id}/talent-profile")
@RequiredArgsConstructor
public class TalentProfileController {

    private final TalentProfileService talentProfileService;

    @GetMapping
    @RequiresPermission(Permission.EMPLOYEE_READ)
    public TalentProfileResponse getTalentProfile(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return talentProfileService.getTalentProfile(id, tenantId);
    }
}
