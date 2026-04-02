package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.*;
import com.hrms.application.notification.service.EmailNotificationService;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.customfield.CustomFieldValue;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import com.hrms.infrastructure.customfield.repository.CustomFieldValueRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for bulk employee import operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportService {

    private final EmployeeImportParserService parserService;
    private final EmployeeImportValidationService validationService;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomFieldDefinitionRepository customFieldDefinitionRepository;
    private final CustomFieldValueRepository customFieldValueRepository;
    private final EmailNotificationService emailNotificationService;

    private static final String DEFAULT_ROLE_CODE = "EMPLOYEE";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";

    /**
     * Parse and validate an import file, returning a preview of what will be imported.
     */
    public EmployeeImportPreview previewImport(MultipartFile file) {
        log.info("Starting import preview for file: {}", file.getOriginalFilename());

        // Parse the file
        List<EmployeeImportRow> rows = parserService.parseFile(file);

        // Validate and create preview
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        log.info("Import preview completed. Total: {}, Valid: {}, Invalid: {}",
                preview.getTotalRows(), preview.getValidRows(), preview.getInvalidRows());

        return preview;
    }

    /**
     * Execute the actual import after preview/validation.
     * Only imports valid rows.
     */
    @Transactional
    public EmployeeImportResult executeImport(MultipartFile file, boolean skipInvalid) {
        log.info("Starting employee import execution for file: {}", file.getOriginalFilename());

        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        // Parse and validate
        List<EmployeeImportRow> rows = parserService.parseFile(file);
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // If there are errors and we're not skipping invalid rows, fail the import
        if (preview.isHasErrors() && !skipInvalid) {
            log.warn("Import aborted due to validation errors");
            return EmployeeImportResult.builder()
                    .importId(UUID.randomUUID())
                    .importedAt(LocalDateTime.now())
                    .importedBy(currentUserId.toString())
                    .totalProcessed(0)
                    .successCount(0)
                    .failedCount(preview.getInvalidRows())
                    .status(EmployeeImportResult.ImportStatus.FAILED)
                    .failedImports(preview.getErrors().stream()
                            .collect(Collectors.groupingBy(ImportValidationError::getRowNumber))
                            .entrySet().stream()
                            .map(entry -> EmployeeImportResult.FailedImport.builder()
                                    .rowNumber(entry.getKey())
                                    .errors(entry.getValue())
                                    .reason("Validation failed")
                                    .build())
                            .collect(Collectors.toList()))
                    .build();
        }

        // Prepare lookup maps
        Map<String, UUID> departmentCodeToId = getDepartmentCodeToIdMap(tenantId);
        Map<String, UUID> employeeCodeToId = getEmployeeCodeToIdMap(tenantId);
        Role defaultRole = getDefaultRole(tenantId);

        // Load custom field definitions for saving values
        Map<String, CustomFieldDefinition> customFieldDefinitions = getCustomFieldDefinitionsMap(tenantId);

        // Process valid rows
        List<EmployeeImportResult.ImportedEmployee> imported = new ArrayList<>();
        List<EmployeeImportResult.FailedImport> failed = new ArrayList<>();

        // Filter valid rows based on preview
        Set<Integer> validRowNumbers = preview.getRows().stream()
                .filter(EmployeeImportPreview.EmployeeImportRowPreview::isValid)
                .map(EmployeeImportPreview.EmployeeImportRowPreview::getRowNumber)
                .collect(Collectors.toSet());

        for (EmployeeImportRow row : rows) {
            if (!validRowNumbers.contains(row.getRowNumber())) {
                // Skip invalid rows when skipInvalid is true
                continue;
            }

            try {
                // Create user account
                User user = createUserForEmployee(row, tenantId, defaultRole);

                // Create employee
                Employee employee = createEmployee(row, user, tenantId, departmentCodeToId, employeeCodeToId);

                // Save custom field values
                if (row.hasCustomFieldValues()) {
                    saveCustomFieldValues(row, employee.getId(), tenantId, customFieldDefinitions);
                }

                // Add to employee code map for subsequent rows that might reference this employee as manager
                employeeCodeToId.put(row.getEmployeeCode().toUpperCase(), employee.getId());

                imported.add(EmployeeImportResult.ImportedEmployee.builder()
                        .rowNumber(row.getRowNumber())
                        .employeeId(employee.getId())
                        .employeeCode(employee.getEmployeeCode())
                        .fullName(employee.getFullName())
                        .workEmail(user.getEmail())
                        .build());

                log.debug("Successfully imported employee: {} ({})", employee.getFullName(), employee.getEmployeeCode());

            } catch (Exception e) { // Intentional broad catch — per-row error boundary: isolates one row failure from the rest of the batch
                log.error("Failed to import row {}: {}", row.getRowNumber(), e.getMessage(), e);
                failed.add(EmployeeImportResult.FailedImport.builder()
                        .rowNumber(row.getRowNumber())
                        .employeeCode(row.getEmployeeCode())
                        .reason(e.getMessage())
                        .build());
            }
        }

        // Build result
        EmployeeImportResult.ImportStatus status;
        if (failed.isEmpty()) {
            status = EmployeeImportResult.ImportStatus.COMPLETED;
        } else if (imported.isEmpty()) {
            status = EmployeeImportResult.ImportStatus.FAILED;
        } else {
            status = EmployeeImportResult.ImportStatus.PARTIAL_SUCCESS;
        }

        EmployeeImportResult result = EmployeeImportResult.builder()
                .importId(UUID.randomUUID())
                .importedAt(LocalDateTime.now())
                .importedBy(currentUserId.toString())
                .totalProcessed(imported.size() + failed.size())
                .successCount(imported.size())
                .failedCount(failed.size())
                .skippedCount(preview.getInvalidRows())
                .status(status)
                .importedEmployees(imported)
                .failedImports(failed)
                .build();

        log.info("Import completed. Status: {}, Success: {}, Failed: {}, Skipped: {}",
                status, imported.size(), failed.size(), preview.getInvalidRows());

        return result;
    }

    /**
     * Get CSV template for download.
     */
    @Transactional(readOnly = true)
    public byte[] getCsvTemplate() {
        return parserService.generateCsvTemplate();
    }

    /**
     * Get Excel template for download.
     */
    @Transactional(readOnly = true)
    public byte[] getExcelTemplate() throws IOException {
        return parserService.generateExcelTemplate();
    }

    // Private helper methods

    private User createUserForEmployee(EmployeeImportRow row, UUID tenantId, Role defaultRole) {
        // Generate a secure random password for each imported user
        String randomPassword = generateSecurePassword(16);

        User user = User.builder()
                .email(row.getWorkEmail())
                .passwordHash(passwordEncoder.encode(randomPassword))
                .firstName(row.getFirstName())
                .lastName(row.getLastName() != null ? row.getLastName() : "")
                .status(User.UserStatus.ACTIVE)
                .roles(defaultRole != null ? Set.of(defaultRole) : new HashSet<>())
                .build();

        user.setTenantId(tenantId);

        User saved = userRepository.save(user);

        String displayName = row.getFirstName() + " " + (row.getLastName() != null ? row.getLastName() : "");
        emailNotificationService.sendWelcomeEmail(row.getWorkEmail(), displayName.trim(), randomPassword);
        log.info("Sent welcome email with temporary password to {}", row.getWorkEmail());

        return saved;
    }

    /**
     * Generate a secure random password.
     * @param length desired password length
     * @return cryptographically secure random password
     */
    private String generateSecurePassword(int length) {
        StringBuilder password = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int index = SECURE_RANDOM.nextInt(PASSWORD_CHARS.length());
            password.append(PASSWORD_CHARS.charAt(index));
        }
        return password.toString();
    }

    private Employee createEmployee(EmployeeImportRow row, User user, UUID tenantId,
                                    Map<String, UUID> departmentCodeToId,
                                    Map<String, UUID> employeeCodeToId) {
        // Build employee with required fields
        Employee.EmployeeBuilder employeeBuilder = Employee.builder()
                .employeeCode(row.getEmployeeCode())
                .user(user)
                .firstName(row.getFirstName())
                .middleName(row.getMiddleName())
                .lastName(row.getLastName())
                .joiningDate(LocalDate.parse(row.getJoiningDate()))
                .designation(row.getDesignation())
                .employmentType(Employee.EmploymentType.valueOf(row.getEmploymentType().toUpperCase()))
                .status(Employee.EmployeeStatus.ACTIVE);

        // Optional fields
        if (isNotBlank(row.getPersonalEmail())) {
            employeeBuilder.personalEmail(row.getPersonalEmail());
        }
        if (isNotBlank(row.getPhoneNumber())) {
            employeeBuilder.phoneNumber(row.getPhoneNumber());
        }
        if (isNotBlank(row.getEmergencyContactNumber())) {
            employeeBuilder.emergencyContactNumber(row.getEmergencyContactNumber());
        }
        if (isNotBlank(row.getDateOfBirth())) {
            employeeBuilder.dateOfBirth(LocalDate.parse(row.getDateOfBirth()));
        }
        if (isNotBlank(row.getGender())) {
            employeeBuilder.gender(Employee.Gender.valueOf(row.getGender().toUpperCase()));
        }
        if (isNotBlank(row.getAddress())) {
            employeeBuilder.address(row.getAddress());
        }
        if (isNotBlank(row.getCity())) {
            employeeBuilder.city(row.getCity());
        }
        if (isNotBlank(row.getState())) {
            employeeBuilder.state(row.getState());
        }
        if (isNotBlank(row.getPostalCode())) {
            employeeBuilder.postalCode(row.getPostalCode());
        }
        if (isNotBlank(row.getCountry())) {
            employeeBuilder.country(row.getCountry());
        }
        if (isNotBlank(row.getConfirmationDate())) {
            employeeBuilder.confirmationDate(LocalDate.parse(row.getConfirmationDate()));
        }
        if (isNotBlank(row.getBankAccountNumber())) {
            employeeBuilder.bankAccountNumber(row.getBankAccountNumber());
        }
        if (isNotBlank(row.getBankName())) {
            employeeBuilder.bankName(row.getBankName());
        }
        if (isNotBlank(row.getBankIfscCode())) {
            employeeBuilder.bankIfscCode(row.getBankIfscCode());
        }
        if (isNotBlank(row.getTaxId())) {
            employeeBuilder.taxId(row.getTaxId());
        }

        // Reference lookups
        if (isNotBlank(row.getDepartmentCode())) {
            UUID departmentId = departmentCodeToId.get(row.getDepartmentCode().toUpperCase());
            if (departmentId != null) {
                employeeBuilder.departmentId(departmentId);
            }
        }
        if (isNotBlank(row.getManagerEmployeeCode())) {
            UUID managerId = employeeCodeToId.get(row.getManagerEmployeeCode().toUpperCase());
            if (managerId != null) {
                employeeBuilder.managerId(managerId);
            }
        }

        Employee employee = employeeBuilder.build();
        employee.setTenantId(tenantId);

        return employeeRepository.save(employee);
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

    private Role getDefaultRole(UUID tenantId) {
        return roleRepository.findByCodeAndTenantId(DEFAULT_ROLE_CODE, tenantId).orElse(null);
    }

    private boolean isNotBlank(String value) {
        return value != null && !value.trim().isEmpty();
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

    private void saveCustomFieldValues(
            EmployeeImportRow row,
            UUID employeeId,
            UUID tenantId,
            Map<String, CustomFieldDefinition> customFieldDefinitions
    ) {
        Map<String, String> customFieldValues = row.getCustomFieldValues();

        for (Map.Entry<String, String> entry : customFieldValues.entrySet()) {
            String fieldCode = entry.getKey().toLowerCase();
            String value = entry.getValue();

            if (value == null || value.trim().isEmpty()) {
                continue;
            }

            CustomFieldDefinition definition = customFieldDefinitions.get(fieldCode);
            if (definition == null) {
                log.warn("Custom field definition not found for code: {} in row {}", fieldCode, row.getRowNumber());
                continue;
            }

            try {
                CustomFieldValue customFieldValue = CustomFieldValue.builder()
                        .fieldDefinition(definition)
                        .entityType(CustomFieldDefinition.EntityType.EMPLOYEE)
                        .entityId(employeeId)
                        .build();
                customFieldValue.setTenantId(tenantId);

                // Set value based on field type
                setCustomFieldValue(customFieldValue, definition, value);

                customFieldValueRepository.save(customFieldValue);
                log.debug("Saved custom field value for {} = {} on employee {}", fieldCode, value, employeeId);

            } catch (DataAccessException e) {
                log.warn("Failed to save custom field {} for employee {}: {}",
                        fieldCode, employeeId, e.getMessage());
            }
        }
    }

    private void setCustomFieldValue(CustomFieldValue customFieldValue, CustomFieldDefinition definition, String value) {
        switch (definition.getFieldType()) {
            case TEXT, TEXTAREA, EMAIL, PHONE, URL, DROPDOWN -> customFieldValue.setTextValue(value);
            case NUMBER, CURRENCY, PERCENTAGE -> customFieldValue.setNumberValue(new BigDecimal(value));
            case DATE -> customFieldValue.setDateValue(LocalDate.parse(value));
            case DATETIME -> customFieldValue.setDateTimeValue(LocalDateTime.parse(value));
            case CHECKBOX -> {
                String lower = value.toLowerCase();
                boolean boolValue = lower.equals("true") || lower.equals("yes") || lower.equals("1");
                customFieldValue.setBooleanValue(boolValue);
            }
            case MULTI_SELECT -> customFieldValue.setMultiSelectValue(value);
            case FILE -> log.warn("FILE type custom field cannot be set via import");
        }

        // Set currency code if applicable
        if (definition.getFieldType() == CustomFieldDefinition.FieldType.CURRENCY) {
            customFieldValue.setCurrencyCode("USD"); // Default, could be configurable
        }
    }
}
