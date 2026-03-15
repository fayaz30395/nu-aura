package com.hrms.api.statutory.controller;

import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.statutory.EmployeeTDSDeclaration;
import com.hrms.domain.statutory.TDSSlab;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statutory/tds")
@RequiredArgsConstructor
public class TDSController {

    private final StatutoryService statutoryService;

    @PostMapping("/slab")
    @RequiresPermission("STATUTORY_MANAGE")
    public ResponseEntity<TDSSlab> createSlab(@Valid @RequestBody TDSSlab slab) {
        return ResponseEntity.ok(statutoryService.createTDSSlab(slab));
    }

    @GetMapping("/slabs/{assessmentYear}/{regime}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<List<TDSSlab>> getSlabs(
            @PathVariable String assessmentYear,
            @PathVariable TDSSlab.TaxRegime regime) {
        return ResponseEntity.ok(statutoryService.getTDSSlabs(assessmentYear, regime));
    }

    @PostMapping("/declaration")
    @RequiresPermission("STATUTORY_MANAGE")
    public ResponseEntity<EmployeeTDSDeclaration> submitDeclaration(
            @Valid @RequestBody EmployeeTDSDeclaration declaration) {
        return ResponseEntity.ok(statutoryService.submitTDSDeclaration(declaration));
    }

    @GetMapping("/declaration/{employeeId}/{financialYear}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<EmployeeTDSDeclaration> getDeclaration(
            @PathVariable UUID employeeId,
            @PathVariable String financialYear) {
        return statutoryService.getTDSDeclaration(employeeId, financialYear)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/declaration/{id}/approve")
    @RequiresPermission("STATUTORY_MANAGE")
    public ResponseEntity<EmployeeTDSDeclaration> approveDeclaration(
            @PathVariable UUID id,
            @Valid @RequestBody UUID approverId) {
        return statutoryService.approveTDSDeclaration(id, approverId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
