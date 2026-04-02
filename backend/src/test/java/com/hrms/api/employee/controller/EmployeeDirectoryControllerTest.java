package com.hrms.api.employee.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.employee.dto.EmployeeDirectoryResponse;
import com.hrms.api.employee.dto.EmployeeSearchRequest;
import com.hrms.application.employee.service.EmployeeDirectoryService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeDirectoryController.class)
@ContextConfiguration(classes = {EmployeeDirectoryController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("EmployeeDirectoryController Unit Tests")
class EmployeeDirectoryControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EmployeeDirectoryService employeeDirectoryService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID employeeId;
    private EmployeeDirectoryResponse directoryResponse;
    private Page<EmployeeDirectoryResponse> directoryPage;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();

        directoryResponse = new EmployeeDirectoryResponse();
        directoryResponse.setId(employeeId);
        directoryResponse.setFullName("John Doe");
        directoryResponse.setWorkEmail("john.doe@example.com");
        directoryResponse.setStatus("ACTIVE");

        directoryPage = new PageImpl<>(List.of(directoryResponse), PageRequest.of(0, 20), 1);
    }

    @Nested
    @DisplayName("POST Search Tests")
    class PostSearchTests {

        @Test
        @DisplayName("Should search employees by POST with filters")
        void shouldSearchEmployeesByPost() throws Exception {
            EmployeeSearchRequest request = EmployeeSearchRequest.builder()
                    .searchTerm("John")
                    .page(0)
                    .size(20)
                    .sortBy("fullName")
                    .sortDirection("ASC")
                    .build();

            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(directoryPage);

            mockMvc.perform(post("/api/v1/employees/directory/search")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].fullName").value("John Doe"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(employeeDirectoryService).searchEmployees(any(EmployeeSearchRequest.class));
        }

        @Test
        @DisplayName("Should return empty page when no employees match")
        void shouldReturnEmptyPageWhenNoMatch() throws Exception {
            EmployeeSearchRequest request = EmployeeSearchRequest.builder()
                    .searchTerm("NonExistent")
                    .page(0)
                    .size(20)
                    .build();

            Page<EmployeeDirectoryResponse> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(emptyPage);

            mockMvc.perform(post("/api/v1/employees/directory/search")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("Should search employees by department IDs")
        void shouldSearchByDepartmentIds() throws Exception {
            UUID deptId = UUID.randomUUID();
            EmployeeSearchRequest request = EmployeeSearchRequest.builder()
                    .departmentIds(List.of(deptId))
                    .page(0)
                    .size(20)
                    .build();

            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(directoryPage);

            mockMvc.perform(post("/api/v1/employees/directory/search")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(employeeDirectoryService).searchEmployees(any(EmployeeSearchRequest.class));
        }
    }

    @Nested
    @DisplayName("GET Search Tests")
    class GetSearchTests {

        @Test
        @DisplayName("Should search employees by GET with search term")
        void shouldSearchEmployeesByGet() throws Exception {
            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(directoryPage);

            mockMvc.perform(get("/api/v1/employees/directory/search")
                            .param("searchTerm", "John")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].workEmail").value("john.doe@example.com"));

            verify(employeeDirectoryService).searchEmployees(any(EmployeeSearchRequest.class));
        }

        @Test
        @DisplayName("Should search employees by GET with status filter")
        void shouldSearchByStatus() throws Exception {
            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(directoryPage);

            mockMvc.perform(get("/api/v1/employees/directory/search")
                            .param("statuses", "ACTIVE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("ACTIVE"));
        }

        @Test
        @DisplayName("Should search employees by GET with manager filter")
        void shouldSearchByManager() throws Exception {
            UUID managerId = UUID.randomUUID();
            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(directoryPage);

            mockMvc.perform(get("/api/v1/employees/directory/search")
                            .param("managerId", managerId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(employeeDirectoryService).searchEmployees(
                    argThat(req -> managerId.equals(req.getManagerId()))
            );
        }

        @Test
        @DisplayName("Should search with no filters returns all employees")
        void shouldReturnAllWithNoFilters() throws Exception {
            when(employeeDirectoryService.searchEmployees(any(EmployeeSearchRequest.class)))
                    .thenReturn(directoryPage);

            mockMvc.perform(get("/api/v1/employees/directory/search"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(employeeDirectoryService).searchEmployees(any(EmployeeSearchRequest.class));
        }
    }
}
