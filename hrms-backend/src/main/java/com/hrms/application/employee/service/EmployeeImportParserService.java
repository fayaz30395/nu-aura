package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.EmployeeImportRow;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

/**
 * Service to parse CSV and Excel files for employee bulk import.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportParserService {

    private final CustomFieldDefinitionRepository customFieldDefinitionRepository;

    private static final String[] REQUIRED_HEADERS = {
            "employeeCode", "firstName", "lastName", "workEmail",
            "joiningDate", "designation", "employmentType"
    };

    private static final Map<String, String> HEADER_ALIASES = new HashMap<>() {{
        // Allow common variations of header names
        put("employee_code", "employeeCode");
        put("employee code", "employeeCode");
        put("emp_code", "employeeCode");
        put("emp code", "employeeCode");
        put("first_name", "firstName");
        put("first name", "firstName");
        put("last_name", "lastName");
        put("last name", "lastName");
        put("middle_name", "middleName");
        put("middle name", "middleName");
        put("work_email", "workEmail");
        put("work email", "workEmail");
        put("email", "workEmail");
        put("personal_email", "personalEmail");
        put("personal email", "personalEmail");
        put("phone_number", "phoneNumber");
        put("phone number", "phoneNumber");
        put("phone", "phoneNumber");
        put("mobile", "phoneNumber");
        put("emergency_contact", "emergencyContactNumber");
        put("emergency contact", "emergencyContactNumber");
        put("date_of_birth", "dateOfBirth");
        put("date of birth", "dateOfBirth");
        put("dob", "dateOfBirth");
        put("birth_date", "dateOfBirth");
        put("joining_date", "joiningDate");
        put("joining date", "joiningDate");
        put("join_date", "joiningDate");
        put("start_date", "joiningDate");
        put("confirmation_date", "confirmationDate");
        put("confirmation date", "confirmationDate");
        put("department_code", "departmentCode");
        put("department code", "departmentCode");
        put("department", "departmentCode");
        put("dept_code", "departmentCode");
        put("manager_code", "managerEmployeeCode");
        put("manager code", "managerEmployeeCode");
        put("manager_employee_code", "managerEmployeeCode");
        put("manager", "managerEmployeeCode");
        put("reports_to", "managerEmployeeCode");
        put("employment_type", "employmentType");
        put("employment type", "employmentType");
        put("emp_type", "employmentType");
        put("type", "employmentType");
        put("bank_account", "bankAccountNumber");
        put("bank account", "bankAccountNumber");
        put("account_number", "bankAccountNumber");
        put("bank_name", "bankName");
        put("bank name", "bankName");
        put("ifsc_code", "bankIfscCode");
        put("ifsc code", "bankIfscCode");
        put("ifsc", "bankIfscCode");
        put("tax_id", "taxId");
        put("tax id", "taxId");
        put("pan", "taxId");
        put("pan_number", "taxId");
        put("postal_code", "postalCode");
        put("postal code", "postalCode");
        put("zip", "postalCode");
        put("zip_code", "postalCode");
        put("pincode", "postalCode");
    }};

    /**
     * Parse a CSV or Excel file and return list of import rows.
     */
    public List<EmployeeImportRow> parseFile(MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new BusinessException("File name is required");
        }

        String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();

        // Load custom field definitions for EMPLOYEE entity type
        Set<String> customFieldCodes = getActiveCustomFieldCodes();

        try {
            return switch (extension) {
                case "csv" -> parseCsv(file, customFieldCodes);
                case "xlsx" -> parseExcel(file, customFieldCodes);
                case "xls" -> throw new BusinessException("Old Excel format (.xls) is not supported. Please use .xlsx format.");
                default -> throw new BusinessException("Unsupported file format: " + extension + ". Please use CSV or XLSX.");
            };
        } catch (IOException e) {
            log.error("Error parsing import file: {}", e.getMessage(), e);
            throw new BusinessException("Failed to parse file: " + e.getMessage());
        }
    }

    /**
     * Get active custom field codes for EMPLOYEE entity type
     */
    private Set<String> getActiveCustomFieldCodes() {
        try {
            UUID tenantId = TenantContext.getCurrentTenant();
            List<CustomFieldDefinition> definitions = customFieldDefinitionRepository
                    .findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                            CustomFieldDefinition.EntityType.EMPLOYEE, tenantId);
            Set<String> codes = new HashSet<>();
            for (CustomFieldDefinition def : definitions) {
                codes.add(def.getFieldCode().toLowerCase());
            }
            log.debug("Found {} active custom fields for EMPLOYEE import", codes.size());
            return codes;
        } catch (Exception e) {
            log.warn("Could not load custom field definitions: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    /**
     * Get active custom field definitions for EMPLOYEE entity type
     */
    public List<CustomFieldDefinition> getActiveCustomFieldDefinitions() {
        try {
            UUID tenantId = TenantContext.getCurrentTenant();
            return customFieldDefinitionRepository
                    .findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                            CustomFieldDefinition.EntityType.EMPLOYEE, tenantId);
        } catch (Exception e) {
            log.warn("Could not load custom field definitions: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Parse CSV file.
     */
    private List<EmployeeImportRow> parseCsv(MultipartFile file, Set<String> customFieldCodes) throws IOException {
        List<EmployeeImportRow> rows = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null || headerLine.isBlank()) {
                throw new BusinessException("CSV file is empty or has no header row");
            }

            String[] headers = parseCsvLine(headerLine);
            Map<Integer, String> columnMapping = mapHeaders(headers, customFieldCodes);
            validateRequiredHeaders(columnMapping);

            String line;
            int rowNumber = 1;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.isBlank()) continue;

                String[] values = parseCsvLine(line);
                EmployeeImportRow row = mapToImportRow(columnMapping, values, rowNumber, customFieldCodes);
                rows.add(row);
            }
        }

        if (rows.isEmpty()) {
            throw new BusinessException("No data rows found in CSV file");
        }

        log.info("Parsed {} rows from CSV file", rows.size());
        return rows;
    }

    /**
     * Parse Excel file.
     */
    private List<EmployeeImportRow> parseExcel(MultipartFile file, Set<String> customFieldCodes) throws IOException {
        List<EmployeeImportRow> rows = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BusinessException("Excel file has no sheets");
            }

            Iterator<Row> rowIterator = sheet.iterator();
            if (!rowIterator.hasNext()) {
                throw new BusinessException("Excel file is empty");
            }

            // Parse header row
            Row headerRow = rowIterator.next();
            Map<Integer, String> columnMapping = mapExcelHeaders(headerRow, customFieldCodes);
            validateRequiredHeaders(columnMapping);

            // Parse data rows
            int rowNumber = 1;
            while (rowIterator.hasNext()) {
                rowNumber++;
                Row excelRow = rowIterator.next();

                if (isEmptyRow(excelRow)) continue;

                String[] values = extractRowValues(excelRow, columnMapping.size());
                EmployeeImportRow row = mapToImportRow(columnMapping, values, rowNumber, customFieldCodes);
                rows.add(row);
            }
        }

        if (rows.isEmpty()) {
            throw new BusinessException("No data rows found in Excel file");
        }

        log.info("Parsed {} rows from Excel file", rows.size());
        return rows;
    }

    /**
     * Simple CSV line parser (handles quoted fields).
     */
    private String[] parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString().trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString().trim());

        return result.toArray(new String[0]);
    }

    /**
     * Map CSV headers to standardized field names.
     */
    private Map<Integer, String> mapHeaders(String[] headers, Set<String> customFieldCodes) {
        Map<Integer, String> mapping = new HashMap<>();

        for (int i = 0; i < headers.length; i++) {
            String header = headers[i].trim().toLowerCase();
            // Check if it's a known alias
            String standardName = HEADER_ALIASES.getOrDefault(header, header);
            // Convert to camelCase if needed
            standardName = toCamelCase(standardName);

            // Check if this is a custom field (prefix with "cf:" to distinguish)
            if (customFieldCodes.contains(header) || customFieldCodes.contains(standardName.toLowerCase())) {
                String customFieldCode = customFieldCodes.contains(header) ? header : standardName.toLowerCase();
                standardName = "cf:" + customFieldCode;
            }

            mapping.put(i, standardName);
        }

        return mapping;
    }

    /**
     * Map Excel headers to standardized field names.
     */
    private Map<Integer, String> mapExcelHeaders(Row headerRow, Set<String> customFieldCodes) {
        Map<Integer, String> mapping = new HashMap<>();

        for (Cell cell : headerRow) {
            String header = getCellValueAsString(cell).trim().toLowerCase();
            if (!header.isBlank()) {
                String standardName = HEADER_ALIASES.getOrDefault(header, header);
                standardName = toCamelCase(standardName);

                // Check if this is a custom field (prefix with "cf:" to distinguish)
                if (customFieldCodes.contains(header) || customFieldCodes.contains(standardName.toLowerCase())) {
                    String customFieldCode = customFieldCodes.contains(header) ? header : standardName.toLowerCase();
                    standardName = "cf:" + customFieldCode;
                }

                mapping.put(cell.getColumnIndex(), standardName);
            }
        }

        return mapping;
    }

    /**
     * Validate that all required headers are present.
     */
    private void validateRequiredHeaders(Map<Integer, String> columnMapping) {
        // Convert to lowercase for case-insensitive comparison
        Set<String> presentHeaders = new HashSet<>();
        for (String header : columnMapping.values()) {
            presentHeaders.add(header.toLowerCase());
        }

        List<String> missingHeaders = new ArrayList<>();

        for (String required : REQUIRED_HEADERS) {
            if (!presentHeaders.contains(required.toLowerCase())) {
                missingHeaders.add(required);
            }
        }

        if (!missingHeaders.isEmpty()) {
            throw new BusinessException("Missing required columns: " + String.join(", ", missingHeaders));
        }
    }

    /**
     * Map array of values to EmployeeImportRow.
     */
    private EmployeeImportRow mapToImportRow(Map<Integer, String> columnMapping, String[] values, int rowNumber, Set<String> customFieldCodes) {
        EmployeeImportRow row = new EmployeeImportRow();
        row.setRowNumber(rowNumber);

        for (Map.Entry<Integer, String> entry : columnMapping.entrySet()) {
            int index = entry.getKey();
            String field = entry.getValue();
            String value = index < values.length ? values[index].trim() : "";

            setFieldValue(row, field, value);
        }

        return row;
    }

    /**
     * Set field value on EmployeeImportRow using reflection-like approach.
     */
    private void setFieldValue(EmployeeImportRow row, String field, String value) {
        if (value == null || value.isBlank()) return;

        // Check if this is a custom field (prefixed with "cf:")
        if (field.startsWith("cf:")) {
            String customFieldCode = field.substring(3);
            row.addCustomFieldValue(customFieldCode, value);
            return;
        }

        // Use lowercase for case-insensitive matching
        switch (field.toLowerCase()) {
            case "employeecode" -> row.setEmployeeCode(value);
            case "firstname" -> row.setFirstName(value);
            case "middlename" -> row.setMiddleName(value);
            case "lastname" -> row.setLastName(value);
            case "workemail" -> row.setWorkEmail(value);
            case "personalemail" -> row.setPersonalEmail(value);
            case "phonenumber" -> row.setPhoneNumber(value);
            case "emergencycontactnumber" -> row.setEmergencyContactNumber(value);
            case "dateofbirth" -> row.setDateOfBirth(value);
            case "gender" -> row.setGender(value);
            case "address" -> row.setAddress(value);
            case "city" -> row.setCity(value);
            case "state" -> row.setState(value);
            case "postalcode" -> row.setPostalCode(value);
            case "country" -> row.setCountry(value);
            case "joiningdate" -> row.setJoiningDate(value);
            case "confirmationdate" -> row.setConfirmationDate(value);
            case "departmentcode" -> row.setDepartmentCode(value);
            case "manageremployeecode" -> row.setManagerEmployeeCode(value);
            case "designation" -> row.setDesignation(value);
            case "employmenttype" -> row.setEmploymentType(value);
            case "bankaccountnumber" -> row.setBankAccountNumber(value);
            case "bankname" -> row.setBankName(value);
            case "bankifsccode" -> row.setBankIfscCode(value);
            case "taxid" -> row.setTaxId(value);
            default -> log.debug("Unknown field in import: {}", field);
        }
    }

    /**
     * Extract row values from Excel row.
     */
    private String[] extractRowValues(Row row, int maxColumns) {
        String[] values = new String[maxColumns];
        for (int i = 0; i < maxColumns; i++) {
            Cell cell = row.getCell(i);
            values[i] = cell != null ? getCellValueAsString(cell) : "";
        }
        return values;
    }

    /**
     * Get cell value as string regardless of cell type.
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                // Avoid scientific notation for numbers
                double value = cell.getNumericCellValue();
                if (value == Math.floor(value)) {
                    yield String.valueOf((long) value);
                }
                yield String.valueOf(value);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    /**
     * Check if Excel row is empty.
     */
    private boolean isEmptyRow(Row row) {
        if (row == null) return true;
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (!value.isBlank()) return false;
            }
        }
        return true;
    }

    /**
     * Convert string to camelCase.
     */
    private String toCamelCase(String input) {
        if (input == null || input.isBlank()) return input;
        if (!input.contains("_") && !input.contains(" ")) return input;

        StringBuilder result = new StringBuilder();
        boolean capitalizeNext = false;

        for (char c : input.toCharArray()) {
            if (c == '_' || c == ' ') {
                capitalizeNext = true;
            } else if (capitalizeNext) {
                result.append(Character.toUpperCase(c));
                capitalizeNext = false;
            } else {
                result.append(Character.toLowerCase(c));
            }
        }

        return result.toString();
    }

    /**
     * Generate a sample CSV template.
     */
    public byte[] generateCsvTemplate() {
        StringBuilder sb = new StringBuilder();

        // Header row - standard fields
        sb.append("employeeCode,firstName,middleName,lastName,workEmail,personalEmail,");
        sb.append("phoneNumber,dateOfBirth,gender,joiningDate,designation,employmentType,");
        sb.append("departmentCode,managerEmployeeCode,address,city,state,postalCode,country,");
        sb.append("bankAccountNumber,bankName,bankIfscCode,taxId");

        // Add custom field headers
        List<CustomFieldDefinition> customFields = getActiveCustomFieldDefinitions();
        for (CustomFieldDefinition cf : customFields) {
            sb.append(",").append(cf.getFieldCode());
        }
        sb.append("\n");

        // Sample row - standard fields
        sb.append("EMP001,John,,Doe,john.doe@company.com,john.personal@gmail.com,");
        sb.append("9876543210,1990-05-15,MALE,2024-01-15,Software Engineer,FULL_TIME,");
        sb.append("ENGINEERING,MGR001,123 Main Street,Bangalore,Karnataka,560001,India,");
        sb.append("1234567890,HDFC Bank,HDFC0001234,ABCDE1234F");

        // Add custom field sample values (empty)
        for (int i = 0; i < customFields.size(); i++) {
            sb.append(",");
        }
        sb.append("\n");

        return sb.toString().getBytes();
    }

    /**
     * Generate a sample Excel template.
     */
    public byte[] generateExcelTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Employee Import");

            // Create header style for required fields
            CellStyle requiredHeaderStyle = workbook.createCellStyle();
            Font requiredHeaderFont = workbook.createFont();
            requiredHeaderFont.setBold(true);
            requiredHeaderStyle.setFont(requiredHeaderFont);
            requiredHeaderStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            requiredHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Create header style for custom fields
            CellStyle customFieldHeaderStyle = workbook.createCellStyle();
            Font customFieldFont = workbook.createFont();
            customFieldFont.setBold(true);
            customFieldHeaderStyle.setFont(customFieldFont);
            customFieldHeaderStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            customFieldHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Standard headers
            List<String> headersList = new ArrayList<>(List.of(
                    "employeeCode*", "firstName*", "middleName", "lastName*", "workEmail*",
                    "personalEmail", "phoneNumber", "dateOfBirth", "gender",
                    "joiningDate*", "designation*", "employmentType*", "departmentCode",
                    "managerEmployeeCode", "address", "city", "state", "postalCode",
                    "country", "bankAccountNumber", "bankName", "bankIfscCode", "taxId"
            ));
            int standardHeaderCount = headersList.size();

            // Add custom field headers
            List<CustomFieldDefinition> customFields = getActiveCustomFieldDefinitions();
            List<String> customFieldInstructions = new ArrayList<>();
            for (CustomFieldDefinition cf : customFields) {
                String header = cf.getFieldCode();
                if (cf.getIsRequired()) {
                    header += "*";
                }
                headersList.add(header);
                customFieldInstructions.add("  - " + cf.getFieldCode() + ": " + cf.getFieldName() +
                        (cf.getDescription() != null ? " (" + cf.getDescription() + ")" : "") +
                        " [" + cf.getFieldType() + "]");
            }

            // Header row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headersList.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headersList.get(i));
                cell.setCellStyle(i < standardHeaderCount ? requiredHeaderStyle : customFieldHeaderStyle);
                sheet.setColumnWidth(i, 4000);
            }

            // Sample data row
            Row dataRow = sheet.createRow(1);
            String[] sampleData = {
                    "EMP001", "John", "", "Doe", "john.doe@company.com",
                    "john.personal@gmail.com", "9876543210", "1990-05-15", "MALE",
                    "2024-01-15", "Software Engineer", "FULL_TIME", "ENGINEERING",
                    "MGR001", "123 Main Street", "Bangalore", "Karnataka", "560001",
                    "India", "1234567890", "HDFC Bank", "HDFC0001234", "ABCDE1234F"
            };

            for (int i = 0; i < sampleData.length; i++) {
                dataRow.createCell(i).setCellValue(sampleData[i]);
            }

            // Instructions sheet
            Sheet instructionsSheet = workbook.createSheet("Instructions");
            List<String> instructions = new ArrayList<>(List.of(
                    "Employee Import Template Instructions:",
                    "",
                    "Required Fields (marked with *):",
                    "  - employeeCode: Unique employee identifier",
                    "  - firstName: Employee's first name",
                    "  - lastName: Employee's last name",
                    "  - workEmail: Official work email address",
                    "  - joiningDate: Date of joining (format: YYYY-MM-DD)",
                    "  - designation: Job title/designation",
                    "  - employmentType: FULL_TIME, PART_TIME, CONTRACT, or INTERN",
                    "",
                    "Optional Fields:",
                    "  - dateOfBirth: Format YYYY-MM-DD",
                    "  - gender: MALE, FEMALE, or OTHER",
                    "  - departmentCode: Must match existing department code",
                    "  - managerEmployeeCode: Must match existing employee code"
            ));

            // Add custom fields section if any exist
            if (!customFieldInstructions.isEmpty()) {
                instructions.add("");
                instructions.add("Custom Fields (highlighted in green):");
                instructions.addAll(customFieldInstructions);
            }

            instructions.addAll(List.of(
                    "",
                    "Notes:",
                    "  - First row must contain column headers",
                    "  - Date format: YYYY-MM-DD (e.g., 2024-01-15)",
                    "  - Do not modify column names",
                    "  - Delete this sample row before importing"
            ));

            for (int i = 0; i < instructions.size(); i++) {
                instructionsSheet.createRow(i).createCell(0).setCellValue(instructions.get(i));
            }
            instructionsSheet.setColumnWidth(0, 15000);

            java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
}
