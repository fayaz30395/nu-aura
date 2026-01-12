package com.hrms.api.employee.controller;

import com.hrms.api.employee.dto.EmployeeImportPreview;
import com.hrms.api.employee.dto.EmployeeImportResult;
import com.hrms.application.employee.service.EmployeeImportService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Controller for bulk employee import operations.
 */
@RestController
@RequestMapping("/api/v1/employees/import")
@RequiredArgsConstructor
@Slf4j
public class EmployeeImportController {

    private final EmployeeImportService employeeImportService;

    /**
     * Download CSV template for employee import.
     */
    @GetMapping("/template/csv")
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    public ResponseEntity<byte[]> downloadCsvTemplate() {
        log.info("Downloading CSV template for employee import");
        byte[] template = employeeImportService.getCsvTemplate();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee_import_template.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(template);
    }

    /**
     * Download Excel template for employee import.
     */
    @GetMapping("/template/xlsx")
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    public ResponseEntity<byte[]> downloadExcelTemplate() throws IOException {
        log.info("Downloading Excel template for employee import");
        byte[] template = employeeImportService.getExcelTemplate();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee_import_template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(template);
    }

    /**
     * Preview import - uploads file, validates, and returns preview without importing.
     */
    @PostMapping("/preview")
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    public ResponseEntity<EmployeeImportPreview> previewImport(
            @RequestParam("file") MultipartFile file
    ) {
        log.info("Previewing employee import from file: {}", file.getOriginalFilename());

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".csv") && !filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new IllegalArgumentException("Only CSV and Excel files are supported");
        }

        EmployeeImportPreview preview = employeeImportService.previewImport(file);
        return ResponseEntity.ok(preview);
    }

    /**
     * Execute the import - uploads file and imports valid records.
     * If skipInvalid is true, invalid rows are skipped; otherwise import fails if any row is invalid.
     */
    @PostMapping("/execute")
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    public ResponseEntity<EmployeeImportResult> executeImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "skipInvalid", defaultValue = "true") boolean skipInvalid
    ) {
        log.info("Executing employee import from file: {}, skipInvalid: {}", file.getOriginalFilename(), skipInvalid);

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".csv") && !filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new IllegalArgumentException("Only CSV and Excel files are supported");
        }

        EmployeeImportResult result = employeeImportService.executeImport(file, skipInvalid);
        return ResponseEntity.ok(result);
    }
}
