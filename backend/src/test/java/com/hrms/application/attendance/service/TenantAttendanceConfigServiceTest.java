package com.hrms.application.attendance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.attendance.service.TenantAttendanceConfigService.TenantAttendanceConfig;
import com.hrms.domain.tenant.Tenant;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TenantAttendanceConfigService Tests")
class TenantAttendanceConfigServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private TenantAttendanceConfigService service;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("getConfig")
    class GetConfigTests {

        @Test
        @DisplayName("Should return defaults when tenant not found")
        void shouldReturnDefaultsWhenTenantNotFound() {
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

            TenantAttendanceConfig config = service.getConfig(tenantId);

            assertThat(config.fullDayMinutes()).isEqualTo(480);
            assertThat(config.halfDayMinutes()).isEqualTo(240);
            assertThat(config.overtimeThresholdMinutes()).isEqualTo(540);
            assertThat(config.standardWorkHours()).isEqualByComparingTo(BigDecimal.valueOf(8.00));
        }

        @Test
        @DisplayName("Should return defaults when tenant settings is null")
        void shouldReturnDefaultsWhenSettingsNull() {
            Tenant tenant = Tenant.builder().code("TEST").name("Test").build();
            tenant.setId(tenantId);
            tenant.setSettings(null);
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            TenantAttendanceConfig config = service.getConfig(tenantId);

            assertThat(config.fullDayMinutes()).isEqualTo(480);
            assertThat(config.halfDayMinutes()).isEqualTo(240);
        }

        @Test
        @DisplayName("Should return defaults when settings has no attendance key")
        void shouldReturnDefaultsWhenNoAttendanceKey() {
            Tenant tenant = Tenant.builder().code("TEST").name("Test").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"other\": \"value\"}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            TenantAttendanceConfig config = service.getConfig(tenantId);

            assertThat(config.fullDayMinutes()).isEqualTo(480);
        }

        @Test
        @DisplayName("Should parse custom attendance config from tenant settings")
        void shouldParseCustomConfig() {
            Tenant tenant = Tenant.builder().code("CUSTOM").name("Custom").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"attendance\": {\"fullDayMinutes\": 450, \"halfDayMinutes\": 225, " +
                    "\"overtimeThresholdMinutes\": 510, \"standardWorkHours\": 7.5}}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            TenantAttendanceConfig config = service.getConfig(tenantId);

            assertThat(config.fullDayMinutes()).isEqualTo(450);
            assertThat(config.halfDayMinutes()).isEqualTo(225);
            assertThat(config.overtimeThresholdMinutes()).isEqualTo(510);
            assertThat(config.standardWorkHours()).isEqualByComparingTo(BigDecimal.valueOf(7.5));
        }

        @Test
        @DisplayName("Should use defaults for missing fields in partial config")
        void shouldUseDefaultsForMissingFields() {
            Tenant tenant = Tenant.builder().code("PARTIAL").name("Partial").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"attendance\": {\"fullDayMinutes\": 420}}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            TenantAttendanceConfig config = service.getConfig(tenantId);

            assertThat(config.fullDayMinutes()).isEqualTo(420);
            assertThat(config.halfDayMinutes()).isEqualTo(240); // default
            assertThat(config.overtimeThresholdMinutes()).isEqualTo(540); // default
            assertThat(config.standardWorkHours()).isEqualByComparingTo(BigDecimal.valueOf(8.00)); // default
        }

        @Test
        @DisplayName("Should return defaults on malformed JSON")
        void shouldReturnDefaultsOnMalformedJson() {
            Tenant tenant = Tenant.builder().code("BAD").name("Bad").build();
            tenant.setId(tenantId);
            tenant.setSettings("{invalid json");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            TenantAttendanceConfig config = service.getConfig(tenantId);

            assertThat(config.fullDayMinutes()).isEqualTo(480);
            assertThat(config.halfDayMinutes()).isEqualTo(240);
        }
    }

    @Nested
    @DisplayName("Convenience accessors")
    class ConvenienceAccessorTests {

        @Test
        @DisplayName("getFullDayMinutes returns tenant-specific value")
        void shouldReturnTenantFullDayMinutes() {
            Tenant tenant = Tenant.builder().code("T1").name("T1").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"attendance\": {\"fullDayMinutes\": 450}}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            assertThat(service.getFullDayMinutes(tenantId)).isEqualTo(450);
        }

        @Test
        @DisplayName("getHalfDayMinutes returns tenant-specific value")
        void shouldReturnTenantHalfDayMinutes() {
            Tenant tenant = Tenant.builder().code("T2").name("T2").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"attendance\": {\"halfDayMinutes\": 200}}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            assertThat(service.getHalfDayMinutes(tenantId)).isEqualTo(200);
        }

        @Test
        @DisplayName("getOvertimeThresholdMinutes returns tenant-specific value")
        void shouldReturnTenantOvertimeThreshold() {
            Tenant tenant = Tenant.builder().code("T3").name("T3").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"attendance\": {\"overtimeThresholdMinutes\": 600}}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            assertThat(service.getOvertimeThresholdMinutes(tenantId)).isEqualTo(600);
        }

        @Test
        @DisplayName("getStandardWorkHours returns tenant-specific value")
        void shouldReturnTenantStandardWorkHours() {
            Tenant tenant = Tenant.builder().code("T4").name("T4").build();
            tenant.setId(tenantId);
            tenant.setSettings("{\"attendance\": {\"standardWorkHours\": 9.0}}");
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            assertThat(service.getStandardWorkHours(tenantId)).isEqualByComparingTo(BigDecimal.valueOf(9.0));
        }
    }

    @Nested
    @DisplayName("TenantAttendanceConfig record")
    class ConfigRecordTests {

        @Test
        @DisplayName("defaults() returns expected values")
        void defaultsShouldReturnExpectedValues() {
            TenantAttendanceConfig defaults = TenantAttendanceConfig.defaults();

            assertThat(defaults.fullDayMinutes()).isEqualTo(480);
            assertThat(defaults.halfDayMinutes()).isEqualTo(240);
            assertThat(defaults.overtimeThresholdMinutes()).isEqualTo(540);
            assertThat(defaults.standardWorkHours()).isEqualByComparingTo(BigDecimal.valueOf(8.00));
        }
    }
}
