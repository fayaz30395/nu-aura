package com.nulogic.api.statutory.controller;

import com.nulogic.application.statutory.service.StatutoryService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.statutory.ESIConfig;
import com.nulogic.domain.statutory.EmployeeESIRecord;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statutory/esi")
@RequiredArgsConstructor
public class ESIController {

    private final StatutoryService statutoryService;

    @PostMapping("/config")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ESIConfig> createConfig(@Valid @RequestBody ESIConfig config) {
        return ResponseEntity.ok(statutoryService.createESIConfig(config));
    }

    @GetMapping("/config")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<ESIConfig>> getActiveConfigs() {
        return ResponseEntity.ok(statutoryService.getActiveESIConfigs());
    }

    @PostMapping("/employee")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<EmployeeESIRecord> enrollEmployee(@Valid @RequestBody EmployeeESIRecord record) {
        return ResponseEntity.ok(statutoryService.enrollEmployeeESI(record));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<EmployeeESIRecord> getEmployeeRecord(@PathVariable UUID employeeId) {
        return statutoryService.getEmployeeESIRecord(employeeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
