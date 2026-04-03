package com.hrms.application.leave.service;

import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveType;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveTypeService Tests")
class LeaveTypeServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private AuditLogService auditLogService;
    @InjectMocks
    private LeaveTypeService leaveTypeService;
    private UUID tenantId;
    private UUID leaveTypeId;
    private LeaveType testLeaveType;

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
        leaveTypeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        testLeaveType = LeaveType.builder()
                .id(leaveTypeId)
                .leaveName("Annual Leave")
                .leaveCode("AL")
                .description("Annual leave for employees")
                .isPaid(true)
                .colorCode("#FF0000")
                .annualQuota(new BigDecimal("20"))
                .maxConsecutiveDays(10)
                .minDaysNotice(2)
                .maxDaysPerRequest(5)
                .isCarryForwardAllowed(true)
                .maxCarryForwardDays(new BigDecimal("5"))
                .isEncashable(true)
                .requiresDocument(false)
                .applicableAfterDays(0)
                .accrualType(LeaveType.AccrualType.YEARLY)
                .accrualRate(new BigDecimal("1.67"))
                .genderSpecific(LeaveType.GenderSpecific.ALL)
                .isActive(true)
                .build();
        testLeaveType.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("CreateLeaveType Tests")
    class CreateLeaveTypeTests {

        @Test
        @DisplayName("Should create a new leave type successfully")
        void shouldCreateLeaveTypeSuccessfully() {
            // Arrange
            LeaveType newLeaveType = LeaveType.builder()
                    .leaveName("Sick Leave")
                    .leaveCode("SL")
                    .description("Sick leave")
                    .isPaid(true)
                    .colorCode("#0000FF")
                    .annualQuota(new BigDecimal("10"))
                    .build();

            when(leaveTypeRepository.existsByLeaveCodeAndTenantId("SL", tenantId))
                    .thenReturn(false);
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> {
                        LeaveType lt = invocation.getArgument(0);
                        lt.setId(UUID.randomUUID());
                        return lt;
                    });

            // Act
            LeaveType result = leaveTypeService.createLeaveType(newLeaveType);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveType::getLeaveName, LeaveType::getLeaveCode)
                    .containsExactly("Sick Leave", "SL");
            assertThat(result.getTenantId()).isEqualTo(tenantId);

            verify(leaveTypeRepository, times(1)).existsByLeaveCodeAndTenantId("SL", tenantId);
            verify(leaveTypeRepository, times(1)).save(any(LeaveType.class));
        }

        @Test
        @DisplayName("Should throw DuplicateResourceException when leave code already exists")
        void shouldThrowExceptionWhenLeaveCodeExists() {
            // Arrange
            LeaveType newLeaveType = LeaveType.builder()
                    .leaveName("Annual Leave")
                    .leaveCode("AL")
                    .build();

            when(leaveTypeRepository.existsByLeaveCodeAndTenantId("AL", tenantId))
                    .thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> leaveTypeService.createLeaveType(newLeaveType))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("Leave type code already exists");

            verify(leaveTypeRepository, times(1)).existsByLeaveCodeAndTenantId("AL", tenantId);
            verify(leaveTypeRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should set tenant ID when creating leave type")
        void shouldSetTenantIdWhenCreating() {
            // Arrange
            LeaveType newLeaveType = LeaveType.builder()
                    .leaveName("Casual Leave")
                    .leaveCode("CL")
                    .build();

            when(leaveTypeRepository.existsByLeaveCodeAndTenantId("CL", tenantId))
                    .thenReturn(false);
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> {
                        LeaveType lt = invocation.getArgument(0);
                        lt.setId(UUID.randomUUID());
                        return lt;
                    });

            // Act
            LeaveType result = leaveTypeService.createLeaveType(newLeaveType);

            // Assert
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        }
    }

    @Nested
    @DisplayName("UpdateLeaveType Tests")
    class UpdateLeaveTypeTests {

        @Test
        @DisplayName("Should update leave type successfully")
        void shouldUpdateLeaveTypeSuccessfully() {
            // Arrange
            LeaveType updateData = LeaveType.builder()
                    .leaveName("Annual Leave - Updated")
                    .description("Updated description")
                    .isPaid(false)
                    .colorCode("#00FF00")
                    .annualQuota(new BigDecimal("25"))
                    .maxConsecutiveDays(15)
                    .minDaysNotice(3)
                    .build();

            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.of(testLeaveType));
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            LeaveType result = leaveTypeService.updateLeaveType(leaveTypeId, updateData);

            // Assert
            assertThat(result)
                    .extracting(
                            LeaveType::getLeaveName,
                            LeaveType::getDescription,
                            LeaveType::getIsPaid,
                            LeaveType::getColorCode,
                            LeaveType::getAnnualQuota,
                            LeaveType::getMaxConsecutiveDays,
                            LeaveType::getMinDaysNotice
                    )
                    .containsExactly(
                            "Annual Leave - Updated",
                            "Updated description",
                            false,
                            "#00FF00",
                            new BigDecimal("25"),
                            15,
                            3
                    );

            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveTypeRepository, times(1)).save(any(LeaveType.class));
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when leave type not found")
        void shouldThrowExceptionWhenLeaveTypeNotFound() {
            // Arrange
            LeaveType updateData = LeaveType.builder().leaveName("Updated").build();

            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> leaveTypeService.updateLeaveType(leaveTypeId, updateData))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Leave type not found");

            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveTypeRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when tenant ID doesn't match")
        void shouldThrowExceptionWhenTenantIdMismatch() {
            // Arrange - when tenant doesn't match, findByIdAndTenantId returns empty
            LeaveType updateData = LeaveType.builder().leaveName("Updated").build();

            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> leaveTypeService.updateLeaveType(leaveTypeId, updateData))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(leaveTypeRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should update all fields correctly")
        void shouldUpdateAllFieldsCorrectly() {
            // Arrange
            LeaveType updateData = LeaveType.builder()
                    .leaveName("Updated Name")
                    .description("Updated Desc")
                    .isPaid(false)
                    .colorCode("#123456")
                    .annualQuota(new BigDecimal("30"))
                    .maxConsecutiveDays(12)
                    .minDaysNotice(5)
                    .maxDaysPerRequest(7)
                    .isCarryForwardAllowed(false)
                    .maxCarryForwardDays(new BigDecimal("0"))
                    .isEncashable(false)
                    .requiresDocument(true)
                    .applicableAfterDays(30)
                    .accrualType(LeaveType.AccrualType.MONTHLY)
                    .accrualRate(new BigDecimal("2.5"))
                    .genderSpecific(LeaveType.GenderSpecific.FEMALE)
                    .build();

            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.of(testLeaveType));
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            LeaveType result = leaveTypeService.updateLeaveType(leaveTypeId, updateData);

            // Assert
            assertThat(result)
                    .extracting(
                            LeaveType::getLeaveName,
                            LeaveType::getDescription,
                            LeaveType::getIsPaid,
                            LeaveType::getColorCode,
                            LeaveType::getAnnualQuota,
                            LeaveType::getMaxConsecutiveDays,
                            LeaveType::getMinDaysNotice,
                            LeaveType::getMaxDaysPerRequest,
                            LeaveType::getIsCarryForwardAllowed,
                            LeaveType::getMaxCarryForwardDays,
                            LeaveType::getIsEncashable,
                            LeaveType::getRequiresDocument,
                            LeaveType::getApplicableAfterDays,
                            LeaveType::getAccrualType,
                            LeaveType::getAccrualRate,
                            LeaveType::getGenderSpecific
                    )
                    .containsExactly(
                            "Updated Name",
                            "Updated Desc",
                            false,
                            "#123456",
                            new BigDecimal("30"),
                            12,
                            5,
                            7,
                            false,
                            new BigDecimal("0"),
                            false,
                            true,
                            30,
                            LeaveType.AccrualType.MONTHLY,
                            new BigDecimal("2.5"),
                            LeaveType.GenderSpecific.FEMALE
                    );
        }
    }

    @Nested
    @DisplayName("GetLeaveTypeById Tests")
    class GetLeaveTypeByIdTests {

        @Test
        @DisplayName("Should return leave type by ID")
        void shouldReturnLeaveTypeById() {
            // Arrange
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.of(testLeaveType));

            // Act
            LeaveType result = leaveTypeService.getLeaveTypeById(leaveTypeId);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(LeaveType::getId, LeaveType::getLeaveName)
                    .containsExactly(leaveTypeId, "Annual Leave");

            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when leave type not found")
        void shouldThrowExceptionWhenLeaveTypeNotFound() {
            // Arrange
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> leaveTypeService.getLeaveTypeById(leaveTypeId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Leave type not found");

            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when tenant ID doesn't match")
        void shouldThrowExceptionWhenTenantIdMismatch() {
            // Arrange - when tenant doesn't match, findByIdAndTenantId returns empty
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> leaveTypeService.getLeaveTypeById(leaveTypeId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("GetAllLeaveTypes Tests")
    class GetAllLeaveTypesTests {

        @Test
        @DisplayName("Should return paginated list of all leave types for tenant")
        void shouldReturnAllLeaveTypesForTenant() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);

            LeaveType secondLeaveType = LeaveType.builder()
                    .id(UUID.randomUUID())
                    .leaveName("Sick Leave")
                    .leaveCode("SL")
                    .build();
            secondLeaveType.setTenantId(tenantId);

            Page<LeaveType> leaveTypesPage = new PageImpl<>(
                    Arrays.asList(testLeaveType, secondLeaveType),
                    pageable,
                    2
            );

            when(leaveTypeRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(leaveTypesPage);

            // Act
            Page<LeaveType> result = leaveTypeService.getAllLeaveTypes(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(2);

            assertThat(result.getContent())
                    .extracting(LeaveType::getLeaveName)
                    .containsExactly("Annual Leave", "Sick Leave");

            verify(leaveTypeRepository, times(1)).findAllByTenantId(tenantId, pageable);
        }

        @Test
        @DisplayName("Should return empty page when no leave types exist")
        void shouldReturnEmptyPageWhenNoLeaveTypes() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<LeaveType> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

            when(leaveTypeRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(emptyPage);

            // Act
            Page<LeaveType> result = leaveTypeService.getAllLeaveTypes(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("GetActiveLeaveTypes Tests")
    class GetActiveLeaveTypesTests {

        @Test
        @DisplayName("Should return list of active leave types")
        void shouldReturnActiveLeaveTypes() {
            // Arrange
            LeaveType inactiveLeaveType = LeaveType.builder()
                    .id(UUID.randomUUID())
                    .leaveName("Maternity Leave")
                    .leaveCode("ML")
                    .isActive(false)
                    .build();
            inactiveLeaveType.setTenantId(tenantId);

            when(leaveTypeRepository.findAllByTenantIdAndIsActive(tenantId, true))
                    .thenReturn(Collections.singletonList(testLeaveType));

            // Act
            List<LeaveType> result = leaveTypeService.getActiveLeaveTypes();

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1)
                    .extracting(LeaveType::getLeaveName)
                    .containsExactly("Annual Leave");

            verify(leaveTypeRepository, times(1)).findAllByTenantIdAndIsActive(tenantId, true);
        }

        @Test
        @DisplayName("Should return empty list when no active leave types exist")
        void shouldReturnEmptyListWhenNoActiveLeaveTypes() {
            // Arrange
            when(leaveTypeRepository.findAllByTenantIdAndIsActive(tenantId, true))
                    .thenReturn(Collections.emptyList());

            // Act
            List<LeaveType> result = leaveTypeService.getActiveLeaveTypes();

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("ActivateLeaveType Tests")
    class ActivateLeaveTypeTests {

        @Test
        @DisplayName("Should activate leave type")
        void shouldActivateLeaveType() {
            // Arrange
            testLeaveType.setIsActive(false);

            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.of(testLeaveType));
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            leaveTypeService.activateLeaveType(leaveTypeId);

            // Assert
            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveTypeRepository, times(1)).save(any(LeaveType.class));
            assertThat(testLeaveType.getIsActive()).isTrue();
        }
    }

    @Nested
    @DisplayName("DeactivateLeaveType Tests")
    class DeactivateLeaveTypeTests {

        @Test
        @DisplayName("Should deactivate leave type")
        void shouldDeactivateLeaveType() {
            // Arrange
            testLeaveType.setIsActive(true);

            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.of(testLeaveType));
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            leaveTypeService.deactivateLeaveType(leaveTypeId);

            // Assert
            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveTypeRepository, times(1)).save(any(LeaveType.class));
            assertThat(testLeaveType.getIsActive()).isFalse();
        }
    }

    @Nested
    @DisplayName("DeleteLeaveType Tests")
    class DeleteLeaveTypeTests {

        @Test
        @DisplayName("Should delete leave type")
        void shouldDeleteLeaveType() {
            // Arrange
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.of(testLeaveType));
            when(leaveTypeRepository.save(any(LeaveType.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            leaveTypeService.deleteLeaveType(leaveTypeId);

            // Assert
            verify(leaveTypeRepository, times(1)).findByIdAndTenantId(leaveTypeId, tenantId);
            verify(leaveTypeRepository, times(1)).save(any(LeaveType.class));
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when leave type not found")
        void shouldThrowExceptionWhenLeaveTypeNotFound() {
            // Arrange
            when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> leaveTypeService.deleteLeaveType(leaveTypeId))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(leaveTypeRepository, never()).save(any());
        }
    }
}
