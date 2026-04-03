package com.hrms.api.employee.controller;

import com.hrms.api.employee.dto.EmployeeImportPreview;
import com.hrms.api.employee.dto.EmployeeImportResult;
import com.hrms.application.employee.service.EmployeeImportService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeImportController.class)
@ContextConfiguration(classes = {EmployeeImportController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("EmployeeImportController Unit Tests")
class EmployeeImportControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmployeeImportService employeeImportService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @Nested
    @DisplayName("Template Download Tests")
    class TemplateDownloadTests {

        @Test
        @DisplayName("Should download CSV template")
        void shouldDownloadCsvTemplate() throws Exception {
            byte[] csvBytes = "name,email,department\n".getBytes();
            when(employeeImportService.getCsvTemplate()).thenReturn(csvBytes);

            mockMvc.perform(get("/api/v1/employees/import/template/csv"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition",
                            "attachment; filename=employee_import_template.csv"))
                    .andExpect(header().string("Content-Type", "text/csv"));

            verify(employeeImportService).getCsvTemplate();
        }

        @Test
        @DisplayName("Should download Excel template")
        void shouldDownloadExcelTemplate() throws Exception {
            byte[] xlsxBytes = new byte[]{1, 2, 3, 4};
            when(employeeImportService.getExcelTemplate()).thenReturn(xlsxBytes);

            mockMvc.perform(get("/api/v1/employees/import/template/xlsx"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition",
                            "attachment; filename=employee_import_template.xlsx"));

            verify(employeeImportService).getExcelTemplate();
        }
    }

    @Nested
    @DisplayName("Preview Import Tests")
    class PreviewImportTests {

        @Test
        @DisplayName("Should preview CSV import successfully")
        void shouldPreviewCsvImport() throws Exception {
            EmployeeImportPreview preview = new EmployeeImportPreview();
            preview.setTotalRows(10);
            preview.setValidRows(9);
            preview.setInvalidRows(1);

            when(employeeImportService.previewImport(any())).thenReturn(preview);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.csv", "text/csv",
                    "name,email\nJohn,john@example.com".getBytes()
            );

            mockMvc.perform(multipart("/api/v1/employees/import/preview").file(file))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalRows").value(10))
                    .andExpect(jsonPath("$.validRows").value(9))
                    .andExpect(jsonPath("$.invalidRows").value(1));

            verify(employeeImportService).previewImport(any());
        }

        @Test
        @DisplayName("Should preview Excel import successfully")
        void shouldPreviewXlsxImport() throws Exception {
            EmployeeImportPreview preview = new EmployeeImportPreview();
            preview.setTotalRows(5);
            preview.setValidRows(5);
            preview.setInvalidRows(0);

            when(employeeImportService.previewImport(any())).thenReturn(preview);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    new byte[]{1, 2, 3, 4}
            );

            mockMvc.perform(multipart("/api/v1/employees/import/preview").file(file))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalRows").value(5));
        }

        @Test
        @DisplayName("Should return 400 for unsupported file type")
        void shouldReturn400ForUnsupportedFileType() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.txt", "text/plain",
                    "some data".getBytes()
            );

            mockMvc.perform(multipart("/api/v1/employees/import/preview").file(file))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(employeeImportService);
        }

        @Test
        @DisplayName("Should return 400 for empty file")
        void shouldReturn400ForEmptyFile() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.csv", "text/csv", new byte[0]
            );

            mockMvc.perform(multipart("/api/v1/employees/import/preview").file(file))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(employeeImportService);
        }
    }

    @Nested
    @DisplayName("Execute Import Tests")
    class ExecuteImportTests {

        @Test
        @DisplayName("Should execute CSV import successfully")
        void shouldExecuteCsvImport() throws Exception {
            EmployeeImportResult result = new EmployeeImportResult();
            result.setSuccessCount(8);
            result.setFailedCount(2);
            result.setTotalProcessed(10);

            when(employeeImportService.executeImport(any(), anyBoolean())).thenReturn(result);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.csv", "text/csv",
                    "name,email\nJohn,john@example.com".getBytes()
            );

            mockMvc.perform(multipart("/api/v1/employees/import/execute")
                            .file(file)
                            .param("skipInvalid", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.successCount").value(8))
                    .andExpect(jsonPath("$.failedCount").value(2));

            verify(employeeImportService).executeImport(any(), eq(true));
        }

        @Test
        @DisplayName("Should execute import with skipInvalid=false")
        void shouldExecuteImportWithStrictMode() throws Exception {
            EmployeeImportResult result = new EmployeeImportResult();
            result.setSuccessCount(10);
            result.setFailedCount(0);
            result.setTotalProcessed(10);

            when(employeeImportService.executeImport(any(), anyBoolean())).thenReturn(result);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    new byte[]{1, 2, 3, 4}
            );

            mockMvc.perform(multipart("/api/v1/employees/import/execute")
                            .file(file)
                            .param("skipInvalid", "false"))
                    .andExpect(status().isOk());

            verify(employeeImportService).executeImport(any(), eq(false));
        }

        @Test
        @DisplayName("Should default skipInvalid to true when not provided")
        void shouldDefaultSkipInvalidToTrue() throws Exception {
            EmployeeImportResult result = new EmployeeImportResult();
            result.setSuccessCount(5);
            result.setFailedCount(0);
            result.setTotalProcessed(5);

            when(employeeImportService.executeImport(any(), anyBoolean())).thenReturn(result);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.csv", "text/csv",
                    "name,email\nJohn,john@example.com".getBytes()
            );

            mockMvc.perform(multipart("/api/v1/employees/import/execute").file(file))
                    .andExpect(status().isOk());

            verify(employeeImportService).executeImport(any(), eq(true));
        }
    }
}
