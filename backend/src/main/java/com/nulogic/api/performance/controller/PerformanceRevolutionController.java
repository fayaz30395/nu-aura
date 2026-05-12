package com.nulogic.api.performance.controller;

import com.nulogic.api.performance.dto.OKRGraphResponse;
import com.nulogic.api.performance.dto.PerformanceSpiderResponse;
import com.nulogic.application.performance.service.PerformanceRevolutionService;
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
@RequestMapping("/api/v1/performance/revolution")
@RequiredArgsConstructor
public class PerformanceRevolutionController {

    private final PerformanceRevolutionService performanceRevolutionService;

    @GetMapping("/okr-graph")
    @RequiresPermission(Permission.OKR_VIEW)
    public OKRGraphResponse getOKRGraph() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return performanceRevolutionService.getOKRGraph(tenantId);
    }

    @GetMapping("/spider/{employeeId}")
    @RequiresPermission(Permission.REVIEW_VIEW)
    public PerformanceSpiderResponse getPerformanceSpider(@PathVariable UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return performanceRevolutionService.getPerformanceSpider(employeeId, tenantId);
    }
}
