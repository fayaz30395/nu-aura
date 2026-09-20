package com.nulogic.application.employee.service;

import com.nulogic.api.employee.dto.AdminEmployeeUpdateRequest;
import com.nulogic.api.employee.dto.CreateEmployeeRequest;
import com.nulogic.api.employee.dto.EmployeeResponse;
import com.nulogic.api.employee.dto.UpdateEmployeeRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.event.DomainEventPublisher;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.DuplicateResourceException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TokenBlacklistService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.PIPRepository;
import com.nulogic.infrastructure.probation.repository.ProbationPeriodRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("EmployeeService Tests")
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private DomainEventPublisher eventPublisher;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private DataScopeService dataScopeService;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private ProbationPeriodRepository probationPeriodRepository;

    @Mock
    private PIPRepository pipRepository;

    @Mock
    private org.springframework.beans.factory.ObjectProvider<EmployeeService> selfProvider;

    @InjectMocks
    private EmployeeService employeeService;

    private UUID tenantId;
    private UUID employeeId;
    private CreateEmployeeRequest createRequest;
    private Employee employee;
    private User user;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        createRequest = new CreateEmployeeRequest();
        createRequest.setEmployeeCode("EMP001");
        createRequest.setFirstName("John");
        createRequest.setLastName("Doe");
        createRequest.setWorkEmail("john.doe@company.com");
        createRequest.setPassword("password123");
        createRequest.setJoiningDate(LocalDate.now());

        user = User.builder()
                .email("john.doe@company.com")
                .firstName("John")
                .lastName("Doe")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(tenantId);

        employee = Employee.builder()
                .employeeCode("EMP001")
                .firstName("John")
                .lastName("Doe")
                .user(user)
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Employee Tests")
    class CreateEmployeeTests {

        @Test
        @DisplayName("Should create employee successfully")
        void shouldCreateEmployeeSuccessfully() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.existsByEmployeeCodeAndTenantId(anyString(), any(UUID.class))).thenReturn(false);
                when(userRepository.findByEmailAndTenantId(anyString(), any(UUID.class))).thenReturn(Optional.empty());
                when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
                when(userRepository.save(any(User.class))).thenReturn(user);
                when(employeeRepository.save(any(Employee.class))).thenReturn(employee);

                // When
                EmployeeResponse response = employeeService.createEmployee(createRequest);

                // Then
                assertThat(response).isNotNull();
                assertThat(response.getEmployeeCode()).isEqualTo("EMP001");
                assertThat(response.getFirstName()).isEqualTo("John");
                verify(employeeRepository).save(any(Employee.class));
                verify(userRepository).save(any(User.class));
            }
        }

        @Test
        @DisplayName("Should throw DuplicateResourceException when employee code exists")
        void shouldThrowExceptionWhenEmployeeCodeExists() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.existsByEmployeeCodeAndTenantId(anyString(), any(UUID.class))).thenReturn(true);

                // When/Then
                assertThatThrownBy(() -> employeeService.createEmployee(createRequest))
                        .isInstanceOf(DuplicateResourceException.class)
                        .hasMessage("Employee code already exists");

                verify(employeeRepository, never()).save(any(Employee.class));
            }
        }

        @Test
        @DisplayName("Should throw DuplicateResourceException when email exists")
        void shouldThrowExceptionWhenEmailExists() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.existsByEmployeeCodeAndTenantId(anyString(), any(UUID.class))).thenReturn(false);
                when(userRepository.findByEmailAndTenantId(anyString(), any(UUID.class))).thenReturn(Optional.of(user));

                // When/Then
                assertThatThrownBy(() -> employeeService.createEmployee(createRequest))
                        .isInstanceOf(DuplicateResourceException.class)
                        .hasMessage("Email already exists");

                verify(employeeRepository, never()).save(any(Employee.class));
            }
        }

        @Test
        @DisplayName("Should throw exception when required fields are missing")
        void shouldThrowExceptionWhenRequiredFieldsMissing() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                createRequest.setPassword(null);
                when(employeeRepository.existsByEmployeeCodeAndTenantId(anyString(), any(UUID.class))).thenReturn(false);
                when(userRepository.findByEmailAndTenantId(anyString(), any(UUID.class))).thenReturn(Optional.empty());
                when(passwordEncoder.encode(isNull())).thenThrow(new IllegalArgumentException("Password is required"));

                // When/Then
                assertThatThrownBy(() -> employeeService.createEmployee(createRequest))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("Password");

                verify(employeeRepository, never()).save(any(Employee.class));
            }
        }
    }

    @Nested
    @DisplayName("Get Employee Tests")
    class GetEmployeeTests {

        @Test
        @DisplayName("Should return employee when found")
        void shouldReturnEmployeeWhenFound() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

                // When
                EmployeeResponse response = employeeService.getEmployee(employeeId);

                // Then
                assertThat(response).isNotNull();
                assertThat(response.getId()).isEqualTo(employeeId);
                assertThat(response.getEmployeeCode()).isEqualTo("EMP001");
            }
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when employee not found")
        void shouldThrowExceptionWhenEmployeeNotFound() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.empty());

                // When/Then
                assertThatThrownBy(() -> employeeService.getEmployee(employeeId))
                        .isInstanceOf(ResourceNotFoundException.class)
                        .hasMessage("Employee not found");
            }
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when employee belongs to different tenant")
        void shouldThrowExceptionWhenEmployeeBelongsToDifferentTenant() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                UUID differentTenantId = UUID.randomUUID();
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(differentTenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(differentTenantId);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

                // When/Then
                assertThatThrownBy(() -> employeeService.getEmployee(employeeId))
                        .isInstanceOf(ResourceNotFoundException.class)
                        .hasMessage("Employee not found");
            }
        }
    }

    @Nested
    @DisplayName("Delete Employee Tests")
    class DeleteEmployeeTests {

        @Test
        @DisplayName("Should mark employee as terminated")
        void shouldMarkEmployeeAsTerminated() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.save(any(Employee.class))).thenReturn(employee);

                // When
                employeeService.deleteEmployee(employeeId);

                // Then
                verify(employeeRepository).save(any(Employee.class));
                assertThat(employee.getStatus()).isEqualTo(Employee.EmployeeStatus.TERMINATED);
            }
        }

        @Test
        @DisplayName("DATA-2: termination must deactivate linked user and revoke all tokens")
        void shouldDeactivateLinkedUserAndRevokeTokensOnTermination() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                UUID userId = UUID.randomUUID();
                user.setId(userId);
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.save(any(Employee.class))).thenReturn(employee);
                when(userRepository.save(any(User.class))).thenReturn(user);

                // When
                employeeService.deleteEmployee(employeeId);

                // Then — login account disabled in the same transaction
                assertThat(user.getStatus()).isEqualTo(User.UserStatus.INACTIVE);
                verify(userRepository).save(user);
                // …and every outstanding JWT (access + refresh) revoked immediately
                verify(tokenBlacklistService).revokeAllTokensBefore(eq(userId.toString()), any(Instant.class));
            }
        }
    }

    @Nested
    @DisplayName("Update Employee Tests")
    class UpdateEmployeeTests {

        @Test
        @DisplayName("Should update employee successfully")
        void shouldUpdateEmployeeSuccessfully() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                UpdateEmployeeRequest updateRequest = new UpdateEmployeeRequest();
                updateRequest.setFirstName("Jane");
                updateRequest.setLastName("Smith");

                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
                when(userRepository.save(any(User.class))).thenReturn(user);

                // When
                EmployeeResponse response = employeeService.updateEmployee(employeeId, updateRequest);

                // Then
                assertThat(response).isNotNull();
                assertThat(response.getFirstName()).isEqualTo("Jane");
                assertThat(response.getLastName()).isEqualTo("Smith");
                verify(employeeRepository).save(any(Employee.class));
            }
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when employee not found")
        void shouldThrowExceptionWhenEmployeeNotFound() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                // Given
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                UpdateEmployeeRequest updateRequest = new UpdateEmployeeRequest();
                updateRequest.setFirstName("Jane");

                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.empty());

                // When/Then
                assertThatThrownBy(() -> employeeService.updateEmployee(employeeId, updateRequest))
                        .isInstanceOf(ResourceNotFoundException.class)
                        .hasMessage("Employee not found");
            }
        }
    }

    @Nested
    @DisplayName("Promotion Eligibility Gate Tests")
    class PromotionEligibilityGateTests {

        @Test
        @DisplayName("Should block level promotion while employee has active probation")
        void shouldBlockPromotionOnActiveProbation() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                employee.setLevel(Employee.EmployeeLevel.MID);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(probationPeriodRepository.existsByEmployeeIdAndTenantIdAndStatusIn(eq(employeeId), eq(tenantId), anyList()))
                        .thenReturn(true);

                AdminEmployeeUpdateRequest request = new AdminEmployeeUpdateRequest();
                request.setLevel(Employee.EmployeeLevel.SENIOR);

                assertThatThrownBy(() -> employeeService.updateEmployeeAdminFields(employeeId, request))
                        .isInstanceOf(BusinessException.class)
                        .hasMessageContaining("probation");

                verify(employeeRepository, never()).save(any(Employee.class));
            }
        }

        @Test
        @DisplayName("Should block designation promotion while employee has an active PIP")
        void shouldBlockPromotionOnActivePip() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(probationPeriodRepository.existsByEmployeeIdAndTenantIdAndStatusIn(eq(employeeId), eq(tenantId), anyList()))
                        .thenReturn(false);
                when(pipRepository.existsByTenantIdAndEmployeeIdAndStatusIn(eq(tenantId), eq(employeeId), anyList()))
                        .thenReturn(true);

                AdminEmployeeUpdateRequest request = new AdminEmployeeUpdateRequest();
                request.setDesignation("Senior Engineer");

                assertThatThrownBy(() -> employeeService.updateEmployeeAdminFields(employeeId, request))
                        .isInstanceOf(BusinessException.class)
                        .hasMessageContaining("Performance Improvement Plan");

                verify(employeeRepository, never()).save(any(Employee.class));
            }
        }

        @Test
        @DisplayName("Should allow promotion when no active probation or PIP")
        void shouldAllowPromotionWithoutActiveProbationOrPip() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                employee.setLevel(Employee.EmployeeLevel.MID);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));
                when(probationPeriodRepository.existsByEmployeeIdAndTenantIdAndStatusIn(eq(employeeId), eq(tenantId), anyList()))
                        .thenReturn(false);
                when(pipRepository.existsByTenantIdAndEmployeeIdAndStatusIn(eq(tenantId), eq(employeeId), anyList()))
                        .thenReturn(false);

                AdminEmployeeUpdateRequest request = new AdminEmployeeUpdateRequest();
                request.setLevel(Employee.EmployeeLevel.SENIOR);

                EmployeeResponse response = employeeService.updateEmployeeAdminFields(employeeId, request);

                assertThat(response).isNotNull();
                verify(employeeRepository).save(any(Employee.class));
            }
        }

        @Test
        @DisplayName("Should allow demotion even during active probation")
        void shouldAllowDemotionDuringActiveProbation() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                employee.setLevel(Employee.EmployeeLevel.SENIOR);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));

                AdminEmployeeUpdateRequest request = new AdminEmployeeUpdateRequest();
                request.setLevel(Employee.EmployeeLevel.MID);

                EmployeeResponse response = employeeService.updateEmployeeAdminFields(employeeId, request);

                assertThat(response).isNotNull();
                verify(employeeRepository).save(any(Employee.class));
                verify(probationPeriodRepository, never()).existsByEmployeeIdAndTenantIdAndStatusIn(any(), any(), anyList());
            }
        }
    }

    @Nested
    @DisplayName("Batch Status Change Tests")
    class BatchStatusChangeTests {

        @Test
        @DisplayName("Should update status for every employee in the batch")
        void shouldUpdateStatusForEveryEmployeeInBatch() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                UUID secondId = UUID.randomUUID();
                Employee second = Employee.builder()
                        .id(secondId)
                        .tenantId(tenantId)
                        .employeeCode("EMP002")
                        .status(Employee.EmployeeStatus.ACTIVE)
                        .build();

                when(selfProvider.getObject()).thenReturn(employeeService);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.findByIdAndTenantId(secondId, tenantId)).thenReturn(Optional.of(second));
                when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));

                com.nulogic.api.employee.dto.BatchStatusChangeRequest request =
                        new com.nulogic.api.employee.dto.BatchStatusChangeRequest();
                request.setEmployeeIds(java.util.List.of(employeeId, secondId));
                request.setStatus(Employee.EmployeeStatus.INACTIVE);

                com.nulogic.api.employee.dto.BatchStatusChangeResponse response =
                        employeeService.batchUpdateStatus(request);

                assertThat(response.getUpdatedCount()).isEqualTo(2);
                assertThat(response.getFailedEmployeeIds()).isEmpty();
                assertThat(employee.getStatus()).isEqualTo(Employee.EmployeeStatus.INACTIVE);
                assertThat(second.getStatus()).isEqualTo(Employee.EmployeeStatus.INACTIVE);
            }
        }

        @Test
        @DisplayName("Should report a not-found employee as failed without blocking the rest of the batch")
        void shouldReportFailureWithoutBlockingRestOfBatch() {
            try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
                mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                UUID missingId = UUID.randomUUID();

                when(selfProvider.getObject()).thenReturn(employeeService);
                when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
                when(employeeRepository.findByIdAndTenantId(missingId, tenantId)).thenReturn(Optional.empty());
                when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));

                com.nulogic.api.employee.dto.BatchStatusChangeRequest request =
                        new com.nulogic.api.employee.dto.BatchStatusChangeRequest();
                request.setEmployeeIds(java.util.List.of(employeeId, missingId));
                request.setStatus(Employee.EmployeeStatus.TERMINATED);

                com.nulogic.api.employee.dto.BatchStatusChangeResponse response =
                        employeeService.batchUpdateStatus(request);

                assertThat(response.getUpdatedCount()).isEqualTo(1);
                assertThat(response.getFailedEmployeeIds()).containsExactly(missingId);
                assertThat(employee.getStatus()).isEqualTo(Employee.EmployeeStatus.TERMINATED);
            }
        }
    }
}
