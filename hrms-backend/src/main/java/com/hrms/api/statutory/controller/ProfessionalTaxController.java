package com.hrms.api.statutory.controller;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.statutory.ProfessionalTaxSlab;
import com.hrms.infrastructure.statutory.repository.ProfessionalTaxSlabRepository;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/statutory/pt")
@RequiredArgsConstructor
public class ProfessionalTaxController {
    private final ProfessionalTaxSlabRepository ptSlabRepository;

    @PostMapping("/slab")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ProfessionalTaxSlab> createSlab(@RequestBody ProfessionalTaxSlab slab) {
        slab.setId(UUID.randomUUID());
        slab.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(ptSlabRepository.save(slab));
    }

    @GetMapping("/slabs/{stateCode}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<ProfessionalTaxSlab>> getSlabsByState(@PathVariable String stateCode) {
        return ResponseEntity.ok(ptSlabRepository.findByTenantIdAndStateCodeAndIsActiveTrue(
            TenantContext.getCurrentTenant(), stateCode));
    }
}
