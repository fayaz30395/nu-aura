package com.hrms.api.migration.controller;

import com.hrms.api.migration.dto.ImportResult;
import com.hrms.application.migration.service.KekaMigrationService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DataMigrationController.class)
@ContextConfiguration(classes = {DataMigrationController.class, DataMigrationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("DataMigrationController Unit Tests")
class DataMigrationControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private KekaMigrationService migrationService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private RateLimitFilter rateLimitFilter;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockitoBean
    private ApiKeyService apiKeyService;

    @MockitoBean
    private ScopeContextService scopeContextService;

    private ImportResult successResult;
    private ImportResult partialResult;

    @BeforeEach
    void setUp() {
        successResult = ImportResult.builder()
                .importId(UUID.randomUUID())
                .dataType("employees")
                .totalRows(50)
                .successCount(50)
                .errorCount(0)
                .skippedCount(0)
                .startTime(LocalDateTime.now().minusSeconds(30))
                .endTime(LocalDateTime.now())
                .durationMs(30000L)
                .errors(Collections.emptyList())
                .warnings(Collections.emptyList())
                .build();

        partialResult = ImportResult.builder()
                .importId(UUID.randomUUID())
                .dataType("employees")
                .totalRows(50)
                .successCount(40)
                .errorCount(10)
                .skippedCount(0)
                .build();
    }

    private MockMultipartFile csvFile(String paramName, String filename) {
        return new MockMultipartFile(paramName, filename, "text/csv",
                "employee_code,email,first_name\nEMP001,test@test.com,John".getBytes());
    }

    private MockMultipartFile xlsxFile(String paramName, String filename) {
        return new MockMultipartFile(paramName, filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "binary xlsx data".getBytes());
    }

    // ==================== Employee Import Tests ====================

    @Nested
    @DisplayName("Employee Import Tests")
    class EmployeeImportTests {

        @Test
        @DisplayName("POST /employees — imports employees from CSV successfully")
        void importEmployees_Csv_ReturnsSuccess() throws Exception {
            when(migrationService.importEmployees(any())).thenReturn(successResult);

            mockMvc.perform(multipart("/api/v1/migration/employees")
                            .file(csvFile("file", "employees.csv")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalRows").value(50))
                    .andExpect(jsonPath("$.successCount").value(50))
                    .andExpect(jsonPath("$.errorCount").value(0));

            verify(migrationService).importEmployees(any());
        }

        @Test
        @DisplayName("POST /employees — imports employees from XLSX successfully")
        void importEmployees_Xlsx_ReturnsSuccess() throws Exception {
            when(migrationService.importEmployees(any())).thenReturn(successResult);

            mockMvc.perform(multipart("/api/v1/migration/employees")
                            .file(xlsxFile("file", "employees.xlsx")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.successCount").value(50));

            verify(migrationService).importEmployees(any());
        }

        @Test
        @DisplayName("POST /employees — returns partial success when some rows fail")
        void importEmployees_PartialSuccess_ReturnsErrorCount() throws Exception {
            when(migrationService.importEmployees(any())).thenReturn(partialResult);

            mockMvc.perform(multipart("/api/v1/migration/employees")
                            .file(csvFile("file", "employees.csv")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.successCount").value(40))
                    .andExpect(jsonPath("$.errorCount").value(10));
        }
    }

    // ==================== Attendance Import Tests ====================

    @Nested
    @DisplayName("Attendance Import Tests")
    class AttendanceImportTests {

        @Test
        @DisplayName("POST /attendance — imports attendance records successfully")
        void importAttendance_ReturnsSuccess() throws Exception {
            ImportResult attendanceResult = successResult.toBuilder()
                    .dataType("attendance").build();
            when(migrationService.importAttendance(any())).thenReturn(attendanceResult);

            mockMvc.perform(multipart("/api/v1/migration/attendance")
                            .file(csvFile("file", "attendance.csv")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.dataType").value("attendance"))
                    .andExpect(jsonPath("$.successCount").value(50));

            verify(migrationService).importAttendance(any());
        }
    }

    // ==================== Leave Balance Import Tests ====================

    @Nested
    @DisplayName("Leave Balance Import Tests")
    class LeaveBalanceImportTests {

        @Test
        @DisplayName("POST /leave-balances — imports leave balances successfully")
        void importLeaveBalances_ReturnsSuccess() throws Exception {
            ImportResult leaveResult = successResult.toBuilder()
                    .dataType("leave_balances").build();
            when(migrationService.importLeaveBalances(any())).thenReturn(leaveResult);

            mockMvc.perform(multipart("/api/v1/migration/leave-balances")
                            .file(csvFile("file", "leave_balances.csv")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.successCount").value(50));

            verify(migrationService).importLeaveBalances(any());
        }
    }

    // ==================== Salary Structure Import Tests ====================

    @Nested
    @DisplayName("Salary Structure Import Tests")
    class SalaryStructureImportTests {

        @Test
        @DisplayName("POST /salary-structures — imports salary structures successfully")
        void importSalaryStructures_ReturnsSuccess() throws Exception {
            ImportResult salaryResult = successResult.toBuilder()
                    .dataType("salary_structures").build();
            when(migrationService.importSalaryStructures(any())).thenReturn(salaryResult);

            mockMvc.perform(multipart("/api/v1/migration/salary-structures")
                            .file(csvFile("file", "salaries.csv")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.dataType").value("salary_structures"));

            verify(migrationService).importSalaryStructures(any());
        }
    }

    // ==================== Department Import Tests ====================

    @Nested
    @DisplayName("Department Import Tests")
    class DepartmentImportTests {

        @Test
        @DisplayName("POST /departments — imports departments successfully")
        void importDepartments_ReturnsSuccess() throws Exception {
            ImportResult deptResult = successResult.toBuilder()
                    .dataType("departments").build();
            when(migrationService.importDepartments(any())).thenReturn(deptResult);

            mockMvc.perform(multipart("/api/v1/migration/departments")
                            .file(csvFile("file", "departments.csv")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.dataType").value("departments"));

            verify(migrationService).importDepartments(any());
        }
    }

    // ==================== Templates Tests ====================

    @Nested
    @DisplayName("Template Discovery Tests")
    class TemplateDiscoveryTests {

        @Test
        @DisplayName("GET /templates — returns all migration type templates")
        void getTemplates_ReturnsAllTypes() throws Exception {
            mockMvc.perform(get("/api/v1/migration/templates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employees").exists())
                    .andExpect(jsonPath("$.attendance").exists())
                    .andExpect(jsonPath("$.leave_balances").exists())
                    .andExpect(jsonPath("$.salary_structures").exists())
                    .andExpect(jsonPath("$.departments").exists())
                    .andExpect(jsonPath("$.supportedFormats").isArray())
                    .andExpect(jsonPath("$.dateFormats").isArray());
        }

        @Test
        @DisplayName("GET /templates — employees template has required columns")
        void getTemplates_EmployeesHasRequiredColumns() throws Exception {
            mockMvc.perform(get("/api/v1/migration/templates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employees.requiredColumns").isArray())
                    .andExpect(jsonPath("$.employees.description").value("Employee master data"));
        }
    }

    // ==================== Validate File Tests ====================

    @Nested
    @DisplayName("File Validation Tests")
    class FileValidationTests {

        @Test
        @DisplayName("POST /validate — validates CSV file format as valid")
        void validateFile_ValidCsv_ReturnsValidTrue() throws Exception {
            mockMvc.perform(multipart("/api/v1/migration/validate")
                            .file(csvFile("file", "employees.csv"))
                            .param("type", "employees"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.validFormat").value(true))
                    .andExpect(jsonPath("$.filename").value("employees.csv"))
                    .andExpect(jsonPath("$.type").value("employees"))
                    .andExpect(jsonPath("$.requiredColumns").isArray());
        }

        @Test
        @DisplayName("POST /validate — validates XLSX format as valid")
        void validateFile_ValidXlsx_ReturnsValidTrue() throws Exception {
            mockMvc.perform(multipart("/api/v1/migration/validate")
                            .file(xlsxFile("file", "employees.xlsx"))
                            .param("type", "employees"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.validFormat").value(true));
        }

        @Test
        @DisplayName("POST /validate — rejects invalid file extension")
        void validateFile_InvalidExtension_ReturnsValidFalse() throws Exception {
            MockMultipartFile docFile = new MockMultipartFile(
                    "file", "employees.docx", "application/msword", "data".getBytes());

            mockMvc.perform(multipart("/api/v1/migration/validate")
                            .file(docFile)
                            .param("type", "employees"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.validFormat").value(false))
                    .andExpect(jsonPath("$.message").value(
                            containsString("Invalid file format")));
        }

        @Test
        @DisplayName("POST /validate — returns attendance required columns for type=attendance")
        void validateFile_AttendanceType_ReturnsCorrectRequiredColumns() throws Exception {
            mockMvc.perform(multipart("/api/v1/migration/validate")
                            .file(csvFile("file", "attendance.csv"))
                            .param("type", "attendance"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.requiredColumns[0]").value("employee_code"))
                    .andExpect(jsonPath("$.requiredColumns[1]").value("date"));
        }

        @Test
        @DisplayName("POST /validate — returns empty required columns for unknown type")
        void validateFile_UnknownType_ReturnsEmptyRequiredColumns() throws Exception {
            mockMvc.perform(multipart("/api/v1/migration/validate")
                            .file(csvFile("file", "data.csv"))
                            .param("type", "unknown_type"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.requiredColumns").isEmpty());
        }
    }

    // ==================== Permission Annotation Tests ====================

    @Nested
    @DisplayName("Admin Permission Annotation Tests")
    class AdminPermissionAnnotationTests {

        @Test
        @DisplayName("All import endpoints require MIGRATION_IMPORT permission")
        void allImportEndpoints_RequireMigrationImportPermission() {
            String[] importMethods = {"importEmployees", "importAttendance",
                    "importLeaveBalances", "importSalaryStructures", "importDepartments",
                    "getTemplates", "validateFile"};

            for (String methodName : importMethods) {
                boolean found = false;
                for (Method m : DataMigrationController.class.getDeclaredMethods()) {
                    if (m.getName().equals(methodName)) {
                        RequiresPermission ann = m.getAnnotation(RequiresPermission.class);
                        if (ann != null) {
                            for (String p : ann.value()) {
                                if (Permission.MIGRATION_IMPORT.equals(p)) found = true;
                            }
                        }
                    }
                }
                assertThat(found)
                        .as("Method '%s' should have @RequiresPermission(Permission.MIGRATION_IMPORT)",
                                methodName)
                        .isTrue();
            }
        }
    }
}
