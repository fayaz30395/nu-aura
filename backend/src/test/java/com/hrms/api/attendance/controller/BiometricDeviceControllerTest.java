package com.hrms.api.attendance.controller;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.BiometricIntegrationService;
import com.hrms.domain.attendance.BiometricApiKey;
import com.hrms.domain.attendance.BiometricDevice;
import com.hrms.domain.attendance.BiometricPunchLog;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BiometricDeviceControllerTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID DEVICE_ID = UUID.randomUUID();

    @Mock
    private BiometricIntegrationService biometricService;
    @InjectMocks
    private BiometricDeviceController controller;

    // ─── Webhook Endpoint Tests ─────────────────────────────────────────────

    @Test
    void receivePunch_validApiKey_returns201() {
        String apiKey = "bio_testkey123";
        BiometricApiKey validKey = BiometricApiKey.builder()
                .keyHash("hash")
                .keyName("Test")
                .isActive(true)
                .build();
        validKey.setTenantId(TENANT_ID);
        validKey.setId(UUID.randomUUID());

        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("ZK-001")
                .employeeIdentifier("EMP-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        BiometricPunchLog punchLog = BiometricPunchLog.builder()
                .deviceId(DEVICE_ID)
                .employeeId(UUID.randomUUID())
                .punchTime(request.getPunchTime())
                .punchType(BiometricPunchLog.PunchType.IN)
                .processedStatus(BiometricPunchLog.ProcessedStatus.PENDING)
                .build();
        punchLog.setId(UUID.randomUUID());

        BiometricPunchResponse punchResponse = BiometricPunchResponse.builder()
                .id(punchLog.getId())
                .processedStatus("PENDING")
                .build();

        when(biometricService.validateApiKey(apiKey)).thenReturn(Optional.of(validKey));
        when(biometricService.receivePunch(TENANT_ID, request)).thenReturn(punchLog);
        when(biometricService.toPunchResponse(punchLog)).thenReturn(punchResponse);

        ResponseEntity<BiometricPunchResponse> response = controller.receivePunch(apiKey, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProcessedStatus()).isEqualTo("PENDING");
    }

    @Test
    void receivePunch_invalidApiKey_returns401() {
        String apiKey = "invalid";
        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("ZK-001")
                .employeeIdentifier("EMP-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        when(biometricService.validateApiKey(apiKey)).thenReturn(Optional.empty());

        ResponseEntity<BiometricPunchResponse> response = controller.receivePunch(apiKey, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(biometricService, never()).receivePunch(any(), any());
    }

    @Test
    void registerDevice_returns201() {
        BiometricDeviceRequest request = BiometricDeviceRequest.builder()
                .deviceName("Test Device")
                .deviceType(BiometricDevice.DeviceType.FINGERPRINT)
                .serialNumber("ZK-001")
                .build();

        BiometricDevice device = BiometricDevice.builder()
                .deviceName("Test Device")
                .deviceType(BiometricDevice.DeviceType.FINGERPRINT)
                .serialNumber("ZK-001")
                .isActive(true)
                .build();
        device.setId(DEVICE_ID);
        device.setTenantId(TENANT_ID);

        BiometricDeviceResponse deviceResponse = BiometricDeviceResponse.builder()
                .id(DEVICE_ID)
                .deviceName("Test Device")
                .deviceType("FINGERPRINT")
                .isActive(true)
                .build();

        when(biometricService.registerDevice(request)).thenReturn(device);
        when(biometricService.toDeviceResponse(device)).thenReturn(deviceResponse);

        ResponseEntity<BiometricDeviceResponse> response = controller.registerDevice(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDeviceName()).isEqualTo("Test Device");
    }

    @Test
    void deactivateDevice_returns204() {
        doNothing().when(biometricService).deactivateDevice(DEVICE_ID);

        ResponseEntity<Void> response = controller.deactivateDevice(DEVICE_ID);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(biometricService).deactivateDevice(DEVICE_ID);
    }

    @Test
    void reprocessFailedPunches_returnsCount() {
        when(biometricService.reprocessFailedPunches()).thenReturn(5);

        var response = controller.reprocessFailedPunches();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("count", 5);
    }

    @Test
    void generateApiKey_returns201() {
        BiometricApiKeyResponse keyResponse = BiometricApiKeyResponse.builder()
                .id(UUID.randomUUID())
                .keyName("Test Key")
                .plaintextKey("bio_abc123")
                .isActive(true)
                .build();

        when(biometricService.generateApiKey("Test Key", null)).thenReturn(keyResponse);

        ResponseEntity<BiometricApiKeyResponse> response =
                controller.generateApiKey("Test Key", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPlaintextKey()).isEqualTo("bio_abc123");
    }
}
