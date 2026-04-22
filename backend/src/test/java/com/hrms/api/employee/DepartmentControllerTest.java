package com.hrms.api.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.employee.dto.DepartmentRequest;
import com.hrms.api.employee.dto.DepartmentResponse;
import com.hrms.application.employee.service.DepartmentService;
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
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DepartmentController.class)
@ContextConfiguration(classes = {DepartmentController.class, DepartmentControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("DepartmentController Integration Tests")
class DepartmentControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private DepartmentService departmentService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;
    private UUID departmentId;
    private DepartmentResponse departmentResponse;

    @BeforeEach
    void setUp() {
        departmentId = UUID.randomUUID();

        departmentResponse = DepartmentResponse.builder()
                .id(departmentId)
                .name("Engineering")
                .description("Software Engineering Department")
                .parentDepartmentId(null)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Department Creation Tests")
    class DepartmentCreationTests {

        @Test
        @DisplayName("Should create department successfully")
        void shouldCreateDepartmentSuccessfully() throws Exception {
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("ENG")
                    .name("Engineering")
                    .description("Software Engineering Department")
                    .build();

            when(departmentService.createDepartment(any(DepartmentRequest.class)))
                    .thenReturn(departmentResponse);

            mockMvc.perform(post("/api/v1/departments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.name").value("Engineering"))
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(departmentService).createDepartment(any(DepartmentRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid department request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            DepartmentRequest request = new DepartmentRequest();
            // Missing required fields

            mockMvc.perform(post("/api/v1/departments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should create department with parent department")
        void shouldCreateDepartmentWithParent() throws Exception {
            UUID parentDeptId = UUID.randomUUID();
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("BE")
                    .name("Backend Team")
                    .description("Backend Development Team")
                    .parentDepartmentId(parentDeptId)
                    .build();

            DepartmentResponse responseWithParent = departmentResponse.toBuilder()
                    .name("Backend Team")
                    .description("Backend Development Team")
                    .parentDepartmentId(parentDeptId)
                    .build();

            when(departmentService.createDepartment(any(DepartmentRequest.class)))
                    .thenReturn(responseWithParent);

            mockMvc.perform(post("/api/v1/departments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.parentDepartmentId").value(parentDeptId.toString()));

            verify(departmentService).createDepartment(any(DepartmentRequest.class));
        }
    }

    @Nested
    @DisplayName("Department Update Tests")
    class DepartmentUpdateTests {

        @Test
        @DisplayName("Should update department successfully")
        void shouldUpdateDepartmentSuccessfully() throws Exception {
            DepartmentRequest request = DepartmentRequest.builder()
                    .code("ENG")
                    .name("Engineering Updated")
                    .description("Updated description")
                    .build();

            DepartmentResponse updatedResponse = departmentResponse.toBuilder()
                    .name("Engineering Updated")
                    .description("Updated description")
                    .build();

            when(departmentService.updateDepartment(eq(departmentId), any(DepartmentRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/departments/{id}", departmentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Engineering Updated"))
                    .andExpect(jsonPath("$.description").value("Updated description"));

            verify(departmentService).updateDepartment(eq(departmentId), any(DepartmentRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid update request")
        void shouldReturn400ForInvalidUpdateRequest() throws Exception {
            DepartmentRequest request = new DepartmentRequest();

            mockMvc.perform(put("/api/v1/departments/{id}", departmentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Department Retrieval Tests")
    class DepartmentRetrievalTests {

        @Test
        @DisplayName("Should get department by ID")
        void shouldGetDepartmentById() throws Exception {
            when(departmentService.getDepartment(departmentId))
                    .thenReturn(departmentResponse);

            mockMvc.perform(get("/api/v1/departments/{id}", departmentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(departmentId.toString()))
                    .andExpect(jsonPath("$.name").value("Engineering"));

            verify(departmentService).getDepartment(departmentId);
        }

        @Test
        @DisplayName("Should get all departments with pagination")
        void shouldGetAllDepartments() throws Exception {
            Page<DepartmentResponse> page = new PageImpl<>(
                    Collections.singletonList(departmentResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(departmentService.getAllDepartments(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/departments")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].name").value("Engineering"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(departmentService).getAllDepartments(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get all departments with default pagination")
        void shouldGetAllDepartmentsWithDefaults() throws Exception {
            Page<DepartmentResponse> page = new PageImpl<>(
                    Collections.singletonList(departmentResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(departmentService.getAllDepartments(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/departments"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(departmentService).getAllDepartments(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get active departments")
        void shouldGetActiveDepartments() throws Exception {
            List<DepartmentResponse> activeDepts = Collections.singletonList(departmentResponse);

            when(departmentService.getActiveDepartments())
                    .thenReturn(activeDepts);

            mockMvc.perform(get("/api/v1/departments/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(departmentService).getActiveDepartments();
        }

        @Test
        @DisplayName("Should get inactive departments filtered")
        void shouldGetInactiveDepartments() throws Exception {
            DepartmentResponse inactiveResponse = departmentResponse.toBuilder()
                    .isActive(false)
                    .build();

            Collections.singletonList(inactiveResponse);

            when(departmentService.getActiveDepartments())
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/departments/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("Should get department hierarchy")
        void shouldGetDepartmentHierarchy() throws Exception {
            DepartmentResponse parentDept = departmentResponse.toBuilder()
                    .name("Parent Engineering")
                    .parentDepartmentId(null)
                    .build();

            DepartmentResponse childDept = departmentResponse.toBuilder()
                    .name("Backend Team")
                    .parentDepartmentId(departmentId)
                    .build();

            List<DepartmentResponse> hierarchy = Arrays.asList(parentDept, childDept);

            when(departmentService.getDepartmentHierarchy())
                    .thenReturn(hierarchy);

            mockMvc.perform(get("/api/v1/departments/hierarchy"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)));

            verify(departmentService).getDepartmentHierarchy();
        }
    }

    @Nested
    @DisplayName("Department Search Tests")
    class DepartmentSearchTests {

        @Test
        @DisplayName("Should search departments by name")
        void shouldSearchDepartments() throws Exception {
            Page<DepartmentResponse> page = new PageImpl<>(
                    Collections.singletonList(departmentResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(departmentService.searchDepartments(anyString(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/departments/search")
                            .param("query", "Engineering")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].name").value("Engineering"));

            verify(departmentService).searchDepartments(eq("Engineering"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty results for non-matching search")
        void shouldReturnEmptySearchResults() throws Exception {
            Page<DepartmentResponse> emptyPage = new PageImpl<>(
                    Collections.emptyList(),
                    PageRequest.of(0, 20),
                    0
            );

            when(departmentService.searchDepartments(anyString(), any(Pageable.class)))
                    .thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/departments/search")
                            .param("query", "NonExistent")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)));

            verify(departmentService).searchDepartments(eq("NonExistent"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should handle empty search query")
        void shouldHandleEmptySearchQuery() throws Exception {
            Page<DepartmentResponse> page = new PageImpl<>(
                    Collections.singletonList(departmentResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(departmentService.searchDepartments(anyString(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/departments/search")
                            .param("query", "")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Department Status Tests")
    class DepartmentStatusTests {

        @Test
        @DisplayName("Should activate department successfully")
        void shouldActivateDepartmentSuccessfully() throws Exception {
            DepartmentResponse activatedDept = departmentResponse.toBuilder()
                    .isActive(true)
                    .build();

            when(departmentService.activateDepartment(departmentId))
                    .thenReturn(activatedDept);

            mockMvc.perform(patch("/api/v1/departments/{id}/activate", departmentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(departmentService).activateDepartment(departmentId);
        }

        @Test
        @DisplayName("Should deactivate department successfully")
        void shouldDeactivateDepartmentSuccessfully() throws Exception {
            DepartmentResponse deactivatedDept = departmentResponse.toBuilder()
                    .isActive(false)
                    .build();

            when(departmentService.deactivateDepartment(departmentId))
                    .thenReturn(deactivatedDept);

            mockMvc.perform(patch("/api/v1/departments/{id}/deactivate", departmentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(false));

            verify(departmentService).deactivateDepartment(departmentId);
        }

        @Test
        @DisplayName("Should toggle department status multiple times")
        void shouldToggleDepartmentStatusMultipleTimes() throws Exception {
            DepartmentResponse activeDept = departmentResponse.toBuilder()
                    .isActive(true)
                    .build();

            DepartmentResponse inactiveDept = departmentResponse.toBuilder()
                    .isActive(false)
                    .build();

            when(departmentService.deactivateDepartment(departmentId))
                    .thenReturn(inactiveDept);

            when(departmentService.activateDepartment(departmentId))
                    .thenReturn(activeDept);

            // Deactivate
            mockMvc.perform(patch("/api/v1/departments/{id}/deactivate", departmentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(false));

            // Reactivate
            mockMvc.perform(patch("/api/v1/departments/{id}/activate", departmentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(true));
        }
    }

    @Nested
    @DisplayName("Department Deletion Tests")
    class DepartmentDeletionTests {

        @Test
        @DisplayName("Should delete department successfully")
        void shouldDeleteDepartmentSuccessfully() throws Exception {
            doNothing().when(departmentService).deleteDepartment(departmentId);

            mockMvc.perform(delete("/api/v1/departments/{id}", departmentId))
                    .andExpect(status().isNoContent());

            verify(departmentService).deleteDepartment(departmentId);
        }

        @Test
        @DisplayName("Should verify deletion was called with correct ID")
        void shouldVerifyDeletionCalledWithCorrectId() throws Exception {
            doNothing().when(departmentService).deleteDepartment(departmentId);

            mockMvc.perform(delete("/api/v1/departments/{id}", departmentId))
                    .andExpect(status().isNoContent());

            verify(departmentService, times(1)).deleteDepartment(departmentId);
        }
    }

    @Nested
    @DisplayName("Pagination Edge Cases")
    class PaginationEdgeCases {

        @Test
        @DisplayName("Should handle large page size")
        void shouldHandleLargePageSize() throws Exception {
            Page<DepartmentResponse> page = new PageImpl<>(
                    Collections.singletonList(departmentResponse),
                    PageRequest.of(0, 1000),
                    1
            );

            when(departmentService.getAllDepartments(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/departments")
                            .param("page", "0")
                            .param("size", "1000"))
                    .andExpect(status().isOk());

            verify(departmentService).getAllDepartments(any(Pageable.class));
        }

        @Test
        @DisplayName("Should reject negative page number")
        void shouldHandleNegativePageNumber() {
            // Spring rejects negative page numbers with IllegalArgumentException
            // which surfaces as a ServletException wrapping the cause
            org.junit.jupiter.api.Assertions.assertThrows(Exception.class, () ->
                    mockMvc.perform(get("/api/v1/departments")
                            .param("page", "-1")
                            .param("size", "20")));
        }
    }
}
