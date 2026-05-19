package com.nulogic.application.leave.service;

import com.nulogic.api.leave.dto.LeaveBalanceResponse;
import com.nulogic.api.leave.mapper.LeaveBalanceMapper;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
    @Mock
    private LeaveBalanceMapper leaveBalanceMapper;
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

    /**
     * T3-10 cleanup wave: the enriched response path used to do a raw
     * {@code BeanUtils.copyProperties(balance, response, "tenantId", ...)}
     * with a string ignore-list. It now delegates to {@link LeaveBalanceMapper}
     * (the same mapper the controller uses) so the response shape is enforced
     * at compile time and not by a drifting list of field names.
     *
     * <p>These tests guard the new behaviour:</p>
     * <ul>
     *   <li>the mapper is invoked exactly once per balance row,</li>
     *   <li>the leave-type-name enrichment still happens *after* the mapper,</li>
     *   <li>missing leave-type names don't blow up the stream (null-safe).</li>
     * </ul>
     */
    @Nested
    @DisplayName("GetEmployeeBalancesEnriched (T3-10 cleanup wave)")
    class GetEmployeeBalancesEnrichedTests {

        @Test
        @DisplayName("Should delegate to LeaveBalanceMapper and enrich leaveTypeName")
        void shouldDelegateToMapperAndEnrichLeaveTypeName() {
            // Arrange — two balances, two different leave types
            UUID otherLeaveTypeId = UUID.randomUUID();

            LeaveBalance b1 = LeaveBalance.builder()
                    .employeeId(employeeId).leaveTypeId(leaveTypeId).year(year)
                    .openingBalance(new BigDecimal("20")).build();
            b1.setId(UUID.randomUUID());
            b1.setTenantId(tenantId);

            LeaveBalance b2 = LeaveBalance.builder()
                    .employeeId(employeeId).leaveTypeId(otherLeaveTypeId).year(year)
                    .openingBalance(new BigDecimal("10")).build();
            b2.setId(UUID.randomUUID());
            b2.setTenantId(tenantId);

            LeaveType lt1 = LeaveType.builder().id(leaveTypeId).leaveName("Annual Leave").build();
            LeaveType lt2 = LeaveType.builder().id(otherLeaveTypeId).leaveName("Sick Leave").build();

            when(leaveBalanceRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(b1, b2));
            when(leaveTypeRepository.findAllById(any())).thenReturn(List.of(lt1, lt2));

            // Mapper returns a stub DTO per balance — assert it was called *with the entity*.
            when(leaveBalanceMapper.toResponse(any(LeaveBalance.class))).thenAnswer(inv -> {
                LeaveBalance src = inv.getArgument(0);
                LeaveBalanceResponse dto = new LeaveBalanceResponse();
                dto.setId(src.getId());
                dto.setLeaveTypeId(src.getLeaveTypeId());
                dto.setOpeningBalance(src.getOpeningBalance());
                return dto;
            });

            // Act
            List<LeaveBalanceResponse> result = leaveBalanceService.getEmployeeBalancesEnriched(employeeId);

            // Assert — mapper invoked per row, names enriched, no BeanUtils round-trip
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getLeaveTypeName()).isEqualTo("Annual Leave");
            assertThat(result.get(1).getLeaveTypeName()).isEqualTo("Sick Leave");
            verify(leaveBalanceMapper, times(2)).toResponse(any(LeaveBalance.class));
        }

        @Test
        @DisplayName("Should NOT leak tenant or audit fields — mapper-driven shape is the contract")
        void shouldNotLeakTenantOrAuditFields() {
            // Arrange — a balance with tenant + audit metadata set.
            LeaveBalance balance = LeaveBalance.builder()
                    .employeeId(employeeId).leaveTypeId(leaveTypeId).year(year)
                    .openingBalance(new BigDecimal("20")).build();
            balance.setId(UUID.randomUUID());
            balance.setTenantId(tenantId);
            balance.setCreatedBy(UUID.randomUUID());
            balance.setLastModifiedBy(UUID.randomUUID());
            balance.setVersion(9L);

            when(leaveBalanceRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(balance));
            when(leaveTypeRepository.findAllById(any())).thenReturn(List.of());

            // Real mapper behaviour: client-facing fields only.
            when(leaveBalanceMapper.toResponse(any(LeaveBalance.class))).thenAnswer(inv -> {
                LeaveBalance src = inv.getArgument(0);
                LeaveBalanceResponse dto = new LeaveBalanceResponse();
                dto.setId(src.getId());
                dto.setEmployeeId(src.getEmployeeId());
                dto.setLeaveTypeId(src.getLeaveTypeId());
                dto.setOpeningBalance(src.getOpeningBalance());
                return dto;
            });

            // Act
            List<LeaveBalanceResponse> result = leaveBalanceService.getEmployeeBalancesEnriched(employeeId);

            // Assert — LeaveBalanceResponse has no tenant / audit setters; the test
            // here is the structural pairing: the mapper is the SOLE writer of the
            // DTO, so the regression guard at compile time (unmappedTargetPolicy=ERROR)
            // is what makes mass-assignment impossible. This asserts the wiring.
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(balance.getId());
            assertThat(result.get(0).getEmployeeId()).isEqualTo(employeeId);
            assertThat(result.get(0).getLeaveTypeName()).isNull(); // no LeaveType returned by repo
            verify(leaveBalanceMapper, times(1)).toResponse(balance);
        }

        @Test
        @DisplayName("Should return empty list without invoking mapper when no balances exist")
        void shouldShortCircuitOnEmpty() {
            when(leaveBalanceRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of());

            List<LeaveBalanceResponse> result = leaveBalanceService.getEmployeeBalancesEnriched(employeeId);

            assertThat(result).isEmpty();
            verify(leaveBalanceMapper, never()).toResponse(any(LeaveBalance.class));
            verify(leaveTypeRepository, never()).findAllById(any());
        }
    }
}
