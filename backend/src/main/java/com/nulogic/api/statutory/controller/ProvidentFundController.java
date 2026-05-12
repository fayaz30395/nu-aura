package com.nulogic.api.statutory.controller;

import com.nulogic.application.statutory.service.StatutoryService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.statutory.EmployeePFRecord;
import com.nulogic.domain.statutory.ProvidentFundConfig;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statutory/pf")
@RequiredArgsConstructor
public class ProvidentFundController {

    private final StatutoryService statutoryService;

    @PostMapping("/config")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ProvidentFundConfig> createConfig(@Valid @RequestBody ProvidentFundConfig config) {
        return ResponseEntity.ok(statutoryService.createPFConfig(config));
    }

    @GetMapping("/config")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<ProvidentFundConfig>> getActiveConfigs() {
        return ResponseEntity.ok(statutoryService.getActivePFConfigs());
    }

    @PostMapping("/employee")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<EmployeePFRecord> enrollEmployee(@Valid @RequestBody EmployeePFRecord record) {
        return ResponseEntity.ok(statutoryService.enrollEmployeePF(record));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<EmployeePFRecord> getEmployeeRecord(@PathVariable UUID employeeId) {
        return statutoryService.getEmployeePFRecord(employeeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
