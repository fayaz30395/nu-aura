package com.hrms.api.statutory.controller;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.statutory.*;
import com.hrms.infrastructure.statutory.repository.*;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/statutory/tds")
@RequiredArgsConstructor
public class TDSController {
    private final TDSSlabRepository tdsSlabRepository;
    private final EmployeeTDSDeclarationRepository tdsDeclarationRepository;

    @PostMapping("/slab")
    @RequiresPermission("STATUTORY_MANAGE")
    public ResponseEntity<TDSSlab> createSlab(@RequestBody TDSSlab slab) {
        slab.setId(UUID.randomUUID());
        slab.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(tdsSlabRepository.save(slab));
    }

    @GetMapping("/slabs/{assessmentYear}/{regime}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<List<TDSSlab>> getSlabs(
        @PathVariable String assessmentYear,
        @PathVariable TDSSlab.TaxRegime regime) {
        return ResponseEntity.ok(tdsSlabRepository.findByTenantIdAndAssessmentYearAndTaxRegimeAndIsActiveTrue(
            TenantContext.getCurrentTenant(), assessmentYear, regime));
    }

    @PostMapping("/declaration")
    @RequiresPermission("STATUTORY_MANAGE")
    public ResponseEntity<EmployeeTDSDeclaration> submitDeclaration(@RequestBody EmployeeTDSDeclaration declaration) {
        declaration.setId(UUID.randomUUID());
        declaration.setTenantId(TenantContext.getCurrentTenant());
        declaration.setSubmittedAt(LocalDateTime.now());
        return ResponseEntity.ok(tdsDeclarationRepository.save(declaration));
    }

    @GetMapping("/declaration/{employeeId}/{financialYear}")
    @RequiresPermission("STATUTORY_VIEW")
    public ResponseEntity<EmployeeTDSDeclaration> getDeclaration(
        @PathVariable UUID employeeId,
        @PathVariable String financialYear) {
        return tdsDeclarationRepository.findByTenantIdAndEmployeeIdAndFinancialYear(
            TenantContext.getCurrentTenant(), employeeId, financialYear)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/declaration/{id}/approve")
    @RequiresPermission("STATUTORY_MANAGE")
    public ResponseEntity<EmployeeTDSDeclaration> approveDeclaration(@PathVariable UUID id, @RequestBody UUID approverId) {
        return tdsDeclarationRepository.findById(id)
            .map(decl -> {
                decl.setStatus(EmployeeTDSDeclaration.DeclarationStatus.APPROVED);
                decl.setApprovedAt(LocalDateTime.now());
                decl.setApprovedBy(approverId);
                return ResponseEntity.ok(tdsDeclarationRepository.save(decl));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
