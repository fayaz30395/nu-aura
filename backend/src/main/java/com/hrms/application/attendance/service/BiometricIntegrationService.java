package com.hrms.application.attendance.service;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.adapter.BiometricAdapter;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.attendance.repository.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BiometricIntegrationService {

    private final BiometricDeviceRepository deviceRepository;
    private final BiometricPunchLogRepository punchLogRepository;
    private final BiometricApiKeyRepository apiKeyRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordService attendanceRecordService;
    private final EventPublisher eventPublisher;
    private final List<BiometricAdapter> adapters;

    /** Deduplication window in minutes — punches from same employee within this window are ignored */
    private static final int DEDUP_WINDOW_MINUTES = 5;

    // ─── Device Management ──────────────────────────────────────────────────

    @Transactional
    public BiometricDevice registerDevice(BiometricDeviceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (deviceRepository.existsBySerialNumberAndTenantId(request.getSerialNumber(), tenantId)) {
            throw new IllegalArgumentException(
                    "Device with serial number '" + request.getSerialNumber() + "' already exists");
        }

        BiometricDevice device = BiometricDevice.builder()
                .deviceName(request.getDeviceName())
                .deviceType(request.getDeviceType())
                .serialNumber(request.getSerialNumber())
                .locationId(request.getLocationId())
                .locationName(request.getLocationName())
                .ipAddress(request.getIpAddress())
                .manufacturer(request.getManufacturer())
                .model(request.getModel())
                .firmwareVersion(request.getFirmwareVersion())
                .notes(request.getNotes())
                .isActive(true)
                .build();
        device.setTenantId(tenantId);

        BiometricDevice saved = deviceRepository.save(device);
        log.info("Registered biometric device '{}' (serial: {}) for tenant {}",
                saved.getDeviceName(), saved.getSerialNumber(), tenantId);

        publishAuditEvent(tenantId, "BIOMETRIC_DEVICE_REGISTERED",
                "BiometricDevice", saved.getId(),
                "Device registered: " + saved.getDeviceName());

        return saved;
    }

    @Transactional
    public BiometricDevice updateDevice(UUID deviceId, BiometricDeviceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BiometricDevice device = getDeviceOrThrow(deviceId, tenantId);

        // If serial number changed, check uniqueness
        if (!device.getSerialNumber().equals(request.getSerialNumber()) &&
            deviceRepository.existsBySerialNumberAndTenantId(request.getSerialNumber(), tenantId)) {
            throw new IllegalArgumentException(
                    "Device with serial number '" + request.getSerialNumber() + "' already exists");
        }

        device.setDeviceName(request.getDeviceName());
        device.setDeviceType(request.getDeviceType());
        device.setSerialNumber(request.getSerialNumber());
        device.setLocationId(request.getLocationId());
        device.setLocationName(request.getLocationName());
        device.setIpAddress(request.getIpAddress());
        device.setManufacturer(request.getManufacturer());
        device.setModel(request.getModel());
        device.setFirmwareVersion(request.getFirmwareVersion());
        device.setNotes(request.getNotes());

        return deviceRepository.save(device);
    }

    @Transactional
    public void deactivateDevice(UUID deviceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BiometricDevice device = getDeviceOrThrow(deviceId, tenantId);
        device.deactivate();
        deviceRepository.save(device);

        log.info("Deactivated biometric device '{}' (serial: {})", device.getDeviceName(), device.getSerialNumber());

        publishAuditEvent(tenantId, "BIOMETRIC_DEVICE_DEACTIVATED",
                "BiometricDevice", device.getId(),
                "Device deactivated: " + device.getDeviceName());
    }

    @Transactional(readOnly = true)
    public Page<BiometricDevice> listDevices(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return deviceRepository.findByTenantIdAndIsDeletedFalse(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public BiometricDevice getDevice(UUID deviceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return getDeviceOrThrow(deviceId, tenantId);
    }

    // ─── Punch Reception (Webhook) ──────────────────────────────────────────

    /**
     * Receive a single punch from a biometric device.
     * Called from the webhook endpoint — authenticates via API key, not JWT.
     *
     * @param tenantId resolved from the API key
     * @param request the punch data
     * @return the created punch log
     */
    @Transactional
    public BiometricPunchLog receivePunch(UUID tenantId, BiometricPunchRequest request) {
        // Resolve device
        BiometricDevice device = deviceRepository
                .findBySerialNumberAndTenantIdAndIsDeletedFalse(request.getDeviceSerialNumber(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown device serial: " + request.getDeviceSerialNumber()));

        if (!device.getIsActive()) {
            throw new IllegalStateException("Device is deactivated: " + device.getSerialNumber());
        }

        // Update heartbeat
        device.recordHeartbeat();
        deviceRepository.save(device);

        // Resolve employee
        UUID employeeId = resolveEmployeeId(tenantId, request.getEmployeeIdentifier());

        // Check for duplicates
        if (employeeId != null && isDuplicate(tenantId, employeeId, request.getPunchTime())) {
            log.debug("Duplicate punch detected for employee {} at {}", employeeId, request.getPunchTime());
            BiometricPunchLog dupLog = buildPunchLog(tenantId, device.getId(), employeeId,
                    request.getEmployeeIdentifier(), request);
            dupLog.markDuplicate();
            return punchLogRepository.save(dupLog);
        }

        // Create punch log
        BiometricPunchLog punchLog = buildPunchLog(tenantId, device.getId(), employeeId,
                request.getEmployeeIdentifier(), request);

        if (employeeId == null) {
            punchLog.markFailed("Unable to resolve employee identifier: " + request.getEmployeeIdentifier());
        }

        return punchLogRepository.save(punchLog);
    }

    /**
     * Receive a batch of punches from a device.
     */
    @Transactional
    public List<BiometricPunchLog> receiveBatchPunches(UUID tenantId, BiometricBatchPunchRequest request) {
        List<BiometricPunchLog> results = new ArrayList<>();
        for (BiometricPunchRequest punch : request.getPunches()) {
            try {
                results.add(receivePunch(tenantId, punch));
            } catch (Exception e) { // Intentional broad catch — attendance processing error boundary
                log.error("Failed to process punch for employee '{}': {}",
                        punch.getEmployeeIdentifier(), e.getMessage());
                BiometricPunchLog failedLog = BiometricPunchLog.builder()
                        .employeeIdentifier(punch.getEmployeeIdentifier())
                        .punchTime(punch.getPunchTime())
                        .punchType(punch.getPunchType())
                        .rawData(punch.getRawData())
                        .processedStatus(BiometricPunchLog.ProcessedStatus.FAILED)
                        .errorMessage(e.getMessage())
                        .build();
                failedLog.setTenantId(tenantId);
                // deviceId is unknown if device lookup failed; leave null
                results.add(punchLogRepository.save(failedLog));
            }
        }
        return results;
    }

    // ─── Punch Processing (Scheduled) ───────────────────────────────────────

    /**
     * Process all PENDING punches into AttendanceRecord entries.
     * Runs every 2 minutes via scheduled job.
     */
    @Scheduled(fixedDelayString = "${biometric.process-interval-ms:120000}")
    @SchedulerLock(name = "processPendingPunches", lockAtLeastFor = "PT2M", lockAtMostFor = "PT10M")
    @Transactional
    public void processPendingPunches() {
        processPendingPunchesInternal();
    }

    /**
     * Internal method to process pending punches across all tenants.
     * Uses a cross-tenant query since this runs as a scheduled job without tenant context.
     */
    @Transactional
    public int processPendingPunchesInternal() {
        List<BiometricPunchLog> pendingLogs = punchLogRepository.findAllByProcessedStatus(
                BiometricPunchLog.ProcessedStatus.PENDING, PageRequest.of(0, 200));

        int processed = 0;
        for (BiometricPunchLog punch : pendingLogs) {
            try {
                processSinglePunch(punch);
                processed++;
            } catch (Exception e) { // Intentional broad catch — attendance processing error boundary
                log.error("Failed to process punch {}: {}", punch.getId(), e.getMessage());
                punch.markFailed(e.getMessage());
                punchLogRepository.save(punch);
            }
        }

        if (processed > 0) {
            log.info("Processed {} pending biometric punches", processed);
        }

        return processed;
    }

    private void processSinglePunch(BiometricPunchLog punch) {
        if (punch.getEmployeeId() == null) {
            // Try to resolve employee one more time
            UUID employeeId = resolveEmployeeId(punch.getTenantId(), punch.getEmployeeIdentifier());
            if (employeeId == null) {
                punch.markFailed("Unable to resolve employee: " + punch.getEmployeeIdentifier());
                punchLogRepository.save(punch);
                return;
            }
            punch.setEmployeeId(employeeId);
        }

        LocalDate attendanceDate = punch.getPunchTime().toLocalDate();
        UUID tenantId = punch.getTenantId();
        UUID employeeId = punch.getEmployeeId();

        // Set tenant context for the attendance service
        TenantContext.setCurrentTenant(tenantId);

        try {
            AttendanceRecord record;
            if (punch.getPunchType() == BiometricPunchLog.PunchType.IN) {
                record = attendanceRecordService.checkIn(
                        employeeId,
                        punch.getPunchTime(),
                        "BIOMETRIC",
                        null, // location resolved from device
                        null, // IP from device, not relevant here
                        attendanceDate
                );
            } else {
                record = attendanceRecordService.checkOut(
                        employeeId,
                        punch.getPunchTime(),
                        "BIOMETRIC",
                        null,
                        null,
                        attendanceDate
                );
            }
            punch.markProcessed(record.getId());
            punchLogRepository.save(punch);
        } catch (IllegalStateException e) {
            // Common case: already checked in, or not checked in yet
            log.warn("Punch processing skipped for employee {}: {}", employeeId, e.getMessage());
            punch.markFailed(e.getMessage());
            punchLogRepository.save(punch);
        } finally {
            TenantContext.clear();
        }
    }

    // ─── Reprocess Failed Punches ───────────────────────────────────────────

    @Transactional
    public int reprocessFailedPunches() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<BiometricPunchLog> failedLogs = punchLogRepository
                .findByProcessedStatusInAndTenantId(
                        List.of(BiometricPunchLog.ProcessedStatus.FAILED), tenantId);

        int reprocessed = 0;
        for (BiometricPunchLog punch : failedLogs) {
            punch.setProcessedStatus(BiometricPunchLog.ProcessedStatus.PENDING);
            punch.setErrorMessage(null);
            punchLogRepository.save(punch);
            reprocessed++;
        }

        log.info("Reset {} failed punches to PENDING for reprocessing in tenant {}", reprocessed, tenantId);
        return reprocessed;
    }

    // ─── Device Sync ────────────────────────────────────────────────────────

    @Transactional
    public void syncDevice(UUID deviceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BiometricDevice device = getDeviceOrThrow(deviceId, tenantId);

        // Find appropriate adapter
        Optional<BiometricAdapter> adapter = adapters.stream()
                .filter(a -> a.supports(device.getManufacturer()))
                .findFirst();

        if (adapter.isEmpty()) {
            log.warn("No adapter found for manufacturer: {}", device.getManufacturer());
            throw new UnsupportedOperationException(
                    "No adapter available for manufacturer: " + device.getManufacturer());
        }

        // Pull punches from device
        List<BiometricPunchRequest> punches = adapter.get()
                .pullPunches(device.getIpAddress(), 4370); // default port

        for (BiometricPunchRequest punch : punches) {
            punch.setDeviceSerialNumber(device.getSerialNumber());
            receivePunch(tenantId, punch);
        }

        device.recordSync();
        deviceRepository.save(device);

        log.info("Synced device '{}': {} punches pulled", device.getDeviceName(), punches.size());
    }

    // ─── Punch Logs ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<BiometricPunchLog> getDeviceLogs(UUID deviceId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // Verify device exists and belongs to tenant
        getDeviceOrThrow(deviceId, tenantId);
        return punchLogRepository.findByDeviceIdAndTenantIdOrderByPunchTimeDesc(deviceId, tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BiometricPunchLog> getPendingPunches(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return punchLogRepository.findByProcessedStatusAndTenantIdOrderByPunchTimeAsc(
                BiometricPunchLog.ProcessedStatus.PENDING, tenantId, pageable);
    }

    // ─── API Key Management ─────────────────────────────────────────────────

    /**
     * Generate a new API key for biometric device authentication.
     * Returns the plaintext key exactly once — it is not stored.
     */
    @Transactional
    public BiometricApiKeyResponse generateApiKey(String keyName, UUID deviceId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Validate device if provided
        if (deviceId != null) {
            getDeviceOrThrow(deviceId, tenantId);
        }

        // Generate a random API key
        String plaintextKey = generateSecureKey();
        String keyHash = hashKey(plaintextKey);
        String keySuffix = plaintextKey.substring(plaintextKey.length() - 4);

        BiometricApiKey apiKey = BiometricApiKey.builder()
                .keyName(keyName)
                .keyHash(keyHash)
                .keySuffix(keySuffix)
                .deviceId(deviceId)
                .isActive(true)
                .build();
        apiKey.setTenantId(tenantId);

        BiometricApiKey saved = apiKeyRepository.save(apiKey);

        log.info("Generated biometric API key '{}' for tenant {}", keyName, tenantId);

        return BiometricApiKeyResponse.builder()
                .id(saved.getId())
                .keyName(saved.getKeyName())
                .keySuffix(saved.getKeySuffix())
                .deviceId(saved.getDeviceId())
                .isActive(saved.getIsActive())
                .expiresAt(saved.getExpiresAt())
                .createdAt(saved.getCreatedAt())
                .plaintextKey(plaintextKey) // Only returned at creation time
                .build();
    }

    /**
     * Validate an API key and return the associated tenant ID if valid.
     * Used by the biometric webhook endpoint for authentication.
     */
    @Transactional
    public Optional<BiometricApiKey> validateApiKey(String plaintextKey) {
        String keyHash = hashKey(plaintextKey);
        Optional<BiometricApiKey> apiKey = apiKeyRepository
                .findByKeyHashAndIsActiveTrueAndIsDeletedFalse(keyHash);

        apiKey.ifPresent(key -> {
            if (key.isExpired()) {
                return;
            }
            key.recordUsage();
            apiKeyRepository.save(key);
        });

        return apiKey.filter(BiometricApiKey::isValid);
    }

    @Transactional
    public void revokeApiKey(UUID keyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BiometricApiKey key = apiKeyRepository.findByIdAndTenantIdAndIsDeletedFalse(keyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("API key not found"));
        key.revoke();
        apiKeyRepository.save(key);
        log.info("Revoked biometric API key '{}'", key.getKeyName());
    }

    @Transactional(readOnly = true)
    public List<BiometricApiKey> listApiKeys() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return apiKeyRepository.findByTenantIdAndIsDeletedFalse(tenantId);
    }

    // ─── Response Mappers ───────────────────────────────────────────────────

    public BiometricDeviceResponse toDeviceResponse(BiometricDevice device) {
        UUID tenantId = device.getTenantId();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();

        long totalToday = punchLogRepository.countByDeviceAndStatusSince(
                device.getId(), tenantId, BiometricPunchLog.ProcessedStatus.PROCESSED, todayStart)
                + punchLogRepository.countByDeviceAndStatusSince(
                device.getId(), tenantId, BiometricPunchLog.ProcessedStatus.PENDING, todayStart);

        long failedToday = punchLogRepository.countByDeviceAndStatusSince(
                device.getId(), tenantId, BiometricPunchLog.ProcessedStatus.FAILED, todayStart);

        long pending = punchLogRepository.countByDeviceAndStatusSince(
                device.getId(), tenantId, BiometricPunchLog.ProcessedStatus.PENDING,
                LocalDateTime.of(2020, 1, 1, 0, 0));

        return BiometricDeviceResponse.builder()
                .id(device.getId())
                .tenantId(device.getTenantId())
                .deviceName(device.getDeviceName())
                .deviceType(device.getDeviceType().name())
                .serialNumber(device.getSerialNumber())
                .locationId(device.getLocationId())
                .locationName(device.getLocationName())
                .ipAddress(device.getIpAddress())
                .manufacturer(device.getManufacturer())
                .model(device.getModel())
                .firmwareVersion(device.getFirmwareVersion())
                .isActive(device.getIsActive())
                .isOnline(device.isOnline())
                .lastSyncAt(device.getLastSyncAt())
                .lastHeartbeatAt(device.getLastHeartbeatAt())
                .notes(device.getNotes())
                .createdAt(device.getCreatedAt())
                .updatedAt(device.getUpdatedAt())
                .totalPunchesToday(totalToday)
                .failedPunchesToday(failedToday)
                .pendingPunches(pending)
                .build();
    }

    public BiometricPunchResponse toPunchResponse(BiometricPunchLog punch) {
        return BiometricPunchResponse.builder()
                .id(punch.getId())
                .deviceId(punch.getDeviceId())
                .employeeId(punch.getEmployeeId())
                .employeeIdentifier(punch.getEmployeeIdentifier())
                .punchTime(punch.getPunchTime())
                .punchType(punch.getPunchType().name())
                .processedStatus(punch.getProcessedStatus().name())
                .errorMessage(punch.getErrorMessage())
                .attendanceRecordId(punch.getAttendanceRecordId())
                .processedAt(punch.getProcessedAt())
                .createdAt(punch.getCreatedAt())
                .build();
    }

    // ─── Private Helpers ────────────────────────────────────────────────────

    private BiometricDevice getDeviceOrThrow(UUID deviceId, UUID tenantId) {
        return deviceRepository.findByIdAndTenantIdAndIsDeletedFalse(deviceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
    }

    private UUID resolveEmployeeId(UUID tenantId, String employeeIdentifier) {
        if (employeeIdentifier == null || employeeIdentifier.isBlank()) {
            return null;
        }

        // Try to parse as UUID first
        try {
            UUID candidateId = UUID.fromString(employeeIdentifier);
            if (employeeRepository.existsById(candidateId)) {
                return candidateId;
            }
        } catch (IllegalArgumentException ignored) {
            log.debug("Identifier '{}' is not a UUID, trying employee code lookup", employeeIdentifier);
        }

        // Try to find by employee code
        return employeeRepository.findByEmployeeCodeAndTenantId(employeeIdentifier, tenantId)
                .map(Employee::getId)
                .orElse(null);
    }

    private boolean isDuplicate(UUID tenantId, UUID employeeId, LocalDateTime punchTime) {
        LocalDateTime windowStart = punchTime.minusMinutes(DEDUP_WINDOW_MINUTES);
        LocalDateTime windowEnd = punchTime.plusMinutes(DEDUP_WINDOW_MINUTES);
        return punchLogRepository.existsDuplicatePunch(tenantId, employeeId, windowStart, windowEnd);
    }

    private BiometricPunchLog buildPunchLog(UUID tenantId, UUID deviceId, UUID employeeId,
                                            String employeeIdentifier, BiometricPunchRequest request) {
        BiometricPunchLog log = BiometricPunchLog.builder()
                .deviceId(deviceId)
                .employeeId(employeeId)
                .employeeIdentifier(employeeIdentifier)
                .punchTime(request.getPunchTime())
                .punchType(request.getPunchType())
                .rawData(request.getRawData())
                .processedStatus(BiometricPunchLog.ProcessedStatus.PENDING)
                .build();
        log.setTenantId(tenantId);
        return log;
    }

    private String generateSecureKey() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return "bio_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashKey(String plaintextKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(plaintextKey.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private void publishAuditEvent(UUID tenantId, String action, String entityType,
                                   UUID entityId, String description) {
        try {
            eventPublisher.publishAuditEvent(
                    null, action, entityType, entityId, tenantId,
                    null, null, null, null, null, null, null, null,
                    description);
        } catch (Exception e) { // Intentional broad catch — attendance processing error boundary
            log.warn("Failed to publish biometric audit event (action={}, entityId={}): {}",
                    action, entityId, e.getMessage());
        }
    }
}
