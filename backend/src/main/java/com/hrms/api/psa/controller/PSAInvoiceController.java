package com.hrms.api.psa.controller;

import com.hrms.application.psa.service.PSAService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.psa.PSAInvoice;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

/**
 * REST controller for PSA Invoice management.
 *
 * <p><strong>SECURITY:</strong> All operations enforce tenant isolation through the PSAService layer.
 * Invoices are always scoped to the current tenant from TenantContext.</p>
 */
@RestController
@RequestMapping("/api/v1/psa/invoices")
@RequiredArgsConstructor
public class PSAInvoiceController {
    private final PSAService psaService;

    @PostMapping
    @RequiresPermission(PAYROLL_PROCESS)
    public ResponseEntity<PSAInvoice> createInvoice(@Valid @RequestBody PSAInvoice invoice) {
        return ResponseEntity.ok(psaService.createInvoice(invoice));
    }

    @GetMapping("/project/{projectId}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PSAInvoice>> getProjectInvoices(@PathVariable UUID projectId) {
        return ResponseEntity.ok(psaService.getProjectInvoices(projectId));
    }

    @GetMapping("/client/{clientId}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PSAInvoice>> getClientInvoices(@PathVariable UUID clientId) {
        return ResponseEntity.ok(psaService.getClientInvoices(clientId));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PSAInvoice>> getInvoicesByStatus(@PathVariable PSAInvoice.InvoiceStatus status) {
        return ResponseEntity.ok(psaService.getInvoicesByStatus(status));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<PSAInvoice> getInvoice(@PathVariable UUID id) {
        return psaService.getInvoice(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @RequiresPermission(PAYROLL_PROCESS)
    public ResponseEntity<PSAInvoice> updateInvoice(@PathVariable UUID id, @Valid @RequestBody PSAInvoice invoice) {
        return psaService.updateInvoice(id, invoice)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(PAYROLL_APPROVE)
    public ResponseEntity<PSAInvoice> approveInvoice(@PathVariable UUID id) {
        return psaService.approveInvoice(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
