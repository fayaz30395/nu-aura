package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.EmployeeImportRow;
import com.hrms.api.employee.dto.EmployeeImportPreview;
import com.hrms.api.employee.dto.ImportValidationError;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
import com.hrms.infrastructure.customfield.repository.CustomFieldDefinitionRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeImportValidationServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private CustomFieldDefinitionRepository customFieldDefinitionRepository;

    @InjectMocks
    private EmployeeImportValidationService validationService;

    private MockedStatic<SecurityContext> securityContextMock;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
    }

    @AfterEach
    void tearDown() {
        if (securityContextMock != null) {
            securityContextMock.close();
        }
    }

    private EmployeeImportRow createValidRow(int rowNumber) {
        EmployeeImportRow row = new EmployeeImportRow();
        row.setRowNumber(rowNumber);
        row.setEmployeeCode("EMP00" + rowNumber);
        row.setFirstName("John");
        row.setLastName("Doe");
        row.setWorkEmail("john.doe" + rowNumber + "@company.com");
        row.setJoiningDate("2024-01-15");
        row.setDesignation("Software Engineer");
        row.setEmploymentType("FULL_TIME");
        return row;
    }

    private CustomFieldDefinition createCustomField(String code, String name, FieldType type, boolean required) {
        CustomFieldDefinition cf = CustomFieldDefinition.builder()
                .fieldCode(code)
                .fieldName(name)
                .entityType(EntityType.EMPLOYEE)
                .fieldType(type)
                .isRequired(required)
                .isActive(true)
                .build();
        cf.setId(UUID.randomUUID());
        cf.setTenantId(tenantId);
        return cf;
    }

    private CustomFieldDefinition createNumberField(String code, String name, Double minValue, Double maxValue) {
        CustomFieldDefinition cf = CustomFieldDefinition.builder()
                .fieldCode(code)
                .fieldName(name)
                .entityType(EntityType.EMPLOYEE)
                .fieldType(FieldType.NUMBER)
                .minValue(minValue)
                .maxValue(maxValue)
                .isRequired(false)
                .isActive(true)
                .build();
        cf.setId(UUID.randomUUID());
        cf.setTenantId(tenantId);
        return cf;
    }

    private CustomFieldDefinition createDropdownField(String code, String name, String options) {
        CustomFieldDefinition cf = CustomFieldDefinition.builder()
                .fieldCode(code)
                .fieldName(name)
                .entityType(EntityType.EMPLOYEE)
                .fieldType(FieldType.DROPDOWN)
                .options(options)
                .isRequired(false)
                .isActive(true)
                .build();
        cf.setId(UUID.randomUUID());
        cf.setTenantId(tenantId);
        return cf;
    }

    private void setupMocksWithCustomFields(List<CustomFieldDefinition> customFields) {
        when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
        when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
        when(customFieldDefinitionRepository.findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
                EntityType.EMPLOYEE, tenantId)).thenReturn(customFields);
    }

    @Test
    void validateAndPreview_ValidRow_Success() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        List<EmployeeImportRow> rows = List.of(row);
        setupMocksWithCustomFields(Collections.emptyList());

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.getTotalRows()).isEqualTo(1);
        assertThat(preview.getValidRows()).isEqualTo(1);
        assertThat(preview.getInvalidRows()).isEqualTo(0);
        assertThat(preview.isHasErrors()).isFalse();
    }

    @Test
    void validateAndPreview_MissingRequiredField_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.setEmployeeCode(null);
        List<EmployeeImportRow> rows = List.of(row);
        setupMocksWithCustomFields(Collections.emptyList());

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("employeeCode") &&
                        e.getErrorType() == ImportValidationError.ErrorType.REQUIRED_FIELD_MISSING);
    }

    @Test
    void validateAndPreview_InvalidEmailFormat_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.setWorkEmail("invalid-email");
        List<EmployeeImportRow> rows = List.of(row);
        setupMocksWithCustomFields(Collections.emptyList());

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("workEmail") &&
                        e.getErrorType() == ImportValidationError.ErrorType.INVALID_FORMAT);
    }

    @Test
    void validateAndPreview_CustomFieldRequired_MissingValue_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createCustomField("employee_id_card", "Employee ID Card Number", FieldType.TEXT, true);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("employee_id_card") &&
                        e.getErrorType() == ImportValidationError.ErrorType.REQUIRED_FIELD_MISSING);
    }

    @Test
    void validateAndPreview_CustomFieldRequired_WithValue_Success() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("employee_id_card", "ID12345");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createCustomField("employee_id_card", "Employee ID Card Number", FieldType.TEXT, true);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isFalse();
        assertThat(preview.getValidRows()).isEqualTo(1);
    }

    @Test
    void validateAndPreview_CustomFieldNumber_InvalidFormat_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("years_experience", "not-a-number");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createCustomField("years_experience", "Years of Experience", FieldType.NUMBER, false);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("years_experience") &&
                        e.getErrorType() == ImportValidationError.ErrorType.INVALID_FORMAT);
    }

    @Test
    void validateAndPreview_CustomFieldNumber_ValidValue_Success() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("years_experience", "5");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createCustomField("years_experience", "Years of Experience", FieldType.NUMBER, false);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isFalse();
    }

    @Test
    void validateAndPreview_CustomFieldNumber_BelowMinValue_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("years_experience", "0");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createNumberField("years_experience", "Years of Experience", 1.0, 50.0);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("years_experience") &&
                        e.getMessage().contains("must be at least"));
    }

    @Test
    void validateAndPreview_CustomFieldDropdown_InvalidOption_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("t_shirt_size", "XXXL");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createDropdownField("t_shirt_size", "T-Shirt Size", "S,M,L,XL");
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("t_shirt_size") &&
                        e.getErrorType() == ImportValidationError.ErrorType.INVALID_VALUE);
    }

    @Test
    void validateAndPreview_CustomFieldDropdown_ValidOption_Success() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("t_shirt_size", "M");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createDropdownField("t_shirt_size", "T-Shirt Size", "S,M,L,XL");
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isFalse();
    }

    @Test
    void validateAndPreview_CustomFieldDate_InvalidFormat_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("certification_date", "15-01-2024");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createCustomField("certification_date", "Certification Date", FieldType.DATE, false);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("certification_date") &&
                        e.getErrorType() == ImportValidationError.ErrorType.INVALID_FORMAT);
    }

    @Test
    void validateAndPreview_CustomFieldCheckbox_ValidValues_Success() {
        // Given
        List<EmployeeImportRow> rows = new ArrayList<>();

        EmployeeImportRow row1 = createValidRow(2);
        row1.addCustomFieldValue("is_remote", "true");
        rows.add(row1);

        EmployeeImportRow row2 = createValidRow(3);
        row2.setEmployeeCode("EMP003");
        row2.setWorkEmail("jane.doe@company.com");
        row2.addCustomFieldValue("is_remote", "yes");
        rows.add(row2);

        EmployeeImportRow row3 = createValidRow(4);
        row3.setEmployeeCode("EMP004");
        row3.setWorkEmail("bob.smith@company.com");
        row3.addCustomFieldValue("is_remote", "1");
        rows.add(row3);

        CustomFieldDefinition customField = createCustomField("is_remote", "Remote Worker", FieldType.CHECKBOX, false);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isFalse();
        assertThat(preview.getValidRows()).isEqualTo(3);
    }

    @Test
    void validateAndPreview_CustomFieldEmail_InvalidFormat_ReturnsError() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("secondary_email", "not-an-email");
        List<EmployeeImportRow> rows = List.of(row);
        CustomFieldDefinition customField = createCustomField("secondary_email", "Secondary Email", FieldType.EMAIL, false);
        setupMocksWithCustomFields(List.of(customField));

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isTrue();
        assertThat(preview.getErrors()).anyMatch(e ->
                e.getField().equals("secondary_email") &&
                        e.getErrorType() == ImportValidationError.ErrorType.INVALID_FORMAT);
    }

    @Test
    void validateAndPreview_MultipleCustomFields_MixedValidation() {
        // Given
        EmployeeImportRow row = createValidRow(2);
        row.addCustomFieldValue("years_experience", "5");
        row.addCustomFieldValue("t_shirt_size", "L");
        row.addCustomFieldValue("is_remote", "true");
        List<EmployeeImportRow> rows = List.of(row);

        List<CustomFieldDefinition> customFields = List.of(
                createCustomField("years_experience", "Years of Experience", FieldType.NUMBER, false),
                createDropdownField("t_shirt_size", "T-Shirt Size", "S,M,L,XL"),
                createCustomField("is_remote", "Remote Worker", FieldType.CHECKBOX, false)
        );
        setupMocksWithCustomFields(customFields);

        // When
        EmployeeImportPreview preview = validationService.validateAndPreview(rows);

        // Then
        assertThat(preview.isHasErrors()).isFalse();
        assertThat(preview.getValidRows()).isEqualTo(1);
    }
}
