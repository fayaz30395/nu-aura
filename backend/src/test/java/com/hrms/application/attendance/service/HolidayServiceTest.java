package com.hrms.application.attendance.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.Holiday;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
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

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HolidayService Tests")
class HolidayServiceTest {

    @Mock
    private HolidayRepository holidayRepository;

    @InjectMocks
    private HolidayService holidayService;

    private UUID tenantId;
    private UUID holidayId;
    private Holiday testHoliday;
    private LocalDate holidayDate;

    private static MockedStatic<TenantContext> tenantContextMock;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        holidayId = UUID.randomUUID();
        holidayDate = LocalDate.of(2024, 1, 26); // Republic Day

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        testHoliday = Holiday.builder()
                .id(holidayId)
                .holidayName("Republic Day")
                .holidayDate(holidayDate)
                .holidayType("NATIONAL")
                .description("Indian Republic Day")
                .isOptional(false)
                .isRestricted(false)
                .build();
        testHoliday.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("CreateHoliday Tests")
    class CreateHolidayTests {

        @Test
        @DisplayName("Should create holiday successfully")
        void shouldCreateHolidaySuccessfully() {
            // Arrange
            Holiday newHoliday = Holiday.builder()
                    .holidayName("Independence Day")
                    .holidayDate(LocalDate.of(2024, 8, 15))
                    .holidayType("NATIONAL")
                    .description("Indian Independence Day")
                    .isOptional(false)
                    .isRestricted(false)
                    .build();

            when(holidayRepository.existsByTenantIdAndHolidayDate(
                    tenantId, LocalDate.of(2024, 8, 15)))
                    .thenReturn(false);
            when(holidayRepository.save(any(Holiday.class)))
                    .thenAnswer(invocation -> {
                        Holiday holiday = invocation.getArgument(0);
                        holiday.setId(UUID.randomUUID());
                        return holiday;
                    });

            // Act
            Holiday result = holidayService.createHoliday(newHoliday);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            Holiday::getHolidayName,
                            Holiday::getHolidayDate,
                            Holiday::getHolidayType
                    )
                    .containsExactly(
                            "Independence Day",
                            LocalDate.of(2024, 8, 15),
                            "NATIONAL"
                    );

            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(holidayRepository, times(1))
                    .existsByTenantIdAndHolidayDate(tenantId, LocalDate.of(2024, 8, 15));
            verify(holidayRepository, times(1)).save(any(Holiday.class));
        }

        @Test
        @DisplayName("Should throw exception when holiday already exists for date")
        void shouldThrowExceptionWhenHolidayExists() {
            // Arrange
            Holiday newHoliday = Holiday.builder()
                    .holidayName("Republic Day")
                    .holidayDate(LocalDate.of(2024, 1, 26))
                    .build();

            when(holidayRepository.existsByTenantIdAndHolidayDate(tenantId, LocalDate.of(2024, 1, 26)))
                    .thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> holidayService.createHoliday(newHoliday))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Holiday already exists for this date");

            verify(holidayRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should set tenant ID when creating holiday")
        void shouldSetTenantIdWhenCreating() {
            // Arrange
            Holiday newHoliday = Holiday.builder()
                    .holidayName("New Year")
                    .holidayDate(LocalDate.of(2024, 1, 1))
                    .build();

            when(holidayRepository.existsByTenantIdAndHolidayDate(tenantId, LocalDate.of(2024, 1, 1)))
                    .thenReturn(false);
            when(holidayRepository.save(any(Holiday.class)))
                    .thenAnswer(invocation -> {
                        Holiday holiday = invocation.getArgument(0);
                        holiday.setId(UUID.randomUUID());
                        return holiday;
                    });

            // Act
            Holiday result = holidayService.createHoliday(newHoliday);

            // Assert
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        }
    }

    @Nested
    @DisplayName("UpdateHoliday Tests")
    class UpdateHolidayTests {

        @Test
        @DisplayName("Should update holiday successfully")
        void shouldUpdateHolidaySuccessfully() {
            // Arrange
            Holiday updateData = Holiday.builder()
                    .holidayName("Republic Day - Updated")
                    .holidayDate(LocalDate.of(2024, 1, 26))
                    .holidayType("NATIONAL")
                    .description("Updated Description")
                    .isOptional(true)
                    .isRestricted(true)
                    .build();

            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.of(testHoliday));
            when(holidayRepository.save(any(Holiday.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Holiday result = holidayService.updateHoliday(holidayId, updateData);

            // Assert
            assertThat(result)
                    .extracting(
                            Holiday::getHolidayName,
                            Holiday::getDescription,
                            Holiday::getIsOptional,
                            Holiday::getIsRestricted
                    )
                    .containsExactly(
                            "Republic Day - Updated",
                            "Updated Description",
                            true,
                            true
                    );

            verify(holidayRepository, times(1)).findById(holidayId);
            verify(holidayRepository, times(1)).save(any(Holiday.class));
        }

        @Test
        @DisplayName("Should throw exception when holiday not found")
        void shouldThrowExceptionWhenNotFound() {
            // Arrange
            Holiday updateData = Holiday.builder().holidayName("Updated").build();

            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> holidayService.updateHoliday(holidayId, updateData))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Holiday not found");

            verify(holidayRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw exception when tenant ID doesn't match")
        void shouldThrowExceptionWhenTenantIdMismatch() {
            // Arrange
            UUID wrongTenantId = UUID.randomUUID();
            testHoliday.setTenantId(wrongTenantId);

            Holiday updateData = Holiday.builder().holidayName("Updated").build();

            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.of(testHoliday));

            // Act & Assert
            assertThatThrownBy(() -> holidayService.updateHoliday(holidayId, updateData))
                    .isInstanceOf(IllegalArgumentException.class);

            verify(holidayRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should update all holiday fields")
        void shouldUpdateAllFields() {
            // Arrange
            LocalDate newDate = LocalDate.of(2024, 3, 8);
            Holiday updateData = Holiday.builder()
                    .holidayName("Women's Day")
                    .holidayDate(newDate)
                    .holidayType("OPTIONAL")
                    .description("International Women's Day")
                    .isOptional(true)
                    .isRestricted(false)
                    .applicableLocations("New York,Los Angeles")
                    .applicableDepartments("Engineering,Sales")
                    .build();

            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.of(testHoliday));
            when(holidayRepository.save(any(Holiday.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Holiday result = holidayService.updateHoliday(holidayId, updateData);

            // Assert
            assertThat(result)
                    .extracting(
                            Holiday::getHolidayName,
                            Holiday::getHolidayDate,
                            Holiday::getHolidayType,
                            Holiday::getDescription,
                            Holiday::getIsOptional,
                            Holiday::getIsRestricted,
                            Holiday::getApplicableLocations,
                            Holiday::getApplicableDepartments
                    )
                    .containsExactly(
                            "Women's Day",
                            newDate,
                            "OPTIONAL",
                            "International Women's Day",
                            true,
                            false,
                            "New York,Los Angeles",
                            "Engineering,Sales"
                    );
        }
    }

    @Nested
    @DisplayName("GetHolidayById Tests")
    class GetHolidayByIdTests {

        @Test
        @DisplayName("Should get holiday by ID")
        void shouldGetHolidayById() {
            // Arrange
            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.of(testHoliday));

            // Act
            Holiday result = holidayService.getHolidayById(holidayId);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(Holiday::getId, Holiday::getHolidayName)
                    .containsExactly(holidayId, "Republic Day");

            verify(holidayRepository, times(1)).findById(holidayId);
        }

        @Test
        @DisplayName("Should throw exception when holiday not found")
        void shouldThrowExceptionWhenNotFound() {
            // Arrange
            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> holidayService.getHolidayById(holidayId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Holiday not found");
        }

        @Test
        @DisplayName("Should throw exception when tenant ID doesn't match")
        void shouldThrowExceptionWhenTenantIdMismatch() {
            // Arrange
            UUID wrongTenantId = UUID.randomUUID();
            testHoliday.setTenantId(wrongTenantId);

            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.of(testHoliday));

            // Act & Assert
            assertThatThrownBy(() -> holidayService.getHolidayById(holidayId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("GetAllHolidays Tests")
    class GetAllHolidaysTests {

        @Test
        @DisplayName("Should return paginated list of holidays")
        void shouldReturnPaginatedHolidays() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);

            Holiday secondHoliday = Holiday.builder()
                    .id(UUID.randomUUID())
                    .holidayName("Independence Day")
                    .holidayDate(LocalDate.of(2024, 8, 15))
                    .build();
            secondHoliday.setTenantId(tenantId);

            Page<Holiday> holidaysPage = new PageImpl<>(
                    Arrays.asList(testHoliday, secondHoliday),
                    pageable,
                    2
            );

            when(holidayRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(holidaysPage);

            // Act
            Page<Holiday> result = holidayService.getAllHolidays(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(2);

            assertThat(result.getContent())
                    .extracting(Holiday::getHolidayName)
                    .containsExactly("Republic Day", "Independence Day");

            verify(holidayRepository, times(1)).findAllByTenantId(tenantId, pageable);
        }

        @Test
        @DisplayName("Should return empty page when no holidays exist")
        void shouldReturnEmptyPageWhenNoHolidays() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<Holiday> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

            when(holidayRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(emptyPage);

            // Act
            Page<Holiday> result = holidayService.getAllHolidays(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("GetHolidaysByYear Tests")
    class GetHolidaysByYearTests {

        @Test
        @DisplayName("Should return holidays for year")
        void shouldReturnHolidaysForYear() {
            // Arrange
            when(holidayRepository.findAllByTenantIdAndYear(tenantId, 2024))
                    .thenReturn(Collections.singletonList(testHoliday));

            // Act
            List<Holiday> result = holidayService.getHolidaysByYear(2024);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1)
                    .extracting(Holiday::getHolidayName)
                    .containsExactly("Republic Day");

            verify(holidayRepository, times(1)).findAllByTenantIdAndYear(tenantId, 2024);
        }

        @Test
        @DisplayName("Should return empty list when no holidays in year")
        void shouldReturnEmptyListWhenNoHolidaysInYear() {
            // Arrange
            when(holidayRepository.findAllByTenantIdAndYear(tenantId, 2025))
                    .thenReturn(Collections.emptyList());

            // Act
            List<Holiday> result = holidayService.getHolidaysByYear(2025);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("GetHolidaysByDateRange Tests")
    class GetHolidaysByDateRangeTests {

        @Test
        @DisplayName("Should return holidays by date range")
        void shouldReturnHolidaysByDateRange() {
            // Arrange
            LocalDate startDate = LocalDate.of(2024, 1, 1);
            LocalDate endDate = LocalDate.of(2024, 12, 31);

            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, startDate, endDate))
                    .thenReturn(Collections.singletonList(testHoliday));

            // Act
            List<Holiday> result = holidayService.getHolidaysByDateRange(startDate, endDate);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1)
                    .extracting(Holiday::getHolidayName)
                    .containsExactly("Republic Day");

            verify(holidayRepository, times(1))
                    .findAllByTenantIdAndHolidayDateBetween(tenantId, startDate, endDate);
        }

        @Test
        @DisplayName("Should return empty list when no holidays in range")
        void shouldReturnEmptyListWhenNoHolidaysInRange() {
            // Arrange
            LocalDate startDate = LocalDate.of(2025, 1, 1);
            LocalDate endDate = LocalDate.of(2025, 12, 31);

            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, startDate, endDate))
                    .thenReturn(Collections.emptyList());

            // Act
            List<Holiday> result = holidayService.getHolidaysByDateRange(startDate, endDate);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("DeleteHoliday Tests")
    class DeleteHolidayTests {

        @Test
        @DisplayName("Should delete holiday successfully")
        void shouldDeleteHolidaySuccessfully() {
            // Arrange
            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.of(testHoliday));

            // Act
            holidayService.deleteHoliday(holidayId);

            // Assert
            verify(holidayRepository, times(1)).findById(holidayId);
            verify(holidayRepository, times(1)).delete(testHoliday);
        }

        @Test
        @DisplayName("Should throw exception when holiday not found")
        void shouldThrowExceptionWhenNotFound() {
            // Arrange
            when(holidayRepository.findById(holidayId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> holidayService.deleteHoliday(holidayId))
                    .isInstanceOf(IllegalArgumentException.class);

            verify(holidayRepository, never()).delete(any());
        }
    }
}
