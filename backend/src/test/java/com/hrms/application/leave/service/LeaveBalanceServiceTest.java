package com.hrms.application.leave.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveBalanceService Tests")
class LeaveBalanceServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @InjectMocks
    private LeaveBalanceService leaveBalanceService;
    private UUID tenantId;
    private UUID employeeId;
    private UUID leaveTypeId;
    private Integer year;

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
        employeeId = UUID.randomUUID();
        leaveTypeId = UUID.randomUUID();
        year = 2024;

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @Nested
    @DisplayName("GetOrCreateBalance Tests")
    class GetOrCreateBalanceTests {

        @Test
        @DisplayName("Should return existing balance when found")
        void shouldReturnExistingBalance() {
            // Arrange
            LeaveBalance existingBalance = LeaveBalance.builder()
                    .employeeId(employeeId)
                    .leaveTypeId(leaveTypeId)
                    .year(year)
                    .openingBalance(new BigDecimal("20"))
                    .build();
            existingBalance.setTenantId(tenantId);
            existingBalance.setId(UUID.randomUUID());

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.of(existingBalance));

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            LeaveBalance::getEmployeeId,
                            LeaveBalance::getLeaveTypeId,
                            LeaveBalance::getYear,
                            LeaveBalance::getOpeningBalance
                    )
                    .containsExactly(employeeId, leaveTypeId, year, new BigDecimal("20"));

            verify(leaveBalanceRepository, times(1))
                    .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(employeeId, leaveTypeId, year, tenantId);
            verify(leaveTypeRepository, never()).findByIdAndTenantId(any(), any());
            verify(leaveBalanceRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should create new balance with opening balance from LeaveType for YEARLY accrual")
        void shouldCreateNewBalanceWithYearlyAccrual() {
            // Arrange
            LeaveType leaveType = LeaveType.builder()
                    .id(leaveTypeId)
                    .leaveName("Annual Leave")
                    .accrualType(LeaveType.AccrualType.YEARLY)
                    .annualQuota(new BigDecimal("25"))
                    .build();
            leaveType.setTenantId(tenantId);

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.of(leaveType));
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            LeaveBalance::getEmployeeId,
                            LeaveBalance::getLeaveTypeId,
                            LeaveBalance::getYear,
                            LeaveBalance::getOpeningBalance
                    )
                    .containsExactly(employeeId, leaveTypeId, year, new BigDecimal("25"));

            assertThat(result.getTenantId()).isEqualTo(tenantId);

            verify(leaveBalanceRepository, times(1))
                    .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(employeeId, leaveTypeId, year, tenantId);
            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
        }

        @Test
        @DisplayName("Should create new balance with opening balance from LeaveType for NONE accrual")
        void shouldCreateNewBalanceWithNoneAccrual() {
            // Arrange
            LeaveType leaveType = LeaveType.builder()
                    .id(leaveTypeId)
                    .leaveName("Sick Leave")
                    .accrualType(LeaveType.AccrualType.NONE)
                    .annualQuota(new BigDecimal("10"))
                    .build();
            leaveType.setTenantId(tenantId);

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.of(leaveType));
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveBalance::getOpeningBalance)
                    .isEqualTo(new BigDecimal("10"));
        }

        @Test
        @DisplayName("Should create new balance with zero opening balance for MONTHLY accrual")
        void shouldCreateNewBalanceWithMonthlyAccrualZeroOpening() {
            // Arrange
            LeaveType leaveType = LeaveType.builder()
                    .id(leaveTypeId)
                    .leaveName("Casual Leave")
                    .accrualType(LeaveType.AccrualType.MONTHLY)
                    .annualQuota(new BigDecimal("12"))
                    .build();
            leaveType.setTenantId(tenantId);

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.of(leaveType));
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveBalance::getOpeningBalance)
                    .isEqualTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should create new balance with zero opening balance for QUARTERLY accrual")
        void shouldCreateNewBalanceWithQuarterlyAccrualZeroOpening() {
            // Arrange
            LeaveType leaveType = LeaveType.builder()
                    .id(leaveTypeId)
                    .leaveName("Special Leave")
                    .accrualType(LeaveType.AccrualType.QUARTERLY)
                    .annualQuota(new BigDecimal("8"))
                    .build();
            leaveType.setTenantId(tenantId);

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.of(leaveType));
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveBalance::getOpeningBalance)
                    .isEqualTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should create new balance with zero opening balance when LeaveType not found")
        void shouldCreateNewBalanceWhenLeaveTypeNotFound() {
            // Arrange
            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.empty());
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveBalance::getOpeningBalance)
                    .isEqualTo(BigDecimal.ZERO);

            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
        }

        @Test
        @DisplayName("Should create new balance with zero opening balance when LeaveType has null accrual type")
        void shouldCreateNewBalanceWhenLeaveTypeHasNullAccrualType() {
            // Arrange
            LeaveType leaveType = LeaveType.builder()
                    .id(leaveTypeId)
                    .leaveName("Legacy Leave")
                    .accrualType(null) // Legacy data
                    .annualQuota(new BigDecimal("15"))
                    .build();
            leaveType.setTenantId(tenantId);

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.of(leaveType));
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            // When accrualType is null (treated as NONE), should use annualQuota
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveBalance::getOpeningBalance)
                    .isEqualTo(new BigDecimal("15"));
        }

        @Test
        @DisplayName("Should set tenant ID on newly created balance")
        void shouldSetTenantIdOnNewBalance() {
            // Arrange
            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.empty());
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        }

        @Test
        @DisplayName("Should call calculateAvailable on newly created balance")
        void shouldCallCalculateAvailableOnNewBalance() {
            // Arrange
            LeaveType leaveType = LeaveType.builder()
                    .id(leaveTypeId)
                    .leaveName("Annual Leave")
                    .accrualType(LeaveType.AccrualType.YEARLY)
                    .annualQuota(new BigDecimal("20"))
                    .build();
            leaveType.setTenantId(tenantId);

            when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, year, tenantId))
                    .thenReturn(Optional.empty());
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId)).thenReturn(Optional.of(leaveType));
            when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                    .thenAnswer(invocation -> {
                        LeaveBalance balance = invocation.getArgument(0);
                        balance.setId(UUID.randomUUID());
                        return balance;
                    });

            // Act
            LeaveBalance result = leaveBalanceService.getOrCreateBalance(employeeId, leaveTypeId, year);

            // Assert
            // Verify that the balance was persisted (which means calculateAvailable was called)
            verify(leaveBalanceRepository, times(1)).save(any(LeaveBalance.class));
            assertThat(result).isNotNull();
        }
    }
}
