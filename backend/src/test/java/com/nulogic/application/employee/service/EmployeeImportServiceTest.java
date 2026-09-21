package com.nulogic.application.employee.service;

import com.nulogic.api.employee.dto.EmployeeImportPreview;
import com.nulogic.api.employee.dto.EmployeeImportResult;
import com.nulogic.api.employee.dto.EmployeeImportRow;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import com.nulogic.infrastructure.customfield.repository.CustomFieldValueRepository;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EmployeeImportService.executeImport partial-success handling")
class EmployeeImportServiceTest {

    private static MockedStatic<SecurityContext> securityContextMock;

    @Mock
    private EmployeeImportParserService parserService;
    @Mock
    private EmployeeImportValidationService validationService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private CustomFieldDefinitionRepository customFieldDefinitionRepository;
    @Mock
    private CustomFieldValueRepository customFieldValueRepository;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private ObjectProvider<EmployeeImportService> selfProvider;
    @Mock
    private MultipartFile file;

    private EmployeeImportService service;
    private UUID tenantId;

    @BeforeAll
    static void setUpClass() {
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());
        when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
        when(departmentRepository.findByTenantId(tenantId)).thenReturn(List.of());
        when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of());

        service = spy(new EmployeeImportService(parserService, validationService, employeeRepository,
                departmentRepository, userRepository, roleRepository, passwordEncoder,
                customFieldDefinitionRepository, customFieldValueRepository, emailNotificationService,
                tenantTimeService, selfProvider));
        when(selfProvider.getObject()).thenReturn(service);
    }

    private EmployeeImportRow row(int rowNumber, String code) {
        EmployeeImportRow row = new EmployeeImportRow();
        row.setRowNumber(rowNumber);
        row.setEmployeeCode(code);
        return row;
    }

    private EmployeeImportPreview.EmployeeImportRowPreview validPreview(int rowNumber) {
        return EmployeeImportPreview.EmployeeImportRowPreview.builder()
                .rowNumber(rowNumber)
                .isValid(true)
                .build();
    }

    @Test
    @DisplayName("one row's DB-level failure does not roll back an already-succeeded row")
    void partialFailureDoesNotRollBackSuccessfulRow() {
        EmployeeImportRow row1 = row(1, "EMP001");
        EmployeeImportRow row2 = row(2, "EMP002");

        when(parserService.parseFile(file)).thenReturn(List.of(row1, row2));
        when(validationService.validateAndPreview(List.of(row1, row2))).thenReturn(
                EmployeeImportPreview.builder()
                        .totalRows(2).validRows(2).invalidRows(0).hasErrors(false)
                        .rows(List.of(validPreview(1), validPreview(2)))
                        .build());

        Employee savedEmployee = Employee.builder().employeeCode("EMP001").firstName("A").lastName("B").build();
        savedEmployee.setId(UUID.randomUUID());
        User user = User.builder().email("a@b.com").build();
        savedEmployee.setUser(user);

        doReturn(savedEmployee).when(service).importRow(eq(row1), eq(tenantId), any(), anyMap(), anyMap(), anyMap());
        doThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate employee_code"))
                .when(service).importRow(eq(row2), eq(tenantId), any(), anyMap(), anyMap(), anyMap());

        EmployeeImportResult result = service.executeImport(file, true);

        assertThat(result.getStatus()).isEqualTo(EmployeeImportResult.ImportStatus.PARTIAL_SUCCESS);
        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getFailedCount()).isEqualTo(1);
        assertThat(result.getImportedEmployees()).hasSize(1);
        assertThat(result.getImportedEmployees().get(0).getEmployeeCode()).isEqualTo("EMP001");
        assertThat(result.getFailedImports()).hasSize(1);
        assertThat(result.getFailedImports().get(0).getRowNumber()).isEqualTo(2);
    }
}
