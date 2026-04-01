package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.EmployeeImportRow;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
import com.hrms.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeImportParserServiceTest {

    @Mock
    private CustomFieldDefinitionRepository customFieldDefinitionRepository;

    @InjectMocks
    private EmployeeImportParserService parserService;

    private MockedStatic<TenantContext> tenantContextMock;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @AfterEach
    void tearDown() {
        if (tenantContextMock != null) {
            tenantContextMock.close();
        }
    }

    @Test
    void parseFile_ValidCsvWithStandardFields_Success() {
        // Given
        String csvContent = "employeeCode,firstName,lastName,workEmail,joiningDate,designation,employmentType\n" +
                "EMP001,John,Doe,john.doe@company.com,2024-01-15,Software Engineer,FULL_TIME\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", csvContent.getBytes());

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When
        List<EmployeeImportRow> rows = parserService.parseFile(file);

        // Then
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getEmployeeCode()).isEqualTo("EMP001");
        assertThat(rows.get(0).getFirstName()).isEqualTo("John");
        assertThat(rows.get(0).getLastName()).isEqualTo("Doe");
        assertThat(rows.get(0).getWorkEmail()).isEqualTo("john.doe@company.com");
        assertThat(rows.get(0).getJoiningDate()).isEqualTo("2024-01-15");
        assertThat(rows.get(0).getDesignation()).isEqualTo("Software Engineer");
        assertThat(rows.get(0).getEmploymentType()).isEqualTo("FULL_TIME");
    }

    @Test
    void parseFile_CsvWithCustomFields_ParsesCustomFieldValues() {
        // Given
        String csvContent = "employeeCode,firstName,lastName,workEmail,joiningDate,designation,employmentType,years_experience,t_shirt_size\n" +
                "EMP001,John,Doe,john.doe@company.com,2024-01-15,Software Engineer,FULL_TIME,5,L\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", csvContent.getBytes());

        List<CustomFieldDefinition> customFields = List.of(
                createCustomField("years_experience", "Years of Experience", FieldType.NUMBER),
                createCustomField("t_shirt_size", "T-Shirt Size", FieldType.DROPDOWN)
        );

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(customFields);

        // When
        List<EmployeeImportRow> rows = parserService.parseFile(file);

        // Then
        assertThat(rows).hasSize(1);
        EmployeeImportRow row = rows.get(0);
        assertThat(row.getEmployeeCode()).isEqualTo("EMP001");
        assertThat(row.hasCustomFieldValues()).isTrue();
        assertThat(row.getCustomFieldValue("years_experience")).isEqualTo("5");
        assertThat(row.getCustomFieldValue("t_shirt_size")).isEqualTo("L");
    }

    @Test
    void parseFile_CsvWithHeaderAliases_MapsCorrectly() {
        // Given
        String csvContent = "emp_code,first_name,last_name,email,joining_date,designation,employment_type\n" +
                "EMP001,John,Doe,john.doe@company.com,2024-01-15,Software Engineer,FULL_TIME\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", csvContent.getBytes());

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When
        List<EmployeeImportRow> rows = parserService.parseFile(file);

        // Then
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getEmployeeCode()).isEqualTo("EMP001");
        assertThat(rows.get(0).getFirstName()).isEqualTo("John");
        assertThat(rows.get(0).getWorkEmail()).isEqualTo("john.doe@company.com");
    }

    @Test
    void parseFile_CsvMissingRequiredHeader_ThrowsException() {
        // Given
        String csvContent = "firstName,lastName,workEmail,joiningDate,designation,employmentType\n" +
                "John,Doe,john.doe@company.com,2024-01-15,Software Engineer,FULL_TIME\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", csvContent.getBytes());

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When & Then
        assertThatThrownBy(() -> parserService.parseFile(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Missing required columns")
                .hasMessageContaining("employeeCode");
    }

    @Test
    void parseFile_EmptyCsv_ThrowsException() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", "".getBytes());

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When & Then
        assertThatThrownBy(() -> parserService.parseFile(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void parseFile_CsvWithQuotedFields_ParsesCorrectly() {
        // Given
        String csvContent = "employeeCode,firstName,lastName,workEmail,joiningDate,designation,employmentType,address\n" +
                "EMP001,John,Doe,john.doe@company.com,2024-01-15,\"Senior Software Engineer\",FULL_TIME,\"123 Main St, Apt 4\"\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", csvContent.getBytes());

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When
        List<EmployeeImportRow> rows = parserService.parseFile(file);

        // Then
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getDesignation()).isEqualTo("Senior Software Engineer");
        assertThat(rows.get(0).getAddress()).isEqualTo("123 Main St, Apt 4");
    }

    @Test
    void parseFile_MultipleRows_ParsesAllRows() {
        // Given
        String csvContent = "employeeCode,firstName,lastName,workEmail,joiningDate,designation,employmentType\n" +
                "EMP001,John,Doe,john.doe@company.com,2024-01-15,Software Engineer,FULL_TIME\n" +
                "EMP002,Jane,Smith,jane.smith@company.com,2024-02-01,Product Manager,FULL_TIME\n" +
                "EMP003,Bob,Johnson,bob.johnson@company.com,2024-03-10,Designer,CONTRACT\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.csv", "text/csv", csvContent.getBytes());

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When
        List<EmployeeImportRow> rows = parserService.parseFile(file);

        // Then
        assertThat(rows).hasSize(3);
        assertThat(rows.get(0).getRowNumber()).isEqualTo(2);
        assertThat(rows.get(1).getRowNumber()).isEqualTo(3);
        assertThat(rows.get(2).getRowNumber()).isEqualTo(4);
        assertThat(rows.get(2).getEmploymentType()).isEqualTo("CONTRACT");
    }

    @Test
    void parseFile_UnsupportedFormat_ThrowsException() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.txt", "text/plain", "some data".getBytes());

        // When & Then
        assertThatThrownBy(() -> parserService.parseFile(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unsupported file format");
    }

    @Test
    void parseFile_OldExcelFormat_ThrowsException() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.xls", "application/vnd.ms-excel", new byte[]{});

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When & Then
        assertThatThrownBy(() -> parserService.parseFile(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Old Excel format (.xls) is not supported");
    }

    @Test
    void generateCsvTemplate_WithoutCustomFields_GeneratesBasicTemplate() {
        // Given
        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(Collections.emptyList());

        // When
        byte[] template = parserService.generateCsvTemplate();

        // Then
        String templateContent = new String(template);
        assertThat(templateContent).contains("employeeCode");
        assertThat(templateContent).contains("firstName");
        assertThat(templateContent).contains("lastName");
        assertThat(templateContent).contains("workEmail");
        assertThat(templateContent).contains("joiningDate");
        assertThat(templateContent).contains("designation");
        assertThat(templateContent).contains("employmentType");
    }

    @Test
    void generateCsvTemplate_WithCustomFields_IncludesCustomFieldColumns() {
        // Given
        List<CustomFieldDefinition> customFields = List.of(
                createCustomField("years_experience", "Years of Experience", FieldType.NUMBER),
                createCustomField("t_shirt_size", "T-Shirt Size", FieldType.DROPDOWN)
        );

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(customFields);

        // When
        byte[] template = parserService.generateCsvTemplate();

        // Then
        String templateContent = new String(template);
        assertThat(templateContent).contains("employeeCode");
        assertThat(templateContent).contains("years_experience");
        assertThat(templateContent).contains("t_shirt_size");
    }

    @Test
    void getActiveCustomFieldDefinitions_ReturnsDefinitions() {
        // Given
        List<CustomFieldDefinition> customFields = List.of(
                createCustomField("years_experience", "Years of Experience", FieldType.NUMBER),
                createCustomField("t_shirt_size", "T-Shirt Size", FieldType.DROPDOWN)
        );

        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(customFields);

        // When
        List<CustomFieldDefinition> result = parserService.getActiveCustomFieldDefinitions();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getFieldCode()).isEqualTo("years_experience");
        assertThat(result.get(1).getFieldCode()).isEqualTo("t_shirt_size");
    }

    private CustomFieldDefinition createCustomField(String code, String name, FieldType type) {
        CustomFieldDefinition cf = CustomFieldDefinition.builder()
                .fieldCode(code)
                .fieldName(name)
                .entityType(EntityType.EMPLOYEE)
                .fieldType(type)
                .isRequired(false)
                .isActive(true)
                .build();
        cf.setId(UUID.randomUUID());
        cf.setTenantId(tenantId);
        return cf;
    }
}
