package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.security.DataScopeService;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.anyString;
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
}
