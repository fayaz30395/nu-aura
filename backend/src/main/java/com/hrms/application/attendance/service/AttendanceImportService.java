package com.hrms.application.attendance.service;

import com.hrms.api.attendance.dto.BulkAttendanceImportResponse;
import com.hrms.api.attendance.dto.BulkAttendanceImportResponse.ImportErrorCode;
import com.hrms.common.logging.Audited;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Service for bulk importing attendance records from Excel files
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceImportService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /**
     * Generate Excel template for attendance import
     */
    @Transactional(readOnly = true)
    public byte[] generateTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Attendance Import");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Create headers
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "Employee Code*",
                    "Date* (YYYY-MM-DD)",
                    "Check-In Time (HH:MM)",
                    "Check-Out Time (HH:MM)",
                    "Status (PRESENT/ABSENT/HALF_DAY/ON_LEAVE/WEEKLY_OFF/HOLIDAY)",
                    "Remarks"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 6000);
            }

            // Add sample data row
            Row sampleRow = sheet.createRow(1);
            sampleRow.createCell(0).setCellValue("EMP001");
            sampleRow.createCell(1).setCellValue(LocalDate.now().format(DATE_FORMATTER));
            sampleRow.createCell(2).setCellValue("09:00");
            sampleRow.createCell(3).setCellValue("18:00");
            sampleRow.createCell(4).setCellValue("PRESENT");
            sampleRow.createCell(5).setCellValue("Regular day");

            // Add instructions sheet
            Sheet instructionSheet = workbook.createSheet("Instructions");
            instructionSheet.createRow(0).createCell(0).setCellValue("ATTENDANCE IMPORT INSTRUCTIONS");
            instructionSheet.createRow(2).createCell(0).setCellValue("1. Employee Code: Required. Must match existing employee code in the system.");
            instructionSheet.createRow(3).createCell(0).setCellValue("2. Date: Required. Format: YYYY-MM-DD (e.g., 2024-01-15)");
            instructionSheet.createRow(4).createCell(0).setCellValue("3. Check-In Time: Optional. Format: HH:MM (24-hour format, e.g., 09:00)");
            instructionSheet.createRow(5).createCell(0).setCellValue("4. Check-Out Time: Optional. Format: HH:MM (24-hour format, e.g., 18:00)");
            instructionSheet.createRow(6).createCell(0).setCellValue("5. Status: Optional. If not provided, defaults to PRESENT if check-in time is given.");
            instructionSheet.createRow(7).createCell(0).setCellValue("   Valid values: PRESENT, ABSENT, HALF_DAY, ON_LEAVE, WEEKLY_OFF, HOLIDAY");
            instructionSheet.createRow(8).createCell(0).setCellValue("6. Remarks: Optional. Any additional notes.");
            instructionSheet.createRow(10).createCell(0).setCellValue("NOTES:");
            instructionSheet.createRow(11).createCell(0).setCellValue("- Remove the sample row before importing");
            instructionSheet.createRow(12).createCell(0).setCellValue("- Existing records for the same employee and date will be updated");
            instructionSheet.createRow(13).createCell(0).setCellValue("- Maximum 1000 rows per import");

            instructionSheet.setColumnWidth(0, 20000);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final Set<String> VALID_CONTENT_TYPES = Set.of(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
    );

    /**
     * Import attendance records from Excel file.
     * Validates file type and size before processing.
     */
    @Transactional
    @Audited(action = AuditAction.IMPORT, entityType = "ATTENDANCE_RECORD", description = "Bulk attendance import")
    public BulkAttendanceImportResponse importFromExcel(MultipartFile file) throws IOException {
        UUID tenantId = TenantContext.getCurrentTenant();
        String importBatchId = "imp_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

        BulkAttendanceImportResponse response = BulkAttendanceImportResponse.builder()
                .errors(new ArrayList<>())
                .successes(new ArrayList<>())
                .importBatchId(importBatchId)
                .build();

        // Validate file before processing
        if (!validateFile(file, response)) {
            response.setPartialSuccess(false);
            return response;
        }

        log.info("Starting attendance import batch {} for tenant {}", importBatchId, tenantId);

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            int totalRows = 0;
            int successCount = 0;
            int failureCount = 0;
            int skippedCount = 0;

            // Skip header row, start from row 1
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isRowEmpty(row)) {
                    skippedCount++;
                    continue;
                }

                totalRows++;

                try {
                    boolean isUpdate = processRow(row, rowIndex + 1, tenantId, response);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    log.error("Error processing row {}: {}", rowIndex + 1, e.getMessage());
                    addError(response, rowIndex + 1, null, ImportErrorCode.UNKNOWN_ERROR,
                            "Unexpected error: " + e.getMessage(), "Contact support if this persists");
                }

                // Limit to 1000 rows per import
                if (totalRows >= 1000) {
                    log.warn("Import limit reached for batch {}. Maximum 1000 rows allowed.", importBatchId);
                    addError(response, totalRows + 1, null, ImportErrorCode.ROW_LIMIT_EXCEEDED,
                            "Import stopped at row " + (totalRows + 1) + ". Maximum 1000 rows allowed per import.",
                            "Split your data into multiple files of 1000 rows or fewer");
                    break;
                }
            }

            response.setTotalRecords(totalRows);
            response.setSuccessCount(successCount);
            response.setFailureCount(failureCount);
            response.setSkippedCount(skippedCount);
            response.setPartialSuccess(successCount > 0 && failureCount > 0);

            log.info("Completed attendance import batch {}: {} success, {} failed, {} skipped",
                    importBatchId, successCount, failureCount, skippedCount);
        }

        return response;
    }

    /**
     * Validates the uploaded file before processing.
     */
    private boolean validateFile(MultipartFile file, BulkAttendanceImportResponse response) {
        // Check file size
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            addError(response, 0, null, ImportErrorCode.FILE_TOO_LARGE,
                    "File size (" + (file.getSize() / 1024 / 1024) + "MB) exceeds maximum allowed (5MB)",
                    "Reduce file size or split into multiple smaller files");
            return false;
        }

        // Check file type
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        boolean isValidType = contentType != null && VALID_CONTENT_TYPES.contains(contentType);
        boolean isValidExtension = filename != null && (filename.endsWith(".xlsx") || filename.endsWith(".xls"));

        if (!isValidType && !isValidExtension) {
            addError(response, 0, null, ImportErrorCode.INVALID_FILE_TYPE,
                    "Invalid file type: " + contentType,
                    "Upload an Excel file with .xlsx or .xls extension");
            return false;
        }

        return true;
    }

    /**
     * Process a single row from the Excel file.
     * @return true if this was an update to an existing record, false if new record
     */
    private boolean processRow(Row row, int rowNumber, UUID tenantId, BulkAttendanceImportResponse response) {
        // Get employee code (required)
        String employeeCode = getCellValueAsString(row.getCell(0));
        if (employeeCode == null || employeeCode.trim().isEmpty()) {
            addError(response, rowNumber, employeeCode, ImportErrorCode.MISSING_EMPLOYEE_CODE,
                    "Employee code is required in column A",
                    "Enter the employee code (e.g., EMP001) in the first column");
            throw new IllegalArgumentException("Missing employee code");
        }
        employeeCode = employeeCode.trim();

        // Get date (required)
        String dateStr = getCellValueAsString(row.getCell(1));
        if (dateStr == null || dateStr.trim().isEmpty()) {
            addError(response, rowNumber, employeeCode, ImportErrorCode.MISSING_DATE,
                    "Date is required in column B",
                    "Enter the attendance date in YYYY-MM-DD format (e.g., 2024-03-15)");
            throw new IllegalArgumentException("Missing date");
        }

        LocalDate attendanceDate;
        try {
            attendanceDate = LocalDate.parse(dateStr.trim(), DATE_FORMATTER);
        } catch (DateTimeParseException e) {
            addError(response, rowNumber, employeeCode, ImportErrorCode.INVALID_DATE_FORMAT,
                    "Invalid date format: '" + dateStr + "'",
                    "Use format YYYY-MM-DD (e.g., 2024-03-15). Current value: " + dateStr);
            throw new IllegalArgumentException("Invalid date format");
        }

        // Find employee
        Optional<Employee> employeeOpt = employeeRepository.findByEmployeeCodeAndTenantId(employeeCode, tenantId);
        if (employeeOpt.isEmpty()) {
            addError(response, rowNumber, employeeCode, ImportErrorCode.EMPLOYEE_NOT_FOUND,
                    "Employee not found with code: " + employeeCode,
                    "Verify the employee code is correct and the employee exists in the system");
            throw new IllegalArgumentException("Employee not found");
        }
        Employee employee = employeeOpt.get();

        // Get check-in time (optional)
        LocalDateTime checkInTime = null;
        String checkInStr = getCellValueAsString(row.getCell(2));
        if (checkInStr != null && !checkInStr.trim().isEmpty()) {
            try {
                LocalTime time = LocalTime.parse(checkInStr.trim(), TIME_FORMATTER);
                checkInTime = LocalDateTime.of(attendanceDate, time);
            } catch (DateTimeParseException e) {
                addError(response, rowNumber, employeeCode, ImportErrorCode.INVALID_TIME_FORMAT,
                        "Invalid check-in time format: '" + checkInStr + "'",
                        "Use 24-hour format HH:MM (e.g., 09:00 or 14:30)");
                throw new IllegalArgumentException("Invalid check-in time format");
            }
        }

        // Get check-out time (optional)
        LocalDateTime checkOutTime = null;
        String checkOutStr = getCellValueAsString(row.getCell(3));
        if (checkOutStr != null && !checkOutStr.trim().isEmpty()) {
            try {
                LocalTime time = LocalTime.parse(checkOutStr.trim(), TIME_FORMATTER);
                checkOutTime = LocalDateTime.of(attendanceDate, time);
            } catch (DateTimeParseException e) {
                addError(response, rowNumber, employeeCode, ImportErrorCode.INVALID_TIME_FORMAT,
                        "Invalid check-out time format: '" + checkOutStr + "'",
                        "Use 24-hour format HH:MM (e.g., 18:00 or 17:30)");
                throw new IllegalArgumentException("Invalid check-out time format");
            }
        }

        // Get status (optional, defaults to PRESENT if check-in time is provided)
        String statusStr = getCellValueAsString(row.getCell(4));
        AttendanceRecord.AttendanceStatus status;
        if (statusStr != null && !statusStr.trim().isEmpty()) {
            try {
                status = AttendanceRecord.AttendanceStatus.valueOf(statusStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                addError(response, rowNumber, employeeCode, ImportErrorCode.INVALID_STATUS,
                        "Invalid status: '" + statusStr + "'",
                        "Valid values: PRESENT, ABSENT, HALF_DAY, ON_LEAVE, WEEKLY_OFF, HOLIDAY");
                throw new IllegalArgumentException("Invalid status");
            }
        } else {
            status = checkInTime != null ? AttendanceRecord.AttendanceStatus.PRESENT : AttendanceRecord.AttendanceStatus.ABSENT;
        }

        // Get remarks (optional)
        String remarks = getCellValueAsString(row.getCell(5));

        // Check if record already exists
        Optional<AttendanceRecord> existingRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employee.getId(), attendanceDate, tenantId);

        AttendanceRecord record;
        boolean isUpdate = existingRecord.isPresent();

        if (isUpdate) {
            // Update existing record
            record = existingRecord.get();
            record.setCheckInTime(checkInTime);
            record.setCheckOutTime(checkOutTime);
            record.setStatus(status);
            record.setCheckInSource(checkInTime != null ? "EXCEL_IMPORT" : null);
            record.setCheckOutSource(checkOutTime != null ? "EXCEL_IMPORT" : null);
            if (remarks != null) {
                record.setRegularizationReason(remarks);
            }
        } else {
            // Create new record
            record = AttendanceRecord.builder()
                    .employeeId(employee.getId())
                    .attendanceDate(attendanceDate)
                    .checkInTime(checkInTime)
                    .checkOutTime(checkOutTime)
                    .status(status)
                    .checkInSource(checkInTime != null ? "EXCEL_IMPORT" : null)
                    .checkOutSource(checkOutTime != null ? "EXCEL_IMPORT" : null)
                    .regularizationReason(remarks)
                    .build();
            record.setTenantId(tenantId);
        }

        // Calculate work duration if both times are present
        if (checkInTime != null && checkOutTime != null) {
            long minutes = java.time.Duration.between(checkInTime, checkOutTime).toMinutes();
            record.setWorkDurationMinutes((int) minutes);
        }

        attendanceRecordRepository.save(record);

        response.getSuccesses().add(BulkAttendanceImportResponse.ImportSuccess.builder()
                .rowNumber(rowNumber)
                .employeeCode(employeeCode)
                .attendanceDate(attendanceDate.toString())
                .status(status.name())
                .updated(isUpdate)
                .build());

        return isUpdate;
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int i = 0; i < 6; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    // Handle date cells
                    LocalDateTime dateTime = cell.getLocalDateTimeCellValue();
                    if (dateTime != null) {
                        // Check if it's just a time (date component is 1899-12-31)
                        if (dateTime.getYear() < 1900) {
                            return dateTime.toLocalTime().format(TIME_FORMATTER);
                        }
                        return dateTime.toLocalDate().format(DATE_FORMATTER);
                    }
                }
                // Handle numeric values
                double numValue = cell.getNumericCellValue();
                if (numValue == Math.floor(numValue)) {
                    return String.valueOf((long) numValue);
                }
                return String.valueOf(numValue);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception ex) {
                        return null;
                    }
                }
            case BLANK:
            default:
                return null;
        }
    }

    private void addError(BulkAttendanceImportResponse response, int rowNumber, String employeeCode,
                          ImportErrorCode errorCode, String message, String suggestion) {
        response.getErrors().add(BulkAttendanceImportResponse.ImportError.builder()
                .rowNumber(rowNumber)
                .employeeCode(employeeCode)
                .errorCode(errorCode)
                .errorMessage(message)
                .suggestion(suggestion)
                .build());
    }
}
