package com.hrms.application.timetracking.service;

import com.hrms.api.timetracking.dto.CreateTimeEntryRequest;
import com.hrms.api.timetracking.dto.TimeEntryDto;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.timetracking.TimeEntry;
import com.hrms.domain.timetracking.TimeEntry.EntryType;
import com.hrms.domain.timetracking.TimeEntry.TimeEntryStatus;
import com.hrms.infrastructure.timetracking.repository.TimeEntryRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TimeTrackingService Tests")
class TimeTrackingServiceTest {

    @Mock
    private TimeEntryRepository timeEntryRepository;

    @InjectMocks
    private TimeTrackingService timeTrackingService;

    private UUID tenantId;
    private UUID employeeId;
    private UUID entryId;
    private UUID projectId;
    private TimeEntry testTimeEntry;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        entryId = UUID.randomUUID();
        projectId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(employeeId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

        testTimeEntry = TimeEntry.builder()
                .id(entryId)
                .employeeId(employeeId)
                .projectId(projectId)
                .taskId(UUID.randomUUID())
                .entryDate(LocalDate.of(2024, 3, 17))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .hoursWorked(new BigDecimal("8.0"))
                .billableHours(new BigDecimal("8.0"))
                .isBillable(true)
                .hourlyRate(new BigDecimal("100"))
                .entryType(EntryType.REGULAR)
                .description("Development work")
                .notes("Completed feature X")
                .status(TimeEntryStatus.DRAFT)
                .build();
        testTimeEntry.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("CreateEntry Tests")
    class CreateEntryTests {

        @Test
        @DisplayName("Should create time entry successfully")
        void shouldCreateEntrySuccessfully() {
            // Arrange
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .taskId(UUID.randomUUID())
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .isBillable(true)
                    .hourlyRate(new BigDecimal("100"))
                    .description("Development work")
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> {
                        TimeEntry entry = invocation.getArgument(0);
                        entry.setId(UUID.randomUUID());
                        return entry;
                    });

            // Act
            TimeEntryDto result = timeTrackingService.createEntry(request);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            TimeEntryDto::getEntryDate,
                            TimeEntryDto::getDescription
                    )
                    .containsExactly(
                            LocalDate.of(2024, 3, 17),
                            "Development work"
                    );

            verify(timeEntryRepository, times(1)).save(any(TimeEntry.class));
        }

        @Test
        @DisplayName("Should set status to DRAFT when creating entry")
        void shouldSetStatusToDraft() {
            // Arrange
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> {
                        TimeEntry entry = invocation.getArgument(0);
                        entry.setId(UUID.randomUUID());
                        return entry;
                    });

            // Act
            TimeEntryDto result = timeTrackingService.createEntry(request);

            // Assert
            assertThat(result.getStatus()).isEqualTo("DRAFT");
        }

        @Test
        @DisplayName("Should use billable hours from request if provided")
        void shouldUseBillableHoursFromRequest() {
            // Arrange
            BigDecimal billableHours = new BigDecimal("6.0");
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .billableHours(billableHours)
                    .isBillable(true)
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            timeTrackingService.createEntry(request);

            // Assert
            verify(timeEntryRepository, times(1)).save(argThat(entry ->
                    entry.getBillableHours().equals(billableHours)
            ));
        }

        @Test
        @DisplayName("Should default billable hours to hours worked if not provided")
        void shouldDefaultBillableHours() {
            // Arrange
            BigDecimal hoursWorked = new BigDecimal("8.0");
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(hoursWorked)
                    .billableHours(null)
                    .isBillable(true)
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            timeTrackingService.createEntry(request);

            // Assert
            verify(timeEntryRepository, times(1)).save(argThat(entry ->
                    entry.getBillableHours().equals(hoursWorked)
            ));
        }

        @Test
        @DisplayName("Should default isBillable to false if not specified")
        void shouldDefaultIsBillableToFalse() {
            // Arrange
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .isBillable(null)
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            timeTrackingService.createEntry(request);

            // Assert
            verify(timeEntryRepository, times(1)).save(argThat(entry ->
                    !entry.getIsBillable()
            ));
        }

        @Test
        @DisplayName("Should set tenant ID when creating entry")
        void shouldSetTenantId() {
            // Arrange
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            timeTrackingService.createEntry(request);

            // Assert
            verify(timeEntryRepository, times(1)).save(argThat(entry ->
                    entry.getTenantId().equals(tenantId)
            ));
        }

        @Test
        @DisplayName("Should set employee ID from current security context")
        void shouldSetEmployeeId() {
            // Arrange
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 17))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .build();

            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            timeTrackingService.createEntry(request);

            // Assert
            verify(timeEntryRepository, times(1)).save(argThat(entry ->
                    entry.getEmployeeId().equals(employeeId)
            ));
        }
    }

    @Nested
    @DisplayName("UpdateEntry Tests")
    class UpdateEntryTests {

        @Test
        @DisplayName("Should update entry in DRAFT status")
        void shouldUpdateDraftEntry() {
            // Arrange
            testTimeEntry.setStatus(TimeEntryStatus.DRAFT);

            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(UUID.randomUUID())
                    .taskId(UUID.randomUUID())
                    .entryDate(LocalDate.of(2024, 3, 18))
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(18, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .isBillable(true)
                    .description("Updated description")
                    .build();

            when(timeEntryRepository.findByIdAndTenantId(entryId, tenantId))
                    .thenReturn(Optional.of(testTimeEntry));
            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            TimeEntryDto result = timeTrackingService.updateEntry(entryId, request);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(TimeEntryDto::getDescription)
                    .isEqualTo("Updated description");

            verify(timeEntryRepository, times(1)).findByIdAndTenantId(entryId, tenantId);
            verify(timeEntryRepository, times(1)).save(any(TimeEntry.class));
        }

        @Test
        @DisplayName("Should throw exception when updating non-DRAFT/REJECTED entry")
        void shouldThrowExceptionWhenUpdatingApprovedEntry() {
            // Arrange
            testTimeEntry.setStatus(TimeEntryStatus.APPROVED);

            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 18))
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(18, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .build();

            when(timeEntryRepository.findByIdAndTenantId(entryId, tenantId))
                    .thenReturn(Optional.of(testTimeEntry));

            // Act & Assert
            assertThatThrownBy(() -> timeTrackingService.updateEntry(entryId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot update entry in status");

            verify(timeEntryRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should allow updating REJECTED entry")
        void shouldAllowUpdatingRejectedEntry() {
            // Arrange
            testTimeEntry.setStatus(TimeEntryStatus.REJECTED);

            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 18))
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(18, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .isBillable(true)
                    .description("Resubmitted")
                    .build();

            when(timeEntryRepository.findByIdAndTenantId(entryId, tenantId))
                    .thenReturn(Optional.of(testTimeEntry));
            when(timeEntryRepository.save(any(TimeEntry.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            timeTrackingService.updateEntry(entryId, request);

            // Assert
            verify(timeEntryRepository, times(1)).save(any(TimeEntry.class));
        }

        @Test
        @DisplayName("Should throw exception when entry not found")
        void shouldThrowExceptionWhenEntryNotFound() {
            // Arrange
            CreateTimeEntryRequest request = CreateTimeEntryRequest.builder()
                    .projectId(projectId)
                    .entryDate(LocalDate.of(2024, 3, 18))
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(18, 0))
                    .hoursWorked(new BigDecimal("8.0"))
                    .build();

            when(timeEntryRepository.findByIdAndTenantId(entryId, tenantId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> timeTrackingService.updateEntry(entryId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Time entry not found");

            verify(timeEntryRepository, never()).save(any());
        }
    }
}
