package com.hrms.api.dataimport.controller;

import com.hrms.api.dataimport.dto.*;
import com.hrms.application.dataimport.service.KekaImportService;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * REST controller for KEKA HRMS data import
 *
 * All endpoints require system.admin permission
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/keka-import")
@RequiredArgsConstructor
public class KekaImportController {

    private final KekaImportService kekaImportService;

    /**
     * Upload a KEKA CSV file and detect columns
     */
    @PostMapping("/upload")
    @RequiresPermission("system.admin")
    public ResponseEntity<KekaFileUploadResponse> uploadKekaFile(@RequestParam("file") MultipartFile file) {
        try {
            log.info("Processing KEKA file upload: {}", file.getOriginalFilename());

            KekaFileUploadResponse response = kekaImportService.uploadKekaFile(file);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IOException e) {
            log.error("Error uploading KEKA file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Preview KEKA import with validation
     */
    @PostMapping("/preview")
    @RequiresPermission("system.admin")
    public ResponseEntity<KekaImportPreview> previewKekaImport(@RequestBody KekaImportPreviewRequest request) {
        log.info("Previewing KEKA import for file: {}", request.getFileId());

        KekaImportPreview preview = kekaImportService.previewKekaImport(request);

        return ResponseEntity.ok(preview);
    }

    /**
     * Execute KEKA import
     */
    @PostMapping("/execute")
    @RequiresPermission("system.admin")
    public ResponseEntity<KekaImportResult> executeKekaImport(@RequestBody KekaImportExecuteRequest request) {
        log.info("Executing KEKA import for file: {}", request.getFileId());

        KekaImportResult result = kekaImportService.executeKekaImport(request);

        return ResponseEntity.ok(result);
    }

    /**
     * Get KEKA import history for the current tenant
     */
    @GetMapping("/history")
    @RequiresPermission("system.admin")
    public ResponseEntity<Page<KekaImportHistoryEntry>> getImportHistory(Pageable pageable) {
        log.info("Fetching KEKA import history");

        Page<KekaImportHistoryEntry> history = kekaImportService.getImportHistory(pageable);

        return ResponseEntity.ok(history);
    }

    /**
     * Get details of a specific import
     */
    @GetMapping("/{importId}")
    @RequiresPermission("system.admin")
    public ResponseEntity<KekaImportHistoryEntry> getImportDetails(@PathVariable String importId) {
        log.info("Fetching KEKA import details: {}", importId);

        KekaImportHistoryEntry details = kekaImportService.getImportDetails(importId);

        return ResponseEntity.ok(details);
    }

    /**
     * Download error report as CSV
     */
    @GetMapping("/{importId}/errors/csv")
    @RequiresPermission("system.admin")
    public ResponseEntity<String> downloadErrorReport(@PathVariable String importId) {
        log.info("Downloading error report for import: {}", importId);

        // Placeholder implementation
        // In production, would generate and return CSV file as blob

        return ResponseEntity.ok("Error report CSV content");
    }

    /**
     * Cancel an in-progress import
     */
    @PostMapping("/{importId}/cancel")
    @RequiresPermission("system.admin")
    public ResponseEntity<Void> cancelKekaImport(@PathVariable String importId) {
        log.info("Cancelling KEKA import: {}", importId);

        // Placeholder implementation
        // In production, would mark import as cancelled if in progress

        return ResponseEntity.noContent().build();
    }
}
