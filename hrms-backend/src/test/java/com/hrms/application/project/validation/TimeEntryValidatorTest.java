package com.hrms.application.project.validation;

import com.hrms.domain.project.TimeEntry;
import com.hrms.infrastructure.project.repository.TimeEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimeEntryValidatorTest {

    @Mock
    private TimeEntryRepository timeEntryRepository;

    @InjectMocks
    private TimeEntryValidator validator;

    private UUID tenantId;
    private UUID employeeId;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        projectId = UUID.randomUUID();
    }

    @Test
    void validate_ShouldReturnNoErrors_WhenValidRequest() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        LocalDate.now(),
                        new BigDecimal("8.00"),
                        true,
                        new BigDecimal("100.00")
                );

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), any(), any()))
                .thenReturn(new ArrayList<>());

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).isEmpty();
    }

    @Test
    void validate_ShouldReturnErrors_WhenRequiredFieldsMissing() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        null,
                        null,
                        null,
                        null,
                        true,
                        new BigDecimal("100.00")
                );

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).hasSize(4);
        assertThat(errors).contains("Employee ID is required");
        assertThat(errors).contains("Project ID is required");
        assertThat(errors).contains("Work date is required");
        assertThat(errors).contains("Hours worked is required");
    }

    @Test
    void validate_ShouldReturnError_WhenHoursExceed24() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        LocalDate.now(),
                        new BigDecimal("25.00"),
                        true,
                        new BigDecimal("100.00")
                );

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), any(), any()))
                .thenReturn(new ArrayList<>());

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).isNotEmpty();
        assertThat(errors).contains("Hours worked cannot exceed 24 hours");
    }

    @Test
    void validate_ShouldReturnError_WhenHoursNegative() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        LocalDate.now(),
                        new BigDecimal("-1.00"),
                        true,
                        new BigDecimal("100.00")
                );

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), any(), any()))
                .thenReturn(new ArrayList<>());

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).hasSize(1);
        assertThat(errors).contains("Hours worked must be greater than 0");
    }

    @Test
    void validate_ShouldReturnError_WhenDateInFuture() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        LocalDate.now().plusDays(1),
                        new BigDecimal("8.00"),
                        true,
                        new BigDecimal("100.00")
                );

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), any(), any()))
                .thenReturn(new ArrayList<>());

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).hasSize(1);
        assertThat(errors).contains("Cannot log time for future dates");
    }

    @Test
    void validate_ShouldReturnError_WhenDateTooOld() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        LocalDate.now().minusMonths(4),
                        new BigDecimal("8.00"),
                        true,
                        new BigDecimal("100.00")
                );

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), any(), any()))
                .thenReturn(new ArrayList<>());

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).hasSize(1);
        assertThat(errors).contains("Cannot log time older than 3 months");
    }

    @Test
    void validate_ShouldReturnError_WhenTotalDailyHoursExceed24() {
        // Given
        LocalDate workDate = LocalDate.now();
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        workDate,
                        new BigDecimal("16.00"),
                        true,
                        new BigDecimal("100.00")
                );

        // Mock existing entry with 10 hours
        TimeEntry existingEntry = new TimeEntry();
        existingEntry.setId(UUID.randomUUID());
        existingEntry.setEmployeeId(employeeId);
        existingEntry.setWorkDate(workDate);
        existingEntry.setHoursWorked(new BigDecimal("10.00"));
        existingEntry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), eq(workDate), eq(workDate)))
                .thenReturn(List.of(existingEntry));

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0)).contains("Total hours").contains("exceeds the maximum of 24 hours");
    }

    @Test
    void validate_ShouldReturnError_WhenNegativeBillingRate() {
        // Given
        TimeEntryValidator.TimeEntryValidationRequest request =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        projectId,
                        LocalDate.now(),
                        new BigDecimal("8.00"),
                        true,
                        new BigDecimal("-100.00")
                );

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), any(), any()))
                .thenReturn(new ArrayList<>());

        // When
        List<String> errors = validator.validate(request, tenantId, null);

        // Then
        assertThat(errors).hasSize(1);
        assertThat(errors).contains("Billing rate cannot be negative");
    }

    @Test
    void calculateOvertimeHours_ShouldReturnZero_WhenNoOvertime() {
        // Given
        LocalDate workDate = LocalDate.now();
        TimeEntry entry = new TimeEntry();
        entry.setId(UUID.randomUUID());
        entry.setEmployeeId(employeeId);
        entry.setWorkDate(workDate);
        entry.setHoursWorked(new BigDecimal("7.00"));
        entry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), eq(workDate), eq(workDate)))
                .thenReturn(List.of(entry));

        // When
        BigDecimal overtime = validator.calculateOvertimeHours(employeeId, workDate, tenantId);

        // Then
        assertThat(overtime).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void calculateOvertimeHours_ShouldReturnCorrectAmount_WhenOvertime() {
        // Given
        LocalDate workDate = LocalDate.now();
        TimeEntry entry = new TimeEntry();
        entry.setId(UUID.randomUUID());
        entry.setEmployeeId(employeeId);
        entry.setWorkDate(workDate);
        entry.setHoursWorked(new BigDecimal("10.00"));
        entry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);

        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                eq(tenantId), eq(employeeId), eq(workDate), eq(workDate)))
                .thenReturn(List.of(entry));

        // When
        BigDecimal overtime = validator.calculateOvertimeHours(employeeId, workDate, tenantId);

        // Then
        assertThat(overtime).isEqualByComparingTo(new BigDecimal("2.00"));
    }

    @Test
    void canModifyEntry_ShouldReturnTrue_ForDraftStatus() {
        // Given
        TimeEntry entry = new TimeEntry();
        entry.setStatus(TimeEntry.TimeEntryStatus.DRAFT);

        // When
        boolean canModify = validator.canModifyEntry(entry);

        // Then
        assertThat(canModify).isTrue();
    }

    @Test
    void canModifyEntry_ShouldReturnTrue_ForRejectedStatus() {
        // Given
        TimeEntry entry = new TimeEntry();
        entry.setStatus(TimeEntry.TimeEntryStatus.REJECTED);

        // When
        boolean canModify = validator.canModifyEntry(entry);

        // Then
        assertThat(canModify).isTrue();
    }

    @Test
    void canModifyEntry_ShouldReturnFalse_ForApprovedStatus() {
        // Given
        TimeEntry entry = new TimeEntry();
        entry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);

        // When
        boolean canModify = validator.canModifyEntry(entry);

        // Then
        assertThat(canModify).isFalse();
    }

    @Test
    void canDeleteEntry_ShouldReturnTrue_OnlyForDraftStatus() {
        // Given
        TimeEntry draftEntry = new TimeEntry();
        draftEntry.setStatus(TimeEntry.TimeEntryStatus.DRAFT);

        TimeEntry approvedEntry = new TimeEntry();
        approvedEntry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);

        // When & Then
        assertThat(validator.canDeleteEntry(draftEntry)).isTrue();
        assertThat(validator.canDeleteEntry(approvedEntry)).isFalse();
    }
}
