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
@RequestMapping("/api/v1/statutory/pf")
@RequiredArgsConstructor
public class ProvidentFundController {
    private final ProvidentFundConfigRepository pfConfigRepository;
    private final EmployeePFRecordRepository employeePFRecordRepository;

    @PostMapping("/config")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ProvidentFundConfig> createConfig(@RequestBody ProvidentFundConfig config) {
        config.setId(UUID.randomUUID());
        config.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(pfConfigRepository.save(config));
    }

    @GetMapping("/config")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<ProvidentFundConfig>> getActiveConfigs() {
        return ResponseEntity.ok(pfConfigRepository.findByTenantIdAndIsActiveTrue(TenantContext.getCurrentTenant()));
    }

    @PostMapping("/employee")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<EmployeePFRecord> enrollEmployee(@RequestBody EmployeePFRecord record) {
        record.setId(UUID.randomUUID());
        record.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(employeePFRecordRepository.save(record));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<EmployeePFRecord> getEmployeeRecord(@PathVariable UUID employeeId) {
        return employeePFRecordRepository.findByTenantIdAndEmployeeId(TenantContext.getCurrentTenant(), employeeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
