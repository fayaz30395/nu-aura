package com.hrms.api.lms.controller;

import com.hrms.api.lms.dto.CourseCatalogResponse;
import com.hrms.api.lms.dto.SkillGapReport;
import com.hrms.application.lms.service.LmsService;
import com.hrms.application.lms.service.SkillGapAnalysisService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lms")
@RequiredArgsConstructor
public class LmsController {

    private final LmsService lmsService;
    private final SkillGapAnalysisService skillGapAnalysisService;

    @GetMapping("/catalog")
    @RequiresPermission(Permission.TRAINING_VIEW)
    public CourseCatalogResponse getCatalog(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return lmsService.getCourseCatalog(tenantId, page, size);
    }

    @PostMapping("/courses/{courseId}/enroll")
    @RequiresPermission(Permission.LMS_ENROLL)
    public void enroll(@PathVariable UUID courseId, @RequestParam UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = UUID.randomUUID(); // Placeholder: should come from SecurityContext
        lmsService.enrollEmployee(tenantId, courseId, employeeId, currentUserId);
    }

    @GetMapping("/employees/{employeeId}/skill-gaps")
    @RequiresPermission(Permission.EMPLOYEE_READ)
    public SkillGapReport getSkillGaps(@PathVariable UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return skillGapAnalysisService.analyzeGaps(tenantId, employeeId);
    }
}
