package com.hrms.api.mobile.controller;

import com.hrms.api.mobile.dto.MobileDashboardResponse;
import com.hrms.application.mobile.service.MobileService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mobile/dashboard")
@RequiredArgsConstructor
@Tag(name = "Mobile Dashboard", description = "Mobile-optimized dashboard endpoints")
public class MobileDashboardController {

    private final MobileService mobileService;

    @GetMapping
    @RequiresPermission(Permission.DASHBOARD_VIEW)
    @Operation(summary = "Get mobile dashboard", description = "Get aggregated dashboard data optimized for mobile with employee summary, attendance, leave balance, approvals, and announcements")
    public ResponseEntity<MobileDashboardResponse> getDashboard() {
        return ResponseEntity.ok(mobileService.getMobileDashboard());
    }
}
