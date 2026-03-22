package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.DepartmentRequest;
import com.hrms.api.employee.dto.DepartmentResponse;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
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

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DepartmentService Tests")
class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private DepartmentService departmentService;

    private UUID tenantId;
    private UUID departmentId;
    private UUID parentDepartmentId;
    private UUID managerId;
    private Department testDepartment;

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
        departmentId = UUID.randomUUID();
        parentDepartmentId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        testDepartment = Department.builder()
                .id(departmentId)
                .code("DEPT001")
                .name("Engineering")
                .description("Engineering Department")
                .parentDepartmentId(null)
                .managerId(managerId)
                .isActive(true)
                .location("New York")
                .costCenter("CC001")
                .type(Department.DepartmentType.ENGINEERING)
                .build();
        testDepartment.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("CreateDepartment Tests")
    class CreateDepartmentTests {

        @Test
        @DisplayName("Should create department successfully")
        void shouldCreateDepartmentSuccessfully() {
            // Arrange
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("DEPT002")
                    .name("Sales")
                    .description("Sales Department")
                    .isActive(true)
                    .location("Los Angeles")
                    .costCenter("CC002")
                    .type(Department.DepartmentType.OPERATIONS)
                    .build();

            when(departmentRepository.existsByCodeAndTenantId("DEPT002", tenantId))
                    .thenReturn(false);
            when(departmentRepository.save(any(Department.class)))
                    .thenAnswer(invocation -> {
                        Department dept = invocation.getArgument(0);
                        dept.setId(UUID.randomUUID());
                        return dept;
                    });
            when(employeeRepository.countByDepartmentIdAndTenantId(any(), eq(tenantId)))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, any()))
                    .thenReturn(0L);

            // Act
            DepartmentResponse result = departmentService.createDepartment(request);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            DepartmentResponse::getCode,
                            DepartmentResponse::getName,
                            DepartmentResponse::getDescription
                    )
                    .containsExactly("DEPT002", "Sales", "Sales Department");

            verify(departmentRepository, times(1)).existsByCodeAndTenantId("DEPT002", tenantId);
            verify(departmentRepository, times(1)).save(any(Department.class));
        }

        @Test
        @DisplayName("Should throw DuplicateResourceException when code already exists")
        void shouldThrowExceptionWhenCodeExists() {
            // Arrange
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("DEPT001")
                    .name("Engineering")
                    .build();

            when(departmentRepository.existsByCodeAndTenantId("DEPT001", tenantId))
                    .thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> departmentService.createDepartment(request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("Department code already exists");

            verify(departmentRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should set isActive to true by default")
        void shouldSetIsActiveToTrueByDefault() {
            // Arrange
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("DEPT003")
                    .name("HR")
                    .isActive(null)
                    .build();

            when(departmentRepository.existsByCodeAndTenantId("DEPT003", tenantId))
                    .thenReturn(false);
            when(departmentRepository.save(any(Department.class)))
                    .thenAnswer(invocation -> {
                        Department dept = invocation.getArgument(0);
                        dept.setId(UUID.randomUUID());
                        return dept;
                    });
            when(employeeRepository.countByDepartmentIdAndTenantId(any(), eq(tenantId)))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, any()))
                    .thenReturn(0L);

            // Act
            DepartmentResponse result = departmentService.createDepartment(request);

            // Assert
            assertThat(result.getIsActive()).isTrue();
        }
    }

    @Nested
    @DisplayName("UpdateDepartment Tests")
    class UpdateDepartmentTests {

        @Test
        @DisplayName("Should update department successfully")
        void shouldUpdateDepartmentSuccessfully() {
            // Arrange
            DepartmentRequest request = DepartmentRequest.builder()
                    .name("Engineering Division")
                    .description("Updated description")
                    .isActive(true)
                    .build();

            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(departmentRepository.save(any(Department.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(5L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(2L);

            // Act
            DepartmentResponse result = departmentService.updateDepartment(departmentId, request);

            // Assert
            assertThat(result)
                    .extracting(
                            DepartmentResponse::getName,
                            DepartmentResponse::getDescription
                    )
                    .containsExactly("Engineering Division", "Updated description");

            verify(departmentRepository, times(1)).findById(departmentId);
            verify(departmentRepository, times(1)).save(any(Department.class));
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when department not found")
        void shouldThrowExceptionWhenNotFound() {
            // Arrange
            DepartmentRequest request = DepartmentRequest.builder().name("Updated").build();

            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> departmentService.updateDepartment(departmentId, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Department not found");

            verify(departmentRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw exception when updating code to existing code")
        void shouldThrowExceptionWhenCodeExists() {
            // Arrange
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("EXISTING_CODE")
                    .build();

            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(departmentRepository.existsByCodeAndTenantId("EXISTING_CODE", tenantId))
                    .thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> departmentService.updateDepartment(departmentId, request))
                    .isInstanceOf(DuplicateResourceException.class);

            verify(departmentRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("GetDepartment Tests")
    class GetDepartmentTests {

        @Test
        @DisplayName("Should get department by ID")
        void shouldGetDepartmentById() {
            // Arrange
            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(5L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(1L);

            // Act
            DepartmentResponse result = departmentService.getDepartment(departmentId);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(DepartmentResponse::getCode, DepartmentResponse::getName)
                    .containsExactly("DEPT001", "Engineering");

            assertThat(result.getEmployeeCount()).isEqualTo(5L);
            assertThat(result.getSubDepartmentCount()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when not found")
        void shouldThrowExceptionWhenNotFound() {
            // Arrange
            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> departmentService.getDepartment(departmentId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("GetAllDepartments Tests")
    class GetAllDepartmentsTests {

        @Test
        @DisplayName("Should return paginated list of departments")
        void shouldReturnPaginatedDepartments() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);

            Department secondDept = Department.builder()
                    .id(UUID.randomUUID())
                    .code("DEPT002")
                    .name("Sales")
                    .build();
            secondDept.setTenantId(tenantId);

            Page<Department> page = new PageImpl<>(
                    Arrays.asList(testDepartment, secondDept),
                    pageable,
                    2
            );

            when(departmentRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(page);
            when(employeeRepository.countByDepartmentIdAndTenantId(any(), eq(tenantId)))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(eq(tenantId), any()))
                    .thenReturn(0L);

            // Act
            Page<DepartmentResponse> result = departmentService.getAllDepartments(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(2);

            assertThat(result.getContent())
                    .extracting(DepartmentResponse::getName)
                    .containsExactly("Engineering", "Sales");
        }
    }

    @Nested
    @DisplayName("GetActiveDepartments Tests")
    class GetActiveDepartmentsTests {

        @Test
        @DisplayName("Should return list of active departments")
        void shouldReturnActiveDepartments() {
            // Arrange
            Department inactiveDept = Department.builder()
                    .id(UUID.randomUUID())
                    .code("INACTIVE")
                    .name("Inactive Dept")
                    .isActive(false)
                    .build();
            inactiveDept.setTenantId(tenantId);

            when(departmentRepository.findAllByTenantIdAndIsActive(tenantId, true))
                    .thenReturn(Collections.singletonList(testDepartment));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(0L);

            // Act
            List<DepartmentResponse> result = departmentService.getActiveDepartments();

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1)
                    .extracting(DepartmentResponse::getName)
                    .containsExactly("Engineering");
        }
    }

    @Nested
    @DisplayName("DeleteDepartment Tests")
    class DeleteDepartmentTests {

        @Test
        @DisplayName("Should delete department successfully")
        void shouldDeleteDepartmentSuccessfully() {
            // Arrange
            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(0L);

            // Act
            departmentService.deleteDepartment(departmentId);

            // Assert
            verify(departmentRepository, times(1)).findById(departmentId);
            verify(departmentRepository, times(1)).delete(testDepartment);
        }

        @Test
        @DisplayName("Should throw BusinessException when department has employees")
        void shouldThrowExceptionWhenHasEmployees() {
            // Arrange
            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(5L);

            // Act & Assert
            assertThatThrownBy(() -> departmentService.deleteDepartment(departmentId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot delete department with employees");

            verify(departmentRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Should throw BusinessException when department has sub-departments")
        void shouldThrowExceptionWhenHasSubDepartments() {
            // Arrange
            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(2L);

            // Act & Assert
            assertThatThrownBy(() -> departmentService.deleteDepartment(departmentId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot delete department with sub-departments");

            verify(departmentRepository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("DeactivateDepartment Tests")
    class DeactivateDepartmentTests {

        @Test
        @DisplayName("Should deactivate department")
        void shouldDeactivateDepartment() {
            // Arrange
            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(departmentRepository.save(any(Department.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(0L);

            // Act
            DepartmentResponse result = departmentService.deactivateDepartment(departmentId);

            // Assert
            assertThat(result.getIsActive()).isFalse();
            verify(departmentRepository, times(1)).save(any(Department.class));
        }
    }

    @Nested
    @DisplayName("ActivateDepartment Tests")
    class ActivateDepartmentTests {

        @Test
        @DisplayName("Should activate department")
        void shouldActivateDepartment() {
            // Arrange
            testDepartment.setIsActive(false);

            when(departmentRepository.findById(departmentId))
                    .thenReturn(Optional.of(testDepartment));
            when(departmentRepository.save(any(Department.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.countByDepartmentIdAndTenantId(departmentId, tenantId))
                    .thenReturn(0L);
            when(departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, departmentId))
                    .thenReturn(0L);

            // Act
            DepartmentResponse result = departmentService.activateDepartment(departmentId);

            // Assert
            assertThat(result.getIsActive()).isTrue();
            verify(departmentRepository, times(1)).save(any(Department.class));
        }
    }
}
