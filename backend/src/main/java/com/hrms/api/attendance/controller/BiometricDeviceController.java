package com.hrms.api.attendance.controller;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.BiometricIntegrationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.BiometricApiKey;
import com.hrms.domain.attendance.BiometricDevice;
import com.hrms.domain.attendance.BiometricPunchLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for biometric device management and punch processing.
 *
 * Admin endpoints (device CRUD, logs, reprocessing) require JWT + ATTENDANCE:MANAGE permission.
 * Webhook endpoints (punch, batch-punch) use API key auth via X-Biometric-Api-Key header.
 */
@RestController
@RequestMapping("/api/v1/biometric")
@RequiredArgsConstructor
@Validated
@Tag(name = "Biometric Devices", description = "Biometric device integration for automated attendance tracking")
public class BiometricDeviceController {

    private final BiometricIntegrationService biometricService;

    // ─── Device Management (JWT Auth + ATTENDANCE:MANAGE) ───────────────────

    @PostMapping("/devices")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Register a biometric device", description = "Register a new biometric device for the tenant")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Device registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or duplicate serial number"),
        @ApiResponse(responseCode = "403", description = "Not authorized")
    })
    public ResponseEntity<BiometricDeviceResponse> registerDevice(
            @Valid @RequestBody BiometricDeviceRequest request) {
        BiometricDevice device = biometricService.registerDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(biometricService.toDeviceResponse(device));
    }

    @GetMapping("/devices")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "List biometric devices", description = "List all biometric devices for the tenant")
    public ResponseEntity<Page<BiometricDeviceResponse>> listDevices(Pageable pageable) {
        Page<BiometricDevice> devices = biometricService.listDevices(pageable);
        return ResponseEntity.ok(devices.map(biometricService::toDeviceResponse));
    }

    @GetMapping("/devices/{id}")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Get device details", description = "Get a specific biometric device with stats")
    public ResponseEntity<BiometricDeviceResponse> getDevice(@PathVariable UUID id) {
        BiometricDevice device = biometricService.getDevice(id);
        return ResponseEntity.ok(biometricService.toDeviceResponse(device));
    }

    @PutMapping("/devices/{id}")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Update a biometric device", description = "Update device configuration")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Device updated successfully"),
        @ApiResponse(responseCode = "404", description = "Device not found")
    })
    public ResponseEntity<BiometricDeviceResponse> updateDevice(
            @PathVariable UUID id,
            @Valid @RequestBody BiometricDeviceRequest request) {
        BiometricDevice device = biometricService.updateDevice(id, request);
        return ResponseEntity.ok(biometricService.toDeviceResponse(device));
    }

    @DeleteMapping("/devices/{id}")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Deactivate a biometric device", description = "Soft-deactivate a device (does not delete)")
    public ResponseEntity<Void> deactivateDevice(@PathVariable UUID id) {
        biometricService.deactivateDevice(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/devices/{id}/sync")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Manual sync trigger", description = "Pull attendance logs from device (manufacturer adapter required)")
    public ResponseEntity<Map<String, String>> syncDevice(@PathVariable UUID id) {
        biometricService.syncDevice(id);
        return ResponseEntity.ok(Map.of("status", "sync_initiated"));
    }

    @GetMapping("/devices/{id}/logs")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Get device punch logs", description = "View punch logs for a specific device")
    public ResponseEntity<Page<BiometricPunchResponse>> getDeviceLogs(
            @PathVariable UUID id, Pageable pageable) {
        Page<BiometricPunchLog> logs = biometricService.getDeviceLogs(id, pageable);
        return ResponseEntity.ok(logs.map(biometricService::toPunchResponse));
    }

    // ─── Punch Management (JWT Auth) ────────────────────────────────────────

    @GetMapping("/punch/pending")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "List unprocessed punches", description = "View all PENDING punch logs for the tenant")
    public ResponseEntity<Page<BiometricPunchResponse>> getPendingPunches(Pageable pageable) {
        Page<BiometricPunchLog> pending = biometricService.getPendingPunches(pageable);
        return ResponseEntity.ok(pending.map(biometricService::toPunchResponse));
    }

    @PostMapping("/punch/reprocess")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Reprocess failed punches", description = "Reset all FAILED punches to PENDING for reprocessing")
    public ResponseEntity<Map<String, Object>> reprocessFailedPunches() {
        int count = biometricService.reprocessFailedPunches();
        return ResponseEntity.ok(Map.of(
                "status", "reprocessing_initiated",
                "count", count
        ));
    }

    // ─── Webhook Endpoints (API Key Auth) ───────────────────────────────────
    // These endpoints are NOT protected by JWT. They use the X-Biometric-Api-Key header.
    // SecurityConfig allows them without authentication; the service validates the key.

    @PostMapping("/punch")
    @Operation(summary = "Receive punch (webhook)",
               description = "Webhook endpoint for biometric devices. Authenticates via X-Biometric-Api-Key header.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Punch accepted"),
        @ApiResponse(responseCode = "401", description = "Invalid or missing API key"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<BiometricPunchResponse> receivePunch(
            @RequestHeader("X-Biometric-Api-Key") String apiKey,
            @Valid @RequestBody BiometricPunchRequest request) {

        BiometricApiKey validatedKey = biometricService.validateApiKey(apiKey)
                .orElse(null);
        if (validatedKey == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        BiometricPunchLog punch = biometricService.receivePunch(validatedKey.getTenantId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(biometricService.toPunchResponse(punch));
    }

    @PostMapping("/punch/batch")
    @Operation(summary = "Receive batch punches (webhook)",
               description = "Webhook endpoint for batch punch uploads. Authenticates via X-Biometric-Api-Key header.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Batch accepted"),
        @ApiResponse(responseCode = "401", description = "Invalid or missing API key"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<BiometricBatchPunchResponse> receiveBatchPunches(
            @RequestHeader("X-Biometric-Api-Key") String apiKey,
            @Valid @RequestBody BiometricBatchPunchRequest request) {

        BiometricApiKey validatedKey = biometricService.validateApiKey(apiKey)
                .orElse(null);
        if (validatedKey == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<BiometricPunchLog> results = biometricService.receiveBatchPunches(
                validatedKey.getTenantId(), request);

        long accepted = results.stream()
                .filter(r -> r.getProcessedStatus() != BiometricPunchLog.ProcessedStatus.FAILED)
                .count();

        BiometricBatchPunchResponse response = BiometricBatchPunchResponse.builder()
                .totalReceived(request.getPunches().size())
                .accepted((int) accepted)
                .rejected(request.getPunches().size() - (int) accepted)
                .results(results.stream()
                        .map(biometricService::toPunchResponse)
                        .collect(Collectors.toList()))
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─── API Key Management (JWT Auth + ATTENDANCE:MANAGE) ──────────────────

    @PostMapping("/api-keys")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Generate API key", description = "Generate a new API key for biometric device authentication")
    public ResponseEntity<BiometricApiKeyResponse> generateApiKey(
            @RequestParam String keyName,
            @RequestParam(required = false) UUID deviceId) {
        BiometricApiKeyResponse response = biometricService.generateApiKey(keyName, deviceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api-keys")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "List API keys", description = "List all biometric API keys for the tenant")
    public ResponseEntity<List<BiometricApiKeyResponse>> listApiKeys() {
        List<BiometricApiKey> keys = biometricService.listApiKeys();
        List<BiometricApiKeyResponse> responses = keys.stream()
                .map(k -> BiometricApiKeyResponse.builder()
                        .id(k.getId())
                        .keyName(k.getKeyName())
                        .keySuffix(k.getKeySuffix())
                        .deviceId(k.getDeviceId())
                        .isActive(k.getIsActive())
                        .expiresAt(k.getExpiresAt())
                        .lastUsedAt(k.getLastUsedAt())
                        .createdAt(k.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/api-keys/{id}")
    @RequiresPermission(Permission.ATTENDANCE_MANAGE)
    @Operation(summary = "Revoke API key", description = "Revoke a biometric API key")
    public ResponseEntity<Void> revokeApiKey(@PathVariable UUID id) {
        biometricService.revokeApiKey(id);
        return ResponseEntity.noContent().build();
    }
}
