package com.hrms.application.attendance.service;

import com.hrms.api.attendance.dto.BiometricDeviceRequest;
import com.hrms.api.attendance.dto.BiometricPunchRequest;
import com.hrms.application.attendance.adapter.BiometricAdapter;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.attendance.repository.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BiometricIntegrationServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID DEVICE_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    @Mock
    private BiometricDeviceRepository deviceRepository;
    @Mock
    private BiometricPunchLogRepository punchLogRepository;
    @Mock
    private BiometricApiKeyRepository apiKeyRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AttendanceRecordService attendanceRecordService;
    @Mock
    private EventPublisher eventPublisher;
    @Mock
    private List<BiometricAdapter> adapters;
    @InjectMocks
    private BiometricIntegrationService service;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ─── Device Registration Tests ──────────────────────────────────────────

    @Test
    void registerDevice_success() {
        BiometricDeviceRequest request = BiometricDeviceRequest.builder()
                .deviceName("Main Entrance")
                .deviceType(BiometricDevice.DeviceType.FINGERPRINT)
                .serialNumber("ZK-001")
                .manufacturer("ZKTeco")
                .model("SpeedFace V5L")
                .build();

        when(deviceRepository.existsBySerialNumberAndTenantId("ZK-001", TENANT_ID))
                .thenReturn(false);
        when(deviceRepository.save(any(BiometricDevice.class)))
                .thenAnswer(inv -> {
                    BiometricDevice d = inv.getArgument(0);
                    d.setId(DEVICE_ID);
                    return d;
                });

        BiometricDevice result = service.registerDevice(request);

        assertThat(result.getDeviceName()).isEqualTo("Main Entrance");
        assertThat(result.getDeviceType()).isEqualTo(BiometricDevice.DeviceType.FINGERPRINT);
        assertThat(result.getSerialNumber()).isEqualTo("ZK-001");
        assertThat(result.getIsActive()).isTrue();
        verify(deviceRepository).save(any(BiometricDevice.class));
    }

    @Test
    void registerDevice_duplicateSerial_throws() {
        BiometricDeviceRequest request = BiometricDeviceRequest.builder()
                .deviceName("Duplicate")
                .deviceType(BiometricDevice.DeviceType.FACE)
                .serialNumber("ZK-001")
                .build();

        when(deviceRepository.existsBySerialNumberAndTenantId("ZK-001", TENANT_ID))
                .thenReturn(true);

        assertThatThrownBy(() -> service.registerDevice(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deactivateDevice_success() {
        BiometricDevice device = BiometricDevice.builder()
                .deviceName("Test Device")
                .isActive(true)
                .build();
        device.setId(DEVICE_ID);
        device.setTenantId(TENANT_ID);

        when(deviceRepository.findByIdAndTenantIdAndIsDeletedFalse(DEVICE_ID, TENANT_ID))
                .thenReturn(Optional.of(device));
        when(deviceRepository.save(any(BiometricDevice.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.deactivateDevice(DEVICE_ID);

        assertThat(device.getIsActive()).isFalse();
        verify(deviceRepository).save(device);
    }

    // ─── Punch Reception Tests ──────────────────────────────────────────────

    @Test
    void receivePunch_success() {
        BiometricDevice device = BiometricDevice.builder()
                .deviceName("Test")
                .serialNumber("ZK-001")
                .isActive(true)
                .build();
        device.setId(DEVICE_ID);
        device.setTenantId(TENANT_ID);

        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("ZK-001")
                .employeeIdentifier("EMP-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);

        when(deviceRepository.findBySerialNumberAndTenantIdAndIsDeletedFalse("ZK-001", TENANT_ID))
                .thenReturn(Optional.of(device));
        when(deviceRepository.save(any(BiometricDevice.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findByEmployeeCodeAndTenantId("EMP-001", TENANT_ID))
                .thenReturn(Optional.of(employee));
        when(punchLogRepository.existsDuplicatePunch(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(false);
        when(punchLogRepository.save(any(BiometricPunchLog.class)))
                .thenAnswer(inv -> {
                    BiometricPunchLog p = inv.getArgument(0);
                    p.setId(UUID.randomUUID());
                    return p;
                });

        BiometricPunchLog result = service.receivePunch(TENANT_ID, request);

        assertThat(result.getEmployeeId()).isEqualTo(EMPLOYEE_ID);
        assertThat(result.getProcessedStatus()).isEqualTo(BiometricPunchLog.ProcessedStatus.PENDING);
        verify(punchLogRepository).save(any(BiometricPunchLog.class));
    }

    @Test
    void receivePunch_duplicate_markedAsDuplicate() {
        BiometricDevice device = BiometricDevice.builder()
                .deviceName("Test")
                .serialNumber("ZK-001")
                .isActive(true)
                .build();
        device.setId(DEVICE_ID);
        device.setTenantId(TENANT_ID);

        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("ZK-001")
                .employeeIdentifier("EMP-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);

        when(deviceRepository.findBySerialNumberAndTenantIdAndIsDeletedFalse("ZK-001", TENANT_ID))
                .thenReturn(Optional.of(device));
        when(deviceRepository.save(any(BiometricDevice.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findByEmployeeCodeAndTenantId("EMP-001", TENANT_ID))
                .thenReturn(Optional.of(employee));
        when(punchLogRepository.existsDuplicatePunch(eq(TENANT_ID), eq(EMPLOYEE_ID), any(), any()))
                .thenReturn(true);
        when(punchLogRepository.save(any(BiometricPunchLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BiometricPunchLog result = service.receivePunch(TENANT_ID, request);

        assertThat(result.getProcessedStatus()).isEqualTo(BiometricPunchLog.ProcessedStatus.DUPLICATE);
    }

    @Test
    void receivePunch_unknownDevice_throws() {
        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("UNKNOWN")
                .employeeIdentifier("EMP-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        when(deviceRepository.findBySerialNumberAndTenantIdAndIsDeletedFalse("UNKNOWN", TENANT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.receivePunch(TENANT_ID, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown device serial");
    }

    @Test
    void receivePunch_inactiveDevice_throws() {
        BiometricDevice device = BiometricDevice.builder()
                .deviceName("Test")
                .serialNumber("ZK-001")
                .isActive(false)
                .build();
        device.setId(DEVICE_ID);
        device.setTenantId(TENANT_ID);

        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("ZK-001")
                .employeeIdentifier("EMP-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        when(deviceRepository.findBySerialNumberAndTenantIdAndIsDeletedFalse("ZK-001", TENANT_ID))
                .thenReturn(Optional.of(device));

        assertThatThrownBy(() -> service.receivePunch(TENANT_ID, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("deactivated");
    }

    @Test
    void receivePunch_unresolvedEmployee_marksFailed() {
        BiometricDevice device = BiometricDevice.builder()
                .deviceName("Test")
                .serialNumber("ZK-001")
                .isActive(true)
                .build();
        device.setId(DEVICE_ID);
        device.setTenantId(TENANT_ID);

        BiometricPunchRequest request = BiometricPunchRequest.builder()
                .deviceSerialNumber("ZK-001")
                .employeeIdentifier("GHOST-001")
                .punchTime(LocalDateTime.now())
                .punchType(BiometricPunchLog.PunchType.IN)
                .build();

        when(deviceRepository.findBySerialNumberAndTenantIdAndIsDeletedFalse("ZK-001", TENANT_ID))
                .thenReturn(Optional.of(device));
        when(deviceRepository.save(any(BiometricDevice.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findByEmployeeCodeAndTenantId("GHOST-001", TENANT_ID))
                .thenReturn(Optional.empty());
        when(punchLogRepository.save(any(BiometricPunchLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BiometricPunchLog result = service.receivePunch(TENANT_ID, request);

        assertThat(result.getProcessedStatus()).isEqualTo(BiometricPunchLog.ProcessedStatus.FAILED);
        assertThat(result.getErrorMessage()).contains("Unable to resolve employee");
    }

    // ─── API Key Tests ──────────────────────────────────────────────────────

    @Test
    void generateApiKey_returnsPlaintextOnce() {
        when(apiKeyRepository.save(any(BiometricApiKey.class)))
                .thenAnswer(inv -> {
                    BiometricApiKey k = inv.getArgument(0);
                    k.setId(UUID.randomUUID());
                    return k;
                });

        var response = service.generateApiKey("Test Key", null);

        assertThat(response.getPlaintextKey()).isNotNull();
        assertThat(response.getPlaintextKey()).startsWith("bio_");
        assertThat(response.getKeyName()).isEqualTo("Test Key");
        verify(apiKeyRepository).save(any(BiometricApiKey.class));
    }

    @Test
    void validateApiKey_valid() {
        BiometricApiKey apiKey = BiometricApiKey.builder()
                .keyHash("somehash")
                .keyName("Test")
                .isActive(true)
                .build();
        apiKey.setTenantId(TENANT_ID);
        apiKey.setId(UUID.randomUUID());

        when(apiKeyRepository.findByKeyHashAndIsActiveTrueAndIsDeletedFalse(anyString()))
                .thenReturn(Optional.of(apiKey));
        when(apiKeyRepository.save(any(BiometricApiKey.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Optional<BiometricApiKey> result = service.validateApiKey("any-key");

        assertThat(result).isPresent();
        assertThat(result.get().getTenantId()).isEqualTo(TENANT_ID);
    }

    @Test
    void validateApiKey_invalid_returnsEmpty() {
        when(apiKeyRepository.findByKeyHashAndIsActiveTrueAndIsDeletedFalse(anyString()))
                .thenReturn(Optional.empty());

        Optional<BiometricApiKey> result = service.validateApiKey("invalid-key");

        assertThat(result).isEmpty();
    }
}
