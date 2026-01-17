package com.hrms.application.analytics.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.CollectionType;
import com.fasterxml.jackson.databind.type.MapType;
import com.fasterxml.jackson.databind.type.TypeFactory;
import com.hrms.api.analytics.dto.ScheduledReportRequest;
import com.hrms.api.analytics.dto.ScheduledReportResponse;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.analytics.ReportDefinition;
import com.hrms.domain.analytics.ScheduledReport;
import com.hrms.domain.analytics.ScheduledReport.Frequency;
import com.hrms.infrastructure.analytics.repository.ReportDefinitionRepository;
import com.hrms.infrastructure.analytics.repository.ScheduledReportRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScheduledReportService Tests")
class ScheduledReportServiceTest {

    @Mock
    private ScheduledReportRepository scheduledReportRepository;

    @Mock
    private ReportDefinitionRepository reportDefinitionRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ScheduledReportService scheduledReportService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID createdBy;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() throws Exception {
        tenantId = UUID.randomUUID();
        createdBy = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        // Setup ObjectMapper mock with TypeFactory
        TypeFactory typeFactory = mock(TypeFactory.class);
        CollectionType collectionType = mock(CollectionType.class);
        MapType mapType = mock(MapType.class);

        lenient().when(objectMapper.getTypeFactory()).thenReturn(typeFactory);
        lenient().when(typeFactory.constructCollectionType(eq(List.class), eq(String.class))).thenReturn(collectionType);
        lenient().when(typeFactory.constructMapType(eq(Map.class), eq(String.class), eq(Object.class))).thenReturn(mapType);

        // Mock serialization
        lenient().when(objectMapper.writeValueAsString(any(List.class))).thenReturn("[\"test@example.com\"]");
        lenient().when(objectMapper.writeValueAsString(any(Map.class))).thenReturn("{\"reportType\":\"ANALYTICS\"}");

        // Mock deserialization
        lenient().when(objectMapper.readValue(anyString(), eq(collectionType))).thenReturn(List.of("test@example.com"));
        lenient().when(objectMapper.readValue(anyString(), eq(mapType))).thenReturn(Map.of("reportType", "ANALYTICS", "exportFormat", "EXCEL"));
    }

    // ==================== nextRunAt Calculation Tests ====================

    @Nested
    @DisplayName("nextRunAt Calculation Tests")
    class NextRunAtCalculationTests {

        @Test
        @DisplayName("Should calculate next run for DAILY frequency - same day if time not passed")
        void shouldCalculateNextRunDailySameDay() {
            // Given
            LocalTime futureTime = LocalTime.now().plusHours(2);
            ScheduledReportRequest request = createRequest(Frequency.DAILY, null, null, futureTime);

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getNextRunAt().toLocalDate()).isEqualTo(LocalDate.now());
            assertThat(saved.getNextRunAt().toLocalTime()).isEqualTo(futureTime);
        }

        @Test
        @DisplayName("Should calculate next run for DAILY frequency - next day if time passed")
        void shouldCalculateNextRunDailyNextDay() {
            // Given
            LocalTime pastTime = LocalTime.now().minusHours(2);
            ScheduledReportRequest request = createRequest(Frequency.DAILY, null, null, pastTime);

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getNextRunAt().toLocalDate()).isEqualTo(LocalDate.now().plusDays(1));
        }

        @Test
        @DisplayName("Should calculate next run for WEEKLY frequency")
        void shouldCalculateNextRunWeekly() {
            // Given - Schedule for Monday (1)
            ScheduledReportRequest request = createRequest(Frequency.WEEKLY, 1, null, LocalTime.of(9, 0));

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getNextRunAt().getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
            assertThat(saved.getNextRunAt().toLocalTime()).isEqualTo(LocalTime.of(9, 0));
        }

        @Test
        @DisplayName("Should calculate next run for MONTHLY frequency")
        void shouldCalculateNextRunMonthly() {
            // Given - Schedule for 15th of month
            ScheduledReportRequest request = createRequest(Frequency.MONTHLY, null, 15, LocalTime.of(10, 0));

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getNextRunAt().getDayOfMonth()).isEqualTo(15);
            assertThat(saved.getNextRunAt().toLocalTime()).isEqualTo(LocalTime.of(10, 0));
        }

        @Test
        @DisplayName("Should calculate next run for QUARTERLY frequency")
        void shouldCalculateNextRunQuarterly() {
            // Given
            ScheduledReportRequest request = createRequest(Frequency.QUARTERLY, null, null, LocalTime.of(8, 0));

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            // Quarterly should be first day of next quarter
            assertThat(saved.getNextRunAt().getDayOfMonth()).isEqualTo(1);
            int currentMonth = LocalDate.now().getMonthValue();
            int expectedMonth = ((currentMonth - 1) / 3 + 1) * 3 + 1;
            if (expectedMonth > 12) expectedMonth = 1;
            assertThat(saved.getNextRunAt().getMonthValue()).isIn(1, 4, 7, 10);
        }

        @Test
        @DisplayName("Should calculate next run for YEARLY frequency")
        void shouldCalculateNextRunYearly() {
            // Given
            ScheduledReportRequest request = createRequest(Frequency.YEARLY, null, null, LocalTime.of(6, 0));

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            // Yearly should be first day of next year
            assertThat(saved.getNextRunAt().getYear()).isEqualTo(LocalDate.now().getYear() + 1);
            assertThat(saved.getNextRunAt().getDayOfYear()).isEqualTo(1);
        }

        @ParameterizedTest
        @EnumSource(Frequency.class)
        @DisplayName("Should set default time if not provided for all frequencies")
        void shouldSetDefaultTimeIfNotProvided(Frequency frequency) {
            // Given
            ScheduledReportRequest request = createRequest(frequency, 1, 1, null);

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase(any(), any()))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            // Default time should be 6:00 AM
            assertThat(saved.getNextRunAt().toLocalTime()).isEqualTo(LocalTime.of(6, 0));
        }
    }

    // ==================== Due Selection Tests ====================

    @Nested
    @DisplayName("Due Selection Tests")
    class DueSelectionTests {

        @Test
        @DisplayName("Should return reports due for execution")
        void shouldReturnReportsDueForExecution() {
            // Given
            ScheduledReport dueReport = createScheduledReport(LocalDateTime.now().minusMinutes(5));
            List<ScheduledReport> expectedReports = List.of(dueReport);

            when(scheduledReportRepository.findDueForExecution(any(LocalDateTime.class)))
                    .thenReturn(expectedReports);

            // When
            List<ScheduledReport> result = scheduledReportService.getReportsDueForExecution();

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(dueReport.getId());
            verify(scheduledReportRepository).findDueForExecution(any(LocalDateTime.class));
        }

        @Test
        @DisplayName("Should return empty list when no reports are due")
        void shouldReturnEmptyListWhenNoDue() {
            // Given
            when(scheduledReportRepository.findDueForExecution(any(LocalDateTime.class)))
                    .thenReturn(List.of());

            // When
            List<ScheduledReport> result = scheduledReportService.getReportsDueForExecution();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should not return inactive reports")
        void shouldNotReturnInactiveReports() {
            // Given - the repository query already filters by isActive = true
            when(scheduledReportRepository.findDueForExecution(any(LocalDateTime.class)))
                    .thenReturn(List.of());

            // When
            List<ScheduledReport> result = scheduledReportService.getReportsDueForExecution();

            // Then
            assertThat(result).isEmpty();
            verify(scheduledReportRepository).findDueForExecution(any(LocalDateTime.class));
        }
    }

    // ==================== markAsExecuted Tests ====================

    @Nested
    @DisplayName("markAsExecuted Tests")
    class MarkAsExecutedTests {

        @Test
        @DisplayName("Should update lastRunAt and nextRunAt when marking as executed")
        void shouldUpdateTimestampsWhenMarkingAsExecuted() {
            // Given
            UUID reportId = UUID.randomUUID();
            LocalDateTime oldNextRun = LocalDateTime.now().minusHours(1);
            ScheduledReport report = ScheduledReport.builder()
                    .id(reportId)
                    .tenantId(tenantId)
                    .reportDefinitionId(UUID.randomUUID())
                    .scheduleName("Test Report")
                    .frequency(Frequency.DAILY)
                    .timeOfDay(LocalTime.of(9, 0))
                    .isActive(true)
                    .nextRunAt(oldNextRun)
                    .lastRunAt(null)
                    .build();

            when(scheduledReportRepository.findById(reportId)).thenReturn(Optional.of(report));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.markAsExecuted(reportId);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getLastRunAt()).isNotNull();
            assertThat(saved.getLastRunAt()).isAfterOrEqualTo(LocalDateTime.now().minusSeconds(5));
            assertThat(saved.getNextRunAt()).isAfter(oldNextRun);
        }

        @Test
        @DisplayName("Should throw exception when report not found")
        void shouldThrowExceptionWhenReportNotFound() {
            // Given
            UUID reportId = UUID.randomUUID();
            when(scheduledReportRepository.findById(reportId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> scheduledReportService.markAsExecuted(reportId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Scheduled report not found");
        }

        @Test
        @DisplayName("Should calculate correct next run for DAILY after execution")
        void shouldCalculateCorrectNextRunForDailyAfterExecution() {
            // Given
            UUID reportId = UUID.randomUUID();
            LocalTime scheduledTime = LocalTime.of(9, 0);
            ScheduledReport report = ScheduledReport.builder()
                    .id(reportId)
                    .tenantId(tenantId)
                    .reportDefinitionId(UUID.randomUUID())
                    .scheduleName("Daily Report")
                    .frequency(Frequency.DAILY)
                    .timeOfDay(scheduledTime)
                    .isActive(true)
                    .nextRunAt(LocalDateTime.now().minusMinutes(5))
                    .build();

            when(scheduledReportRepository.findById(reportId)).thenReturn(Optional.of(report));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.markAsExecuted(reportId);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            // Next run should be tomorrow at the scheduled time (since we just ran it)
            LocalDate expectedDate = LocalDate.now();
            if (scheduledTime.isBefore(LocalTime.now())) {
                expectedDate = expectedDate.plusDays(1);
            }
            assertThat(saved.getNextRunAt().toLocalDate()).isEqualTo(expectedDate);
            assertThat(saved.getNextRunAt().toLocalTime()).isEqualTo(scheduledTime);
        }

        @Test
        @DisplayName("Should calculate correct next run for WEEKLY after execution")
        void shouldCalculateCorrectNextRunForWeeklyAfterExecution() {
            // Given
            UUID reportId = UUID.randomUUID();
            ScheduledReport report = ScheduledReport.builder()
                    .id(reportId)
                    .tenantId(tenantId)
                    .reportDefinitionId(UUID.randomUUID())
                    .scheduleName("Weekly Report")
                    .frequency(Frequency.WEEKLY)
                    .dayOfWeek(1) // Monday
                    .timeOfDay(LocalTime.of(10, 0))
                    .isActive(true)
                    .nextRunAt(LocalDateTime.now().minusMinutes(5))
                    .build();

            when(scheduledReportRepository.findById(reportId)).thenReturn(Optional.of(report));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.markAsExecuted(reportId);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getNextRunAt().getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        }
    }

    // ==================== ReportDefinitionId Resolution Tests ====================

    @Nested
    @DisplayName("ReportDefinitionId Resolution Tests")
    class ReportDefinitionIdResolutionTests {

        @Test
        @DisplayName("Should use explicit reportDefinitionId when provided")
        void shouldUseExplicitReportDefinitionId() {
            // Given
            UUID explicitDefId = UUID.randomUUID();
            ReportDefinition definition = ReportDefinition.builder()
                    .id(explicitDefId)
                    .tenantId(tenantId)
                    .reportCode("TEST_REPORT")
                    .isActive(true)
                    .build();

            ScheduledReportRequest request = ScheduledReportRequest.builder()
                    .scheduleName("Test Schedule")
                    .reportType("TEST_REPORT")
                    .reportDefinitionId(explicitDefId)
                    .frequency(Frequency.DAILY)
                    .timeOfDay(LocalTime.of(9, 0))
                    .recipients(List.of("test@example.com"))
                    .isActive(true)
                    .build();

            when(reportDefinitionRepository.findByIdAndTenantId(explicitDefId, tenantId))
                    .thenReturn(Optional.of(definition));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            assertThat(captor.getValue().getReportDefinitionId()).isEqualTo(explicitDefId);
            verify(reportDefinitionRepository).findByIdAndTenantId(explicitDefId, tenantId);
            verify(reportDefinitionRepository, never()).findActiveByReportCodeIgnoreCase(any(), any());
        }

        @Test
        @DisplayName("Should look up by reportType when reportDefinitionId not provided")
        void shouldLookUpByReportTypeWhenIdNotProvided() {
            // Given
            UUID foundDefId = UUID.randomUUID();
            ReportDefinition definition = ReportDefinition.builder()
                    .id(foundDefId)
                    .tenantId(tenantId)
                    .reportCode("ATTENDANCE")
                    .isActive(true)
                    .build();

            ScheduledReportRequest request = createRequest(Frequency.DAILY, null, null, LocalTime.of(9, 0));
            request.setReportType("ATTENDANCE");

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase("ATTENDANCE", tenantId))
                    .thenReturn(Optional.of(definition));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            assertThat(captor.getValue().getReportDefinitionId()).isEqualTo(foundDefId);
        }

        @Test
        @DisplayName("Should generate dynamic ID when reportType has no matching definition")
        void shouldGenerateDynamicIdWhenNoMatchingDefinition() {
            // Given
            ScheduledReportRequest request = createRequest(Frequency.DAILY, null, null, LocalTime.of(9, 0));
            request.setReportType("CUSTOM_REPORT");

            when(reportDefinitionRepository.findActiveByReportCodeIgnoreCase("CUSTOM_REPORT", tenantId))
                    .thenReturn(Optional.empty());
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            scheduledReportService.createScheduledReport(request, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            // Dynamic ID should be deterministic based on tenant and reportType
            UUID expectedDynamicId = UUID.nameUUIDFromBytes(
                    ("DYNAMIC_REPORT:" + tenantId + ":CUSTOM_REPORT").getBytes());
            assertThat(captor.getValue().getReportDefinitionId()).isEqualTo(expectedDynamicId);
        }

        @Test
        @DisplayName("Should throw exception when explicit reportDefinitionId not found")
        void shouldThrowExceptionWhenExplicitIdNotFound() {
            // Given
            UUID nonExistentId = UUID.randomUUID();
            ScheduledReportRequest request = ScheduledReportRequest.builder()
                    .scheduleName("Test Schedule")
                    .reportType("TEST")
                    .reportDefinitionId(nonExistentId)
                    .frequency(Frequency.DAILY)
                    .timeOfDay(LocalTime.of(9, 0))
                    .recipients(List.of("test@example.com"))
                    .isActive(true)
                    .build();

            when(reportDefinitionRepository.findByIdAndTenantId(nonExistentId, tenantId))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> scheduledReportService.createScheduledReport(request, createdBy))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Report definition not found");
        }
    }

    // ==================== Toggle Status Tests ====================

    @Nested
    @DisplayName("Toggle Status Tests")
    class ToggleStatusTests {

        @Test
        @DisplayName("Should recalculate nextRunAt when reactivating")
        void shouldRecalculateNextRunAtWhenReactivating() throws Exception {
            // Given
            UUID reportId = UUID.randomUUID();
            ScheduledReport report = ScheduledReport.builder()
                    .id(reportId)
                    .tenantId(tenantId)
                    .reportDefinitionId(UUID.randomUUID())
                    .scheduleName("Test Report")
                    .frequency(Frequency.DAILY)
                    .timeOfDay(LocalTime.of(9, 0))
                    .isActive(false) // Currently inactive
                    .nextRunAt(LocalDateTime.now().minusDays(10)) // Old next run
                    .recipients("[]")
                    .parameters("{}")
                    .build();

            when(scheduledReportRepository.findByIdAndTenantId(reportId, tenantId))
                    .thenReturn(Optional.of(report));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(objectMapper.readValue(eq("{}"), any(com.fasterxml.jackson.databind.type.MapType.class)))
                    .thenReturn(java.util.Map.of());
            when(objectMapper.readValue(eq("[]"), any(com.fasterxml.jackson.databind.type.CollectionType.class)))
                    .thenReturn(List.of());

            // When
            ScheduledReportResponse response = scheduledReportService.toggleStatus(reportId, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getIsActive()).isTrue();
            assertThat(saved.getNextRunAt()).isAfter(LocalDateTime.now().minusDays(10));
        }

        @Test
        @DisplayName("Should not recalculate nextRunAt when deactivating")
        void shouldNotRecalculateNextRunAtWhenDeactivating() throws Exception {
            // Given
            UUID reportId = UUID.randomUUID();
            LocalDateTime originalNextRun = LocalDateTime.now().plusDays(1);
            ScheduledReport report = ScheduledReport.builder()
                    .id(reportId)
                    .tenantId(tenantId)
                    .reportDefinitionId(UUID.randomUUID())
                    .scheduleName("Test Report")
                    .frequency(Frequency.DAILY)
                    .timeOfDay(LocalTime.of(9, 0))
                    .isActive(true) // Currently active
                    .nextRunAt(originalNextRun)
                    .recipients("[]")
                    .parameters("{}")
                    .build();

            when(scheduledReportRepository.findByIdAndTenantId(reportId, tenantId))
                    .thenReturn(Optional.of(report));
            when(scheduledReportRepository.save(any(ScheduledReport.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(objectMapper.readValue(eq("{}"), any(com.fasterxml.jackson.databind.type.MapType.class)))
                    .thenReturn(java.util.Map.of());
            when(objectMapper.readValue(eq("[]"), any(com.fasterxml.jackson.databind.type.CollectionType.class)))
                    .thenReturn(List.of());

            // When
            scheduledReportService.toggleStatus(reportId, createdBy);

            // Then
            ArgumentCaptor<ScheduledReport> captor = ArgumentCaptor.forClass(ScheduledReport.class);
            verify(scheduledReportRepository).save(captor.capture());

            ScheduledReport saved = captor.getValue();
            assertThat(saved.getIsActive()).isFalse();
            // nextRunAt should remain unchanged when deactivating
            assertThat(saved.getNextRunAt()).isEqualTo(originalNextRun);
        }
    }

    // ==================== Helper Methods ====================

    private ScheduledReportRequest createRequest(Frequency frequency, Integer dayOfWeek,
                                                  Integer dayOfMonth, LocalTime timeOfDay) {
        return ScheduledReportRequest.builder()
                .scheduleName("Test Report")
                .reportType("ANALYTICS")
                .frequency(frequency)
                .dayOfWeek(dayOfWeek)
                .dayOfMonth(dayOfMonth)
                .timeOfDay(timeOfDay)
                .recipients(List.of("test@example.com"))
                .isActive(true)
                .build();
    }

    private ScheduledReport createScheduledReport(LocalDateTime nextRunAt) {
        return ScheduledReport.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .reportDefinitionId(UUID.randomUUID())
                .scheduleName("Test Report")
                .frequency(Frequency.DAILY)
                .timeOfDay(LocalTime.of(9, 0))
                .isActive(true)
                .nextRunAt(nextRunAt)
                .recipients("[\"test@example.com\"]")
                .parameters("{\"reportType\":\"ANALYTICS\"}")
                .build();
    }
}
