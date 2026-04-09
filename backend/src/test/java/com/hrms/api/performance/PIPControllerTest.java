package com.hrms.api.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.ClosePIPRequest;
import com.hrms.application.performance.dto.CreatePIPRequest;
import com.hrms.application.performance.dto.PIPCheckInRequest;
import com.hrms.application.performance.dto.PIPCheckInResponse;
import com.hrms.application.performance.dto.PIPResponse;
import com.hrms.application.performance.service.PIPService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.security.*;
import com.hrms.domain.performance.PerformanceImprovementPlan.PIPStatus;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PIPController.class)
@ContextConfiguration(classes = {PIPController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PIPController Unit Tests")
class PIPControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PIPService pipService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID pipId;
    private UUID employeeId;
    private UUID managerId;
    private CreatePIPRequest createRequest;
    private PIPResponse pipResponse;

    @BeforeEach
    void setUp() {
        pipId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        createRequest = CreatePIPRequest.builder()
                .employeeId(employeeId)
                .managerId(managerId)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 6, 30))
                .reason("Consistent underperformance in Q1 targets")
                .goals("[{\"goalText\":\"Improve sales by 15%\",\"targetDate\":\"2026-05-15\"}]")
                .checkInFrequency("WEEKLY")
                .build();

        pipResponse = PIPResponse.builder()
                .id(pipId)
                .employeeId(employeeId)
                .employeeName("John Doe")
                .managerId(managerId)
                .managerName("Jane Smith")
                .status(PIPStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 6, 30))
                .reason("Consistent underperformance in Q1 targets")
                .goals("[{\"goalText\":\"Improve sales by 15%\",\"targetDate\":\"2026-05-15\"}]")
                .checkInFrequency("WEEKLY")
                .checkInCount(0)
                .checkIns(Collections.emptyList())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("Create PIP Tests")
    class CreatePIPTests {

        @Test
        @DisplayName("Should create PIP successfully and return 201")
        void shouldCreatePIPSuccessfully() throws Exception {
            when(pipService.create(any(CreatePIPRequest.class))).thenReturn(pipResponse);

            mockMvc.perform(post("/api/v1/performance/pip")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(pipId.toString()))
                    .andExpect(jsonPath("$.employeeName").value("John Doe"))
                    .andExpect(jsonPath("$.status").value("ACTIVE"))
                    .andExpect(jsonPath("$.checkInFrequency").value("WEEKLY"));

            verify(pipService).create(any(CreatePIPRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when request body is missing")
        void shouldReturn400WhenBodyMissing() throws Exception {
            mockMvc.perform(post("/api/v1/performance/pip")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get PIP Tests")
    class GetPIPTests {

        @Test
        @DisplayName("Should get PIP by ID")
        void shouldGetPIPById() throws Exception {
            when(pipService.getById(pipId)).thenReturn(pipResponse);

            mockMvc.perform(get("/api/v1/performance/pip/{id}", pipId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(pipId.toString()))
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                    .andExpect(jsonPath("$.managerName").value("Jane Smith"));

            verify(pipService).getById(pipId);
        }

        @Test
        @DisplayName("Should get all PIPs with default pagination")
        void shouldGetAllPIPsWithPagination() throws Exception {
            Page<PIPResponse> page = new PageImpl<>(
                    List.of(pipResponse),
                    org.springframework.data.domain.PageRequest.of(0, 20),
                    1);

            when(pipService.getAll(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/performance/pip"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].id").value(pipId.toString()));

            verify(pipService).getAll(any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter PIPs by employeeId")
        void shouldFilterByEmployeeId() throws Exception {
            Page<PIPResponse> page = new PageImpl<>(
                    List.of(pipResponse),
                    org.springframework.data.domain.PageRequest.of(0, 20),
                    1);

            when(pipService.getForEmployee(eq(employeeId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/performance/pip")
                            .param("employeeId", employeeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(pipService).getForEmployee(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter PIPs by managerId")
        void shouldFilterByManagerId() throws Exception {
            Page<PIPResponse> page = new PageImpl<>(
                    List.of(pipResponse),
                    org.springframework.data.domain.PageRequest.of(0, 20),
                    1);

            when(pipService.getForManager(eq(managerId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/performance/pip")
                            .param("managerId", managerId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(pipService).getForManager(eq(managerId), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("PIP Check-In Tests")
    class CheckInTests {

        @Test
        @DisplayName("Should record check-in and return 201")
        void shouldRecordCheckInSuccessfully() throws Exception {
            PIPCheckInRequest checkInRequest = PIPCheckInRequest.builder()
                    .checkInDate(LocalDate.of(2026, 4, 8))
                    .progressNotes("Good progress on sales targets")
                    .managerComments("Improvement noted")
                    .build();

            PIPCheckInResponse checkInResponse = PIPCheckInResponse.builder()
                    .id(UUID.randomUUID())
                    .pipId(pipId)
                    .checkInDate(LocalDate.of(2026, 4, 8))
                    .progressNotes("Good progress on sales targets")
                    .managerComments("Improvement noted")
                    .createdAt(LocalDateTime.now())
                    .build();

            when(pipService.recordCheckIn(eq(pipId), any(PIPCheckInRequest.class)))
                    .thenReturn(checkInResponse);

            mockMvc.perform(post("/api/v1/performance/pip/{id}/check-in", pipId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkInRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.pipId").value(pipId.toString()))
                    .andExpect(jsonPath("$.progressNotes").value("Good progress on sales targets"));

            verify(pipService).recordCheckIn(eq(pipId), any(PIPCheckInRequest.class));
        }
    }

    @Nested
    @DisplayName("Close PIP Tests")
    class ClosePIPTests {

        @Test
        @DisplayName("Should close PIP successfully")
        void shouldClosePIPSuccessfully() throws Exception {
            ClosePIPRequest closeRequest = ClosePIPRequest.builder()
                    .finalStatus(PIPStatus.COMPLETED)
                    .notes("Employee met all improvement targets")
                    .build();

            doNothing().when(pipService).close(eq(pipId), any(ClosePIPRequest.class));

            mockMvc.perform(put("/api/v1/performance/pip/{id}/close", pipId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(closeRequest)))
                    .andExpect(status().isOk());

            verify(pipService).close(eq(pipId), any(ClosePIPRequest.class));
        }

        @Test
        @DisplayName("Should close PIP with TERMINATED status")
        void shouldClosePIPWithTerminatedStatus() throws Exception {
            ClosePIPRequest closeRequest = ClosePIPRequest.builder()
                    .finalStatus(PIPStatus.TERMINATED)
                    .notes("Employee did not meet targets after extension")
                    .build();

            doNothing().when(pipService).close(eq(pipId), any(ClosePIPRequest.class));

            mockMvc.perform(put("/api/v1/performance/pip/{id}/close", pipId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(closeRequest)))
                    .andExpect(status().isOk());

            verify(pipService).close(eq(pipId), any(ClosePIPRequest.class));
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("create should have PIP_CREATE permission")
        void createShouldRequirePIPCreate() throws Exception {
            var method = PIPController.class.getMethod("create", CreatePIPRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "create must have @RequiresPermission");
            Assertions.assertEquals(Permission.PIP_CREATE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getById should have PIP_VIEW permission")
        void getByIdShouldRequirePIPView() throws Exception {
            var method = PIPController.class.getMethod("getById", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getById must have @RequiresPermission");
            Assertions.assertEquals(Permission.PIP_VIEW, annotation.value()[0]);
        }

        @Test
        @DisplayName("recordCheckIn should have PIP_MANAGE permission")
        void recordCheckInShouldRequirePIPManage() throws Exception {
            var method = PIPController.class.getMethod("recordCheckIn", UUID.class, PIPCheckInRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "recordCheckIn must have @RequiresPermission");
            Assertions.assertEquals(Permission.PIP_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("close should have PIP_MANAGE permission")
        void closeShouldRequirePIPManage() throws Exception {
            var method = PIPController.class.getMethod("close", UUID.class, ClosePIPRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "close must have @RequiresPermission");
            Assertions.assertEquals(Permission.PIP_MANAGE, annotation.value()[0]);
        }
    }
}
