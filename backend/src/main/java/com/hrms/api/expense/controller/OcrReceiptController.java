package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.OcrResult;
import com.hrms.application.expense.service.OcrReceiptService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * REST controller for OCR receipt scanning.
 * Accepts receipt images (JPEG, PNG, PDF) and returns extracted expense data.
 */
@RestController
@RequestMapping("/api/v1/expenses/receipts")
@RequiredArgsConstructor
@Slf4j
@Validated
public class OcrReceiptController {

    private final OcrReceiptService ocrReceiptService;

    /**
     * Scan a receipt image and extract expense data via OCR.
     *
     * @param file receipt image (JPEG, PNG, or PDF, max 10MB)
     * @return structured OCR result with extracted fields
     */
    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<OcrResult> scanReceipt(
            @RequestParam("file") MultipartFile file) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("OCR receipt scan requested for tenant: {}, file: {}, size: {} bytes",
                tenantId, file.getOriginalFilename(), file.getSize());

        OcrResult result = ocrReceiptService.scanReceipt(tenantId, file);
        return ResponseEntity.ok(result);
    }
}
