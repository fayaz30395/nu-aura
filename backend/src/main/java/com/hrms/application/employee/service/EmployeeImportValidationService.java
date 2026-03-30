package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.EmployeeImportRow;
import com.hrms.api.employee.dto.EmployeeImportPreview;
import com.hrms.api.employee.dto.ImportValidationError;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service to validate employee import data before processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportValidationService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final CustomFieldDefinitionRepository customFieldDefinitionRepository;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"
    );

    private static final Set<String> VALID_EMPLOYMENT_TYPES = Set.of(
            "FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"
    );

    private static final Set<String> VALID_GENDERS = Set.of(
            "MALE", "FEMALE", "OTHER"
    );

    /**
     * Validate all import rows and return a preview with validation results.
     */
    public EmployeeImportPreview validateAndPreview(List<EmployeeImportRow> rows) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<ImportValidationError> errors = new ArrayList<>();
        List<EmployeeImportPreview.EmployeeImportRowPreview> rowPreviews = new ArrayList<>();

        // Track duplicates within the file
        Set<String> employeeCodes = new HashSet<>();
        Set<String> workEmails = new HashSet<>();

        // Pre-fetch existing data for validation
        Set<String> existingEmployeeCodes = getExistingEmployeeCodes(tenantId);
        Set<String> existingWorkEmails = getExistingWorkEmails(tenantId);
        Map<String, UUID> departmentCodeToId = getDepartmentCodeToIdMap(tenantId);
        Map<String, UUID> employeeCodeToId = getEmployeeCodeToIdMap(tenantId);

        // Load custom field definitions
        Map<String, CustomFieldDefinition> customFieldDefinitions = getCustomFieldDefinitionsMap(tenantId);

        int validCount = 0;
        int invalidCount = 0;

        for (EmployeeImportRow row : rows) {
            List<ImportValidationError> rowErrors = validateRow(
                    row,
                    employeeCodes,
                    workEmails,
                    existingEmployeeCodes,
                    existingWorkEmails,
                    departmentCodeToId,
                    employeeCodeToId,
                    customFieldDefinitions
            );

            boolean isValid = rowErrors.isEmpty();
            if (isValid) {
                validCount++;
                // Track for duplicate detection within file
                employeeCodes.add(row.getEmployeeCode().toUpperCase());
                workEmails.add(row.getWorkEmail().toLowerCase());
            } else {
                invalidCount++;
                errors.addAll(rowErrors);
            }

            // Create row preview
            String fullName = buildFullName(row.getFirstName(), row.getMiddleName(), row.getLastName());
            String departmentName = row.getDepartmentCode() != null
                    ? getDepartmentName(row.getDepartmentCode(), departmentCodeToId, tenantId)
                    : null;

            EmployeeImportPreview.EmployeeImportRowPreview preview =
                    EmployeeImportPreview.EmployeeImportRowPreview.builder()
                            .rowNumber(row.getRowNumber())
                            .employeeCode(row.getEmployeeCode())
                            .fullName(fullName)
                            .workEmail(row.getWorkEmail())
                            .designation(row.getDesignation())
                            .departmentName(departmentName)
                            .joiningDate(row.getJoiningDate())
                            .employmentType(row.getEmploymentType())
                            .isValid(isValid)
                            .rowErrors(rowErrors.stream()
                                    .map(ImportValidationError::getMessage)
                                    .collect(Collectors.toList()))
                            .build();

            rowPreviews.add(preview);
        }

        return EmployeeImportPreview.builder()
                .totalRows(rows.size())
                .validRows(validCount)
                .invalidRows(invalidCount)
                .hasErrors(!errors.isEmpty())
                .rows(rowPreviews)
                .errors(errors)
                .build();
    }

    /**
     * Validate a single row.
     */
    private List<ImportValidationError> validateRow(
            EmployeeImportRow row,
            Set<String> seenEmployeeCodes,
            Set<String> seenWorkEmails,
            Set<String> existingEmployeeCodes,
            Set<String> existingWorkEmails,
            Map<String, UUID> departmentCodeToId,
            Map<String, UUID> employeeCodeToId,
            Map<String, CustomFieldDefinition> customFieldDefinitions
    ) {
        List<ImportValidationError> errors = new ArrayList<>();
        int rowNum = row.getRowNumber();

        // Required field validations
        if (isBlank(row.getEmployeeCode())) {
            errors.add(ImportValidationError.required(rowNum, "employeeCode"));
        }
        if (isBlank(row.getFirstName())) {
            errors.add(ImportValidationError.required(rowNum, "firstName"));
        }
        if (isBlank(row.getLastName())) {
            errors.add(ImportValidationError.required(rowNum, "lastName"));
        }
        if (isBlank(row.getWorkEmail())) {
            errors.add(ImportValidationError.required(rowNum, "workEmail"));
        }
        if (isBlank(row.getJoiningDate())) {
            errors.add(ImportValidationError.required(rowNum, "joiningDate"));
        }
        if (isBlank(row.getDesignation())) {
            errors.add(ImportValidationError.required(rowNum, "designation"));
        }
        if (isBlank(row.getEmploymentType())) {
            errors.add(ImportValidationError.required(rowNum, "employmentType"));
        }

        // Stop further validation if required fields are missing
        if (!errors.isEmpty()) {
            return errors;
        }

        // Email format validation
        if (!isValidEmail(row.getWorkEmail())) {
            errors.add(ImportValidationError.invalidFormat(rowNum, "workEmail", row.getWorkEmail(), "valid email address"));
        }
        if (!isBlank(row.getPersonalEmail()) && !isValidEmail(row.getPersonalEmail())) {
            errors.add(ImportValidationError.invalidFormat(rowNum, "personalEmail", row.getPersonalEmail(), "valid email address"));
        }

        // Date format validations
        if (!isValidDate(row.getJoiningDate())) {
            errors.add(ImportValidationError.invalidFormat(rowNum, "joiningDate", row.getJoiningDate(), "YYYY-MM-DD"));
        }
        if (!isBlank(row.getDateOfBirth()) && !isValidDate(row.getDateOfBirth())) {
            errors.add(ImportValidationError.invalidFormat(rowNum, "dateOfBirth", row.getDateOfBirth(), "YYYY-MM-DD"));
        }
        if (!isBlank(row.getConfirmationDate()) && !isValidDate(row.getConfirmationDate())) {
            errors.add(ImportValidationError.invalidFormat(rowNum, "confirmationDate", row.getConfirmationDate(), "YYYY-MM-DD"));
        }

        // Enum validations
        if (!VALID_EMPLOYMENT_TYPES.contains(row.getEmploymentType().toUpperCase())) {
            errors.add(ImportValidationError.invalidValue(rowNum, "employmentType", row.getEmploymentType(),
                    String.join(", ", VALID_EMPLOYMENT_TYPES)));
        }
        if (!isBlank(row.getGender()) && !VALID_GENDERS.contains(row.getGender().toUpperCase())) {
            errors.add(ImportValidationError.invalidValue(rowNum, "gender", row.getGender(),
                    String.join(", ", VALID_GENDERS)));
        }

        // Duplicate in file detection
        String empCodeUpper = row.getEmployeeCode().toUpperCase();
        String emailLower = row.getWorkEmail().toLowerCase();

        if (seenEmployeeCodes.contains(empCodeUpper)) {
            errors.add(ImportValidationError.duplicateInFile(rowNum, "employeeCode", row.getEmployeeCode()));
        }
        if (seenWorkEmails.contains(emailLower)) {
            errors.add(ImportValidationError.duplicateInFile(rowNum, "workEmail", row.getWorkEmail()));
        }

        // Duplicate in database detection
        if (existingEmployeeCodes.contains(empCodeUpper)) {
            errors.add(ImportValidationError.duplicateInDatabase(rowNum, "employeeCode", row.getEmployeeCode()));
        }
        if (existingWorkEmails.contains(emailLower)) {
            errors.add(ImportValidationError.duplicateInDatabase(rowNum, "workEmail", row.getWorkEmail()));
        }

        // Reference validations
        if (!isBlank(row.getDepartmentCode())) {
            if (!departmentCodeToId.containsKey(row.getDepartmentCode().toUpperCase())) {
                errors.add(ImportValidationError.referenceNotFound(rowNum, "departmentCode",
                        row.getDepartmentCode(), "Department"));
            }
        }
        if (!isBlank(row.getManagerEmployeeCode())) {
            if (!employeeCodeToId.containsKey(row.getManagerEmployeeCode().toUpperCase())) {
                errors.add(ImportValidationError.referenceNotFound(rowNum, "managerEmployeeCode",
                        row.getManagerEmployeeCode(), "Manager"));
            }
        }

        // Business rule validations
        if (isValidDate(row.getJoiningDate())) {
            LocalDate joiningDate = LocalDate.parse(row.getJoiningDate());
            if (joiningDate.isAfter(LocalDate.now().plusYears(1))) {
                errors.add(ImportValidationError.builder()
                        .rowNumber(rowNum)
                        .field("joiningDate")
                        .value(row.getJoiningDate())
                        .message("Joining date cannot be more than 1 year in the future")
                        .errorType(ImportValidationError.ErrorType.BUSINESS_RULE_VIOLATION)
                        .build());
            }
        }

        if (!isBlank(row.getDateOfBirth()) && isValidDate(row.getDateOfBirth())) {
            LocalDate dob = LocalDate.parse(row.getDateOfBirth());
            int age = java.time.Period.between(dob, LocalDate.now()).getYears();
            if (age < 18) {
                errors.add(ImportValidationError.builder()
                        .rowNumber(rowNum)
                        .field("dateOfBirth")
                        .value(row.getDateOfBirth())
                        .message("Employee must be at least 18 years old")
                        .errorType(ImportValidationError.ErrorType.BUSINESS_RULE_VIOLATION)
                        .build());
            }
        }

        // Custom field validations
        errors.addAll(validateCustomFields(row, rowNum, customFieldDefinitions));

        return errors;
    }

    /**
     * Validate custom field values against their definitions.
     */
    private List<ImportValidationError> validateCustomFields(
            EmployeeImportRow row,
            int rowNum,
            Map<String, CustomFieldDefinition> customFieldDefinitions
    ) {
        List<ImportValidationError> errors = new ArrayList<>();
        Map<String, String> customFieldValues = row.getCustomFieldValues();

        // Check required custom fields
        for (CustomFieldDefinition def : customFieldDefinitions.values()) {
            String fieldCode = def.getFieldCode().toLowerCase();
            String value = customFieldValues.get(fieldCode);

            // Required field check
            if (def.getIsRequired() && isBlank(value)) {
                errors.add(ImportValidationError.required(rowNum, def.getFieldCode()));
                continue;
            }

            // Skip further validation if value is blank and not required
            if (isBlank(value)) {
                continue;
            }

            // Type-specific validations
            errors.addAll(validateCustomFieldValue(rowNum, def, value));
        }

        return errors;
    }

    /**
     * Validate a single custom field value based on its type and constraints.
     */
    private List<ImportValidationError> validateCustomFieldValue(
            int rowNum,
            CustomFieldDefinition def,
            String value
    ) {
        List<ImportValidationError> errors = new ArrayList<>();
        String fieldCode = def.getFieldCode();

        switch (def.getFieldType()) {
            case NUMBER, CURRENCY, PERCENTAGE -> {
                try {
                    BigDecimal numValue = new BigDecimal(value);
                    if (def.getMinValue() != null && numValue.compareTo(BigDecimal.valueOf(def.getMinValue())) < 0) {
                        errors.add(ImportValidationError.builder()
                                .rowNumber(rowNum)
                                .field(fieldCode)
                                .value(value)
                                .message(fieldCode + " must be at least " + def.getMinValue())
                                .errorType(ImportValidationError.ErrorType.INVALID_VALUE)
                                .build());
                    }
                    if (def.getMaxValue() != null && numValue.compareTo(BigDecimal.valueOf(def.getMaxValue())) > 0) {
                        errors.add(ImportValidationError.builder()
                                .rowNumber(rowNum)
                                .field(fieldCode)
                                .value(value)
                                .message(fieldCode + " must be at most " + def.getMaxValue())
                                .errorType(ImportValidationError.ErrorType.INVALID_VALUE)
                                .build());
                    }
                } catch (NumberFormatException e) {
                    errors.add(ImportValidationError.invalidFormat(rowNum, fieldCode, value, "number"));
                }
            }
            case DATE -> {
                if (!isValidDate(value)) {
                    errors.add(ImportValidationError.invalidFormat(rowNum, fieldCode, value, "YYYY-MM-DD"));
                }
            }
            case DATETIME -> {
                try {
                    LocalDateTime.parse(value);
                } catch (DateTimeParseException e) {
                    errors.add(ImportValidationError.invalidFormat(rowNum, fieldCode, value, "YYYY-MM-DDTHH:mm:ss"));
                }
            }
            case EMAIL -> {
                if (!isValidEmail(value)) {
                    errors.add(ImportValidationError.invalidFormat(rowNum, fieldCode, value, "valid email"));
                }
            }
            case DROPDOWN -> {
                String options = def.getOptions();
                if (options != null && !options.isEmpty()) {
                    Set<String> validOptions = Arrays.stream(options.split(","))
                            .map(String::trim)
                            .map(String::toLowerCase)
                            .collect(Collectors.toSet());
                    if (!validOptions.contains(value.toLowerCase())) {
                        errors.add(ImportValidationError.invalidValue(rowNum, fieldCode, value, options));
                    }
                }
            }
            case MULTI_SELECT -> {
                String options = def.getOptions();
                if (options != null && !options.isEmpty()) {
                    Set<String> validOptions = Arrays.stream(options.split(","))
                            .map(String::trim)
                            .map(String::toLowerCase)
                            .collect(Collectors.toSet());
                    String[] selectedValues = value.split(",");
                    for (String selected : selectedValues) {
                        if (!validOptions.contains(selected.trim().toLowerCase())) {
                            errors.add(ImportValidationError.invalidValue(rowNum, fieldCode, selected.trim(), options));
                        }
                    }
                }
            }
            case CHECKBOX -> {
                String lower = value.toLowerCase();
                if (!lower.equals("true") && !lower.equals("false") &&
                    !lower.equals("yes") && !lower.equals("no") &&
                    !lower.equals("1") && !lower.equals("0")) {
                    errors.add(ImportValidationError.invalidFormat(rowNum, fieldCode, value, "true/false or yes/no"));
                }
            }
            case TEXT, TEXTAREA, PHONE, URL -> {
                // Length validations
                if (def.getMinLength() != null && value.length() < def.getMinLength()) {
                    errors.add(ImportValidationError.builder()
                            .rowNumber(rowNum)
                            .field(fieldCode)
                            .value(value)
                            .message(fieldCode + " must be at least " + def.getMinLength() + " characters")
                            .errorType(ImportValidationError.ErrorType.INVALID_VALUE)
                            .build());
                }
                if (def.getMaxLength() != null && value.length() > def.getMaxLength()) {
                    errors.add(ImportValidationError.builder()
                            .rowNumber(rowNum)
                            .field(fieldCode)
                            .value(value)
                            .message(fieldCode + " must be at most " + def.getMaxLength() + " characters")
                            .errorType(ImportValidationError.ErrorType.INVALID_VALUE)
                            .build());
                }
            }
            default -> {
                // FILE type is not supported for import
                if (def.getFieldType() == CustomFieldDefinition.FieldType.FILE) {
                    log.warn("FILE type custom field '{}' cannot be imported via CSV/Excel", fieldCode);
                }
            }
        }

        return errors;
    }

    // Helper methods

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    private boolean isValidDate(String date) {
        if (isBlank(date)) return false;
        try {
            LocalDate.parse(date);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    private String buildFullName(String firstName, String middleName, String lastName) {
        StringBuilder name = new StringBuilder();
        if (firstName != null) name.append(firstName);
        if (middleName != null && !middleName.isBlank()) name.append(" ").append(middleName);
        if (lastName != null) name.append(" ").append(lastName);
        return name.toString().trim();
    }

    private Set<String> getExistingEmployeeCodes(UUID tenantId) {
        return employeeRepository.findByTenantId(tenantId).stream()
                .map(e -> e.getEmployeeCode().toUpperCase())
                .collect(Collectors.toSet());
    }

    private Set<String> getExistingWorkEmails(UUID tenantId) {
        return employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getUser() != null)
                .map(e -> e.getUser().getEmail().toLowerCase())
                .collect(Collectors.toSet());
    }

    private Map<String, UUID> getDepartmentCodeToIdMap(UUID tenantId) {
        return departmentRepository.findByTenantId(tenantId).stream()
                .collect(Collectors.toMap(
                        d -> d.getCode().toUpperCase(),
                        Department::getId,
                        (a, b) -> a
                ));
    }

    private Map<String, UUID> getEmployeeCodeToIdMap(UUID tenantId) {
        return employeeRepository.findByTenantId(tenantId).stream()
                .collect(Collectors.toMap(
                        e -> e.getEmployeeCode().toUpperCase(),
                        Employee::getId,
                        (a, b) -> a
                ));
    }

    private String getDepartmentName(String code, Map<String, UUID> departmentCodeToId, UUID tenantId) {
        UUID deptId = departmentCodeToId.get(code.toUpperCase());
        if (deptId != null) {
            return departmentRepository.findById(deptId)
                    .map(Department::getName)
                    .orElse(null);
        }
        return null;
    }

    private Map<String, CustomFieldDefinition> getCustomFieldDefinitionsMap(UUID tenantId) {
        try {
            return customFieldDefinitionRepository
                    .findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                            CustomFieldDefinition.EntityType.EMPLOYEE, tenantId)
                    .stream()
                    .collect(Collectors.toMap(
                            def -> def.getFieldCode().toLowerCase(),
                            def -> def,
                            (a, b) -> a
                    ));
        } catch (DataAccessException e) {
            log.warn("Could not load custom field definitions: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
