package com.hrms.api.migration.controller;

import com.hrms.api.migration.dto.ImportResult;
import com.hrms.application.migration.service.KekaMigrationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/migration")
@RequiredArgsConstructor
@Slf4j
public class DataMigrationController {

    private final KekaMigrationService migrationService;

    /**
     * Import employees from KEKA export file (Excel/CSV)
     * <p>
     * Expected columns:
     * - employee_code (required)
     * - email (required)
     * - first_name (required)
     * - last_name
     * - middle_name
     * - personal_email
     * - phone
     * - department
     * - designation
     * - joining_date
     * - date_of_birth
     * - gender
     * - employment_type
     * - bank_account
     * - bank_name
     */
    @PostMapping(value = "/employees", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<ImportResult> importEmployees(@RequestParam("file") MultipartFile file) {
        log.info("Starting employee import from file: {}", file.getOriginalFilename());
        ImportResult result = migrationService.importEmployees(file);
        return ResponseEntity.ok(result);
    }

    /**
     * Import attendance records from KEKA export file (Excel/CSV)
     * <p>
     * Expected columns:
     * - employee_code (required)
     * - date (required)
     * - check_in (HH:mm format)
     * - check_out (HH:mm format)
     * - status (PRESENT, ABSENT, HALF_DAY, ON_LEAVE, WEEKLY_OFF, HOLIDAY)
     * - source
     */
    @PostMapping(value = "/attendance", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<ImportResult> importAttendance(@RequestParam("file") MultipartFile file) {
        log.info("Starting attendance import from file: {}", file.getOriginalFilename());
        ImportResult result = migrationService.importAttendance(file);
        return ResponseEntity.ok(result);
    }

    /**
     * Import leave balances from KEKA export file (Excel/CSV)
     * <p>
     * Expected columns:
     * - employee_code (required)
     * - leave_type (required)
     * - year
     * - opening_balance
     * - accrued
     * - used
     * - available
     * - carried_forward
     */
    @PostMapping(value = "/leave-balances", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<ImportResult> importLeaveBalances(@RequestParam("file") MultipartFile file) {
        log.info("Starting leave balance import from file: {}", file.getOriginalFilename());
        ImportResult result = migrationService.importLeaveBalances(file);
        return ResponseEntity.ok(result);
    }

    /**
     * Import salary structures from KEKA export file (Excel/CSV)
     * <p>
     * Expected columns:
     * - employee_code (required)
     * - basic_salary (required)
     * - effective_date
     * - hra
     * - conveyance
     * - medical
     * - special_allowance
     * - other_allowances
     * - pf
     * - pt
     * - income_tax
     */
    @PostMapping(value = "/salary-structures", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<ImportResult> importSalaryStructures(@RequestParam("file") MultipartFile file) {
        log.info("Starting salary structure import from file: {}", file.getOriginalFilename());
        ImportResult result = migrationService.importSalaryStructures(file);
        return ResponseEntity.ok(result);
    }

    /**
     * Import departments from KEKA export file (Excel/CSV)
     * <p>
     * Expected columns:
     * - name (required)
     * - code
     * - description
     * - location
     * - cost_center
     */
    @PostMapping(value = "/departments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<ImportResult> importDepartments(@RequestParam("file") MultipartFile file) {
        log.info("Starting department import from file: {}", file.getOriginalFilename());
        ImportResult result = migrationService.importDepartments(file);
        return ResponseEntity.ok(result);
    }

    /**
     * Get sample import templates
     */
    @GetMapping("/templates")
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<Map<String, Object>> getTemplates() {
        return ResponseEntity.ok(Map.of(
                "employees", Map.of(
                        "description", "Employee master data",
                        "requiredColumns", List.of("employee_code", "email", "first_name"),
                        "optionalColumns", List.of("last_name", "middle_name", "personal_email", "phone",
                                "department", "designation", "joining_date", "date_of_birth",
                                "gender", "employment_type", "bank_account", "bank_name")
                ),
                "attendance", Map.of(
                        "description", "Daily attendance records",
                        "requiredColumns", List.of("employee_code", "date"),
                        "optionalColumns", List.of("check_in", "check_out", "status", "source")
                ),
                "leave_balances", Map.of(
                        "description", "Leave balance information",
                        "requiredColumns", List.of("employee_code", "leave_type"),
                        "optionalColumns", List.of("year", "opening_balance", "accrued", "used",
                                "available", "carried_forward")
                ),
                "salary_structures", Map.of(
                        "description", "Salary structure data",
                        "requiredColumns", List.of("employee_code", "basic_salary"),
                        "optionalColumns", List.of("effective_date", "hra", "conveyance", "medical",
                                "special_allowance", "other_allowances", "pf", "pt", "income_tax")
                ),
                "departments", Map.of(
                        "description", "Department master data",
                        "requiredColumns", List.of("name"),
                        "optionalColumns", List.of("code", "description", "location", "cost_center")
                ),
                "supportedFormats", List.of(".xlsx", ".xls", ".csv"),
                "dateFormats", List.of("yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy")
        ));
    }

    /**
     * Validate file format without importing
     */
    @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permission.MIGRATION_IMPORT)
    public ResponseEntity<Map<String, Object>> validateFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type) {
        String filename = file.getOriginalFilename();
        boolean validFormat = filename != null &&
                (filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv"));

        List<String> requiredColumns = switch (type.toLowerCase()) {
            case "employees" -> List.of("employee_code", "email", "first_name");
            case "attendance" -> List.of("employee_code", "date");
            case "leave_balances" -> List.of("employee_code", "leave_type");
            case "salary_structures" -> List.of("employee_code", "basic_salary");
            case "departments" -> List.of("name");
            default -> List.of();
        };

        return ResponseEntity.ok(Map.of(
                "filename", filename != null ? filename : "unknown",
                "size", file.getSize(),
                "validFormat", validFormat,
                "type", type,
                "requiredColumns", requiredColumns,
                "message", validFormat ? "File format is valid" : "Invalid file format. Use .xlsx, .xls, or .csv"
        ));
    }
}
