package com.hrms.api.statutory.controller;

import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.statutory.ProfessionalTaxSlab;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/statutory/pt")
@RequiredArgsConstructor
public class ProfessionalTaxController {

    private final StatutoryService statutoryService;

    @PostMapping("/slab")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ProfessionalTaxSlab> createSlab(@Valid @RequestBody ProfessionalTaxSlab slab) {
        return ResponseEntity.ok(statutoryService.createPTSlab(slab));
    }

    @GetMapping("/slabs/{stateCode}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<ProfessionalTaxSlab>> getSlabsByState(@PathVariable String stateCode) {
        return ResponseEntity.ok(statutoryService.getPTSlabsByState(stateCode));
    }
}
