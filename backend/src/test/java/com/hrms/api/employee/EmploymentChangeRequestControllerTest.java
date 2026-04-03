package com.hrms.api.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.employee.dto.ApproveRejectChangeRequest;
import com.hrms.api.employee.dto.CreateEmploymentChangeRequest;
import com.hrms.api.employee.dto.EmploymentChangeRequestDto;
import com.hrms.domain.employee.EmploymentChangeRequest;
import com.hrms.application.employee.service.EmploymentChangeRequestService;
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
import org.springframework.data.domain.Pageable;
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

@WebMvcTest(EmploymentChangeRequestController.class)
@ContextConfiguration(classes = {EmploymentChangeRequestController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("EmploymentChangeRequestController Unit Tests")
class EmploymentChangeRequestControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EmploymentChangeRequestService changeRequestService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID requestId;
    private UUID employeeId;
    private EmploymentChangeRequestDto requestDto;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        requestDto = new EmploymentChangeRequestDto();
        requestDto.setId(requestId);
        requestDto.setEmployeeId(employeeId);
        requestDto.setStatus(EmploymentChangeRequest.ChangeRequestStatus.PENDING);
    }

    @Nested
    @DisplayName("Create Change Request Tests")
    class CreateChangeRequestTests {

        @Test
        @DisplayName("Should create employment change request")
        void shouldCreateChangeRequest() throws Exception {
            CreateEmploymentChangeRequest request = new CreateEmploymentChangeRequest();
            request.setEmployeeId(employeeId);

            when(changeRequestService.createChangeRequest(any(CreateEmploymentChangeRequest.class)))
                    .thenReturn(requestDto);

            mockMvc.perform(post("/api/v1/employment-change-requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(requestId.toString()))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(changeRequestService).createChangeRequest(any(CreateEmploymentChangeRequest.class));
        }
    }

    @Nested
    @DisplayName("Get Change Request Tests")
    class GetChangeRequestTests {

        @Test
        @DisplayName("Should get change request by ID")
        void shouldGetChangeRequestById() throws Exception {
            when(changeRequestService.getChangeRequest(requestId)).thenReturn(requestDto);

            mockMvc.perform(get("/api/v1/employment-change-requests/{id}", requestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(requestId.toString()))
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

            verify(changeRequestService).getChangeRequest(requestId);
        }

        @Test
        @DisplayName("Should get all change requests paginated")
        void shouldGetAllChangeRequestsPaginated() throws Exception {
            Page<EmploymentChangeRequestDto> page = new PageImpl<>(List.of(requestDto),
                    PageRequest.of(0, 20), 1);
            when(changeRequestService.getAllChangeRequests(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/employment-change-requests")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(changeRequestService).getAllChangeRequests(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get pending change requests")
        void shouldGetPendingChangeRequests() throws Exception {
            Page<EmploymentChangeRequestDto> page = new PageImpl<>(List.of(requestDto),
                    PageRequest.of(0, 20), 1);
            when(changeRequestService.getPendingChangeRequests(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/employment-change-requests/pending")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(changeRequestService).getPendingChangeRequests(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get pending requests count")
        void shouldGetPendingRequestsCount() throws Exception {
            when(changeRequestService.countPendingRequests()).thenReturn(5L);

            mockMvc.perform(get("/api/v1/employment-change-requests/pending/count"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").value(5));

            verify(changeRequestService).countPendingRequests();
        }

        @Test
        @DisplayName("Should get change requests by employee")
        void shouldGetChangeRequestsByEmployee() throws Exception {
            Page<EmploymentChangeRequestDto> page = new PageImpl<>(List.of(requestDto),
                    PageRequest.of(0, 20), 1);
            when(changeRequestService.getChangeRequestsByEmployee(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/employment-change-requests/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(changeRequestService).getChangeRequestsByEmployee(eq(employeeId), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Approve/Reject Change Request Tests")
    class ApproveRejectTests {

        @Test
        @DisplayName("Should approve change request")
        void shouldApproveChangeRequest() throws Exception {
            EmploymentChangeRequestDto approved = new EmploymentChangeRequestDto();
            approved.setId(requestId);
            approved.setStatus(EmploymentChangeRequest.ChangeRequestStatus.APPROVED);

            ApproveRejectChangeRequest approveRequest = new ApproveRejectChangeRequest();
            approveRequest.setComments("Approved by HR");

            when(changeRequestService.approveChangeRequest(eq(requestId), any(ApproveRejectChangeRequest.class)))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/employment-change-requests/{id}/approve", requestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(approveRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(changeRequestService).approveChangeRequest(eq(requestId), any(ApproveRejectChangeRequest.class));
        }

        @Test
        @DisplayName("Should approve change request without body")
        void shouldApproveChangeRequestWithoutBody() throws Exception {
            EmploymentChangeRequestDto approved = new EmploymentChangeRequestDto();
            approved.setId(requestId);
            approved.setStatus(EmploymentChangeRequest.ChangeRequestStatus.APPROVED);

            when(changeRequestService.approveChangeRequest(eq(requestId), any(ApproveRejectChangeRequest.class)))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/employment-change-requests/{id}/approve", requestId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }

        @Test
        @DisplayName("Should reject change request with reason")
        void shouldRejectChangeRequest() throws Exception {
            EmploymentChangeRequestDto rejected = new EmploymentChangeRequestDto();
            rejected.setId(requestId);
            rejected.setStatus(EmploymentChangeRequest.ChangeRequestStatus.REJECTED);

            ApproveRejectChangeRequest rejectRequest = new ApproveRejectChangeRequest();
            rejectRequest.setComments("Does not meet policy requirements");

            when(changeRequestService.rejectChangeRequest(eq(requestId), any(ApproveRejectChangeRequest.class)))
                    .thenReturn(rejected);

            mockMvc.perform(post("/api/v1/employment-change-requests/{id}/reject", requestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(rejectRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(changeRequestService).rejectChangeRequest(eq(requestId), any(ApproveRejectChangeRequest.class));
        }

        @Test
        @DisplayName("Should cancel change request")
        void shouldCancelChangeRequest() throws Exception {
            EmploymentChangeRequestDto cancelled = new EmploymentChangeRequestDto();
            cancelled.setId(requestId);
            cancelled.setStatus(EmploymentChangeRequest.ChangeRequestStatus.CANCELLED);

            when(changeRequestService.cancelChangeRequest(requestId)).thenReturn(cancelled);

            mockMvc.perform(post("/api/v1/employment-change-requests/{id}/cancel", requestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            verify(changeRequestService).cancelChangeRequest(requestId);
        }
    }
}
