package com.hrms.application.dataimport.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.dataimport.dto.*;
import com.hrms.application.notification.service.EmailNotificationService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.dataimport.KekaImportHistory;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import com.hrms.domain.user.Role;
import com.hrms.infrastructure.dataimport.repository.KekaImportHistoryRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for KEKA HRMS data import
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KekaImportService {

    private static final String DEFAULT_ROLE_CODE = "EMPLOYEE";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final KekaImportHistoryRepository historyRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final EmailNotificationService emailNotificationService;

    /**
     * Upload a KEKA CSV file and extract headers
     */
    public KekaFileUploadResponse uploadKekaFile(MultipartFile file) throws IOException {
        log.info("Uploading KEKA file: {}", file.getOriginalFilename());

        // Parse CSV to extract headers
        List<String> headers = extractHeadersFromCSV(file);

        String fileId = UUID.randomUUID().toString();
        LocalDateTime uploadedAt = LocalDateTime.now();

        return KekaFileUploadResponse.builder()
                .fileId(fileId)
                .fileName(file.getOriginalFilename())
                .size(file.getSize())
                .uploadedAt(uploadedAt)
                .detectedColumns(headers)
                .build();
    }

    /**
     * Preview import with validation
     */
    public KekaImportPreview previewKekaImport(KekaImportPreviewRequest request) {
        log.info("Starting preview for KEKA import");

        // For now, this is a simplified preview
        // In production, you'd want to actually validate the data
        return KekaImportPreview.builder()
                .totalRows(0)
                .validRows(0)
                .errorRows(0)
                .errors(new ArrayList<>())
                .warnings(new ArrayList<>())
                .preview(new ArrayList<>())
                .detectedColumns(new ArrayList<>())
                .unmappedColumns(new ArrayList<>())
                .build();
    }

    /**
     * Execute KEKA import - create employees and users
     */
    @Transactional
    public KekaImportResult executeKekaImport(KekaImportExecuteRequest request) {
        log.info("Executing KEKA import with file ID: {}", request.getFileId());

        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        LocalDateTime startTime = LocalDateTime.now();
        int totalProcessed = 0;
        int created = 0;
        int updated = 0;
        int skipped = 0;
        List<KekaImportError> errors = new ArrayList<>();
        List<KekaImportError> warnings = new ArrayList<>();

        String status = "SUCCESS";
        String importId = UUID.randomUUID().toString();

        // Get default role
        Role defaultRole = roleRepository.findByCodeAndTenantId(DEFAULT_ROLE_CODE, tenantId)
                .orElseThrow(() -> new IllegalStateException("Default EMPLOYEE role not found"));

        // Create mapping lookup
        Map<String, String> mappingLookup = request.getMappings().stream()
                .collect(Collectors.toMap(KekaColumnMapping::getSourceColumn, KekaColumnMapping::getTargetField));

        try {
            // In a real implementation, you would:
            // 1. Parse the CSV file from file storage
            // 2. Map columns according to request.getMappings()
            // 3. Validate each row
            // 4. Create/update employees and users
            // 5. Track errors and warnings

            // For now, this is a placeholder implementation
            // The actual implementation would handle CSV parsing, validation, and bulk import

        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.error("Error during KEKA import", e);
            status = "FAILED";
            errors.add(KekaImportError.builder()
                    .row(0)
                    .field("general")
                    .message(e.getMessage())
                    .severity("ERROR")
                    .build());
        }

        LocalDateTime endTime = LocalDateTime.now();
        long duration = java.time.temporal.ChronoUnit.MILLIS.between(startTime, endTime);

        // Save import history
        KekaImportHistory history = KekaImportHistory.builder()
                .tenantId(tenantId)
                .fileName(request.getFileId())
                .status(status)
                .totalRows(totalProcessed)
                .createdCount(created)
                .updatedCount(updated)
                .skippedCount(skipped)
                .errorCount(errors.size())
                .duration(duration)
                .uploadedAt(startTime)
                .uploadedBy(currentUserId.toString())
                .build();

        try {
            history.setErrorSummary(objectMapper.writeValueAsString(errors));
            history.setMappingConfig(objectMapper.writeValueAsString(request.getMappings()));
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.warn("Failed to serialize import metadata", e);
        }

        historyRepository.save(history);

        return KekaImportResult.builder()
                .totalProcessed(totalProcessed)
                .created(created)
                .updated(updated)
                .skipped(skipped)
                .errors(errors)
                .warnings(warnings)
                .importId(importId)
                .startedAt(startTime)
                .completedAt(endTime)
                .duration(duration)
                .status(status)
                .build();
    }

    /**
     * Get import history for the current tenant
     */
    @Transactional(readOnly = true)
    public Page<KekaImportHistoryEntry> getImportHistory(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return historyRepository.findByTenantIdOrderByUploadedAtDesc(tenantId, pageable)
                .map(this::toHistoryEntry);
    }

    /**
     * Get details of a specific import
     */
    @Transactional(readOnly = true)
    public KekaImportHistoryEntry getImportDetails(String importId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // In a real implementation, you'd look up the import by ID
        // For now, this is a placeholder
        return KekaImportHistoryEntry.builder()
                .id(importId)
                .build();
    }

    /**
     * Helper: Extract headers from CSV file
     */
    private List<String> extractHeadersFromCSV(MultipartFile file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build())) {

            if (csvParser.getRecordNumber() == 0) {
                return new ArrayList<>();
            }

            return new ArrayList<>(csvParser.getHeaderMap().keySet());
        }
    }

    /**
     * Helper: Convert history entity to DTO
     */
    private KekaImportHistoryEntry toHistoryEntry(KekaImportHistory history) {
        return KekaImportHistoryEntry.builder()
                .id(history.getId().toString())
                .fileName(history.getFileName())
                .uploadedAt(history.getUploadedAt())
                .status(history.getStatus())
                .totalRows(history.getTotalRows())
                .created(history.getCreatedCount())
                .updated(history.getUpdatedCount())
                .skipped(history.getSkippedCount())
                .errors(history.getErrorCount())
                .duration(history.getDuration())
                .uploadedBy(history.getUploadedBy())
                .build();
    }

    /**
     * Helper: Create or get user for employee
     */
    private User createOrGetUser(String email, String firstName, String lastName, UUID tenantId, Role defaultRole) {
        Optional<User> existingUser = userRepository.findByEmailAndTenantId(email, tenantId);

        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        // Generate secure random password for each imported user
        String randomPassword = generateSecurePassword(16);

        User user = User.builder()
                .tenantId(tenantId)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .passwordHash(passwordEncoder.encode(randomPassword))
                .status(User.UserStatus.ACTIVE)
                .mfaEnabled(false)
                .roles(new HashSet<>(Collections.singleton(defaultRole)))
                .build();

        User saved = userRepository.save(user);

        String displayName = firstName + " " + lastName;
        emailNotificationService.sendWelcomeEmail(email, displayName.trim(), randomPassword);
        log.info("Sent welcome email with temporary password to {}", email);

        return saved;
    }

    /**
     * Generate a secure random password.
     *
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

    /**
     * Helper: Create employee from mapped data
     */
    private Employee createEmployee(Map<String, String> rowData, User user, UUID tenantId,
                                    Map<String, String> mappingLookup) {
        String employeeCode = rowData.get(mappingLookup.get("employeeNumber"));
        if (employeeCode == null || employeeCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Employee number is required");
        }

        Employee employee = Employee.builder()
                .tenantId(tenantId)
                .employeeCode(employeeCode)
                .user(user)
                .firstName(rowData.getOrDefault(mappingLookup.get("firstName"), ""))
                .lastName(rowData.getOrDefault(mappingLookup.get("lastName"), ""))
                .personalEmail(rowData.get(mappingLookup.get("personalEmail")))
                .phoneNumber(rowData.get(mappingLookup.get("phone")))
                .designation(rowData.get(mappingLookup.get("designation")))
                .joiningDate(parseDate(rowData.get(mappingLookup.get("joiningDate"))))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();

        return employeeRepository.save(employee);
    }

    /**
     * Helper: Parse date string in YYYY-MM-DD format
     */
    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        try {
            return LocalDate.parse(dateStr, DATE_FORMATTER);
        } catch (DateTimeParseException e) {
            log.warn("Invalid date format: {}", dateStr);
            return null;
        }
    }
}
