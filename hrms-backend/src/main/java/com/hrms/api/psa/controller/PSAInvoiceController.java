package com.hrms.api.psa.controller;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.psa.PSAInvoice;
import com.hrms.infrastructure.psa.repository.PSAInvoiceRepository;
import lombok.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/psa/invoices")
@RequiredArgsConstructor
public class PSAInvoiceController {
    private final PSAInvoiceRepository invoiceRepository;

    @PostMapping
    @RequiresPermission(PAYROLL_PROCESS)
    public ResponseEntity<PSAInvoice> createInvoice(@RequestBody PSAInvoice invoice) {
        invoice.setId(UUID.randomUUID());
        invoice.setTenantId(TenantContext.getCurrentTenant());
        return ResponseEntity.ok(invoiceRepository.save(invoice));
    }

    @GetMapping("/project/{projectId}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PSAInvoice>> getProjectInvoices(@PathVariable UUID projectId) {
        return ResponseEntity.ok(invoiceRepository.findByTenantIdAndProjectId(
            TenantContext.getCurrentTenant(), projectId));
    }

    @GetMapping("/client/{clientId}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PSAInvoice>> getClientInvoices(@PathVariable UUID clientId) {
        return ResponseEntity.ok(invoiceRepository.findByTenantIdAndClientId(
            TenantContext.getCurrentTenant(), clientId));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<List<PSAInvoice>> getInvoicesByStatus(@PathVariable PSAInvoice.InvoiceStatus status) {
        return ResponseEntity.ok(invoiceRepository.findByTenantIdAndStatus(
            TenantContext.getCurrentTenant(), status));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PAYROLL_VIEW_ALL)
    public ResponseEntity<PSAInvoice> getInvoice(@PathVariable UUID id) {
        return invoiceRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @RequiresPermission(PAYROLL_PROCESS)
    public ResponseEntity<PSAInvoice> updateInvoice(@PathVariable UUID id, @RequestBody PSAInvoice invoice) {
        return invoiceRepository.findById(id)
            .map(existing -> {
                invoice.setId(id);
                invoice.setTenantId(existing.getTenantId());
                return ResponseEntity.ok(invoiceRepository.save(invoice));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(PAYROLL_APPROVE)
    public ResponseEntity<PSAInvoice> approveInvoice(@PathVariable UUID id) {
        return invoiceRepository.findById(id)
            .map(inv -> {
                inv.setStatus(PSAInvoice.InvoiceStatus.SENT);
                return ResponseEntity.ok(invoiceRepository.save(inv));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
