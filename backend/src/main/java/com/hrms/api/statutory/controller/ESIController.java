package com.hrms.api.statutory.controller;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.statutory.*;
import com.hrms.infrastructure.statutory.repository.*;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/statutory/esi")
@RequiredArgsConstructor
public class ESIController {
    private final ESIConfigRepository esiConfigRepository;
    private final EmployeeESIRecordRepository employeeESIRecordRepository;

    @PostMapping("/config")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ESIConfig> createConfig(@RequestBody ESIConfig config) {
        config.setId(UUID.randomUUID());
        config.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(esiConfigRepository.save(config));
    }

    @GetMapping("/config")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<ESIConfig>> getActiveConfigs() {
        return ResponseEntity.ok(esiConfigRepository.findByTenantIdAndIsActiveTrue(TenantContext.getCurrentTenant()));
    }

    @PostMapping("/employee")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<EmployeeESIRecord> enrollEmployee(@RequestBody EmployeeESIRecord record) {
        record.setId(UUID.randomUUID());
        record.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(employeeESIRecordRepository.save(record));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<EmployeeESIRecord> getEmployeeRecord(@PathVariable UUID employeeId) {
        return employeeESIRecordRepository.findByTenantIdAndEmployeeId(TenantContext.getCurrentTenant(), employeeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
