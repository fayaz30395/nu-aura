package com.nulogic.api.dataimport.controller;

import com.nulogic.api.dataimport.dto.*;
import com.nulogic.application.dataimport.service.KekaImportService;
import com.nulogic.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
 * <p>
 * All endpoints require SYSTEM:ADMIN permission
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/keka-import")
@RequiredArgsConstructor
@Tag(name = "KEKA Import", description = "KEKA HRMS data import APIs — all endpoints require SYSTEM:ADMIN")
public class KekaImportController {

    private final KekaImportService kekaImportService;

    /**
     * Upload a KEKA CSV file and detect columns
     */
    @PostMapping("/upload")
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Upload KEKA CSV", description = "Upload a KEKA HRMS export file and auto-detect column mappings")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "File uploaded and columns detected successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid file format"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission"),
            @ApiResponse(responseCode = "500", description = "I/O error reading the file")
    })
    public ResponseEntity<KekaFileUploadResponse> uploadKekaFile(
            @Parameter(description = "KEKA CSV file") @RequestParam("file") MultipartFile file) {
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
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Preview KEKA import", description = "Validate and preview the KEKA import without persisting any records")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Preview generated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission"),
            @ApiResponse(responseCode = "404", description = "Uploaded file not found")
    })
    public ResponseEntity<KekaImportPreview> previewKekaImport(@Valid @RequestBody KekaImportPreviewRequest request) {
        log.info("Previewing KEKA import for file: {}", request.getFileId());

        KekaImportPreview preview = kekaImportService.previewKekaImport(request);

        return ResponseEntity.ok(preview);
    }

    /**
     * Execute KEKA import
     */
    @PostMapping("/execute")
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Execute KEKA import", description = "Persist the previewed import into the current tenant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Import executed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission"),
            @ApiResponse(responseCode = "404", description = "Uploaded file not found")
    })
    public ResponseEntity<KekaImportResult> executeKekaImport(@Valid @RequestBody KekaImportExecuteRequest request) {
        log.info("Executing KEKA import for file: {}", request.getFileId());

        KekaImportResult result = kekaImportService.executeKekaImport(request);

        return ResponseEntity.ok(result);
    }

    /**
     * Get KEKA import history for the current tenant
     */
    @GetMapping("/history")
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Get import history", description = "Returns a paginated history of KEKA imports for the current tenant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "History retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission")
    })
    public ResponseEntity<Page<KekaImportHistoryEntry>> getImportHistory(Pageable pageable) {
        log.info("Fetching KEKA import history");

        Page<KekaImportHistoryEntry> history = kekaImportService.getImportHistory(pageable);

        return ResponseEntity.ok(history);
    }

    /**
     * Get details of a specific import
     */
    @GetMapping("/{importId}")
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Get import details", description = "Returns the full record of a single KEKA import")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Import details retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission"),
            @ApiResponse(responseCode = "404", description = "Import not found")
    })
    public ResponseEntity<KekaImportHistoryEntry> getImportDetails(
            @Parameter(description = "Import ID") @PathVariable String importId) {
        log.info("Fetching KEKA import details: {}", importId);

        KekaImportHistoryEntry details = kekaImportService.getImportDetails(importId);

        return ResponseEntity.ok(details);
    }

    /**
     * Download error report as CSV
     */
    @GetMapping("/{importId}/errors/csv")
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Download error CSV", description = "Download a CSV report of validation errors for the specified import")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Error report generated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission"),
            @ApiResponse(responseCode = "404", description = "Import not found")
    })
    public ResponseEntity<String> downloadErrorReport(
            @Parameter(description = "Import ID") @PathVariable String importId) {
        log.info("Downloading error report for import: {}", importId);

        // Placeholder implementation
        // In production, would generate and return CSV file as blob

        return ResponseEntity.ok("Error report CSV content");
    }

    /**
     * Cancel an in-progress import
     */
    @PostMapping("/{importId}/cancel")
    @RequiresPermission("SYSTEM:ADMIN")
    @Operation(summary = "Cancel import", description = "Cancel an in-progress KEKA import")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Import cancelled successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires SYSTEM:ADMIN permission"),
            @ApiResponse(responseCode = "404", description = "Import not found")
    })
    public ResponseEntity<Void> cancelKekaImport(
            @Parameter(description = "Import ID") @PathVariable String importId) {
        log.info("Cancelling KEKA import: {}", importId);

        // Placeholder implementation
        // In production, would mark import as cancelled if in progress

        return ResponseEntity.noContent().build();
    }
}
