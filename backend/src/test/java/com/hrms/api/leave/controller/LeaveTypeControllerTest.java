package com.hrms.api.leave.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.leave.dto.LeaveTypeRequest;
import com.hrms.application.leave.service.LeaveTypeService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.leave.LeaveType;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
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

@WebMvcTest(LeaveTypeController.class)
@ContextConfiguration(classes = {LeaveTypeController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LeaveTypeController Unit Tests")
class LeaveTypeControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LeaveTypeService leaveTypeService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID leaveTypeId;
    private LeaveType leaveType;

    @BeforeEach
    void setUp() {
        leaveTypeId = UUID.randomUUID();
        leaveType = new LeaveType();
        leaveType.setId(leaveTypeId);
        leaveType.setLeaveName("Annual Leave");
        leaveType.setAnnualQuota(new java.math.BigDecimal("21"));
        leaveType.setIsActive(true);
        leaveType.setAccrualType(LeaveType.AccrualType.MONTHLY);
    }

    @Nested
    @DisplayName("Create Leave Type Tests")
    class CreateLeaveTypeTests {

        @Test
        @DisplayName("Should create leave type successfully")
        void shouldCreateLeaveTypeSuccessfully() throws Exception {
            LeaveTypeRequest request = new LeaveTypeRequest();
            request.setLeaveName("Annual Leave");
            request.setAnnualQuota(new java.math.BigDecimal("21"));
            request.setAccrualType("MONTHLY");

            when(leaveTypeService.createLeaveType(any(LeaveType.class))).thenReturn(leaveType);

            mockMvc.perform(post("/api/v1/leave-types")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(leaveTypeId.toString()))
                    .andExpect(jsonPath("$.name").value("Annual Leave"));

            verify(leaveTypeService).createLeaveType(any(LeaveType.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid create request - missing name")
        void shouldReturn400WhenNameMissing() throws Exception {
            LeaveTypeRequest request = new LeaveTypeRequest();
            // name is missing

            mockMvc.perform(post("/api/v1/leave-types")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Leave Type Tests")
    class GetLeaveTypeTests {

        @Test
        @DisplayName("Should get leave type by ID")
        void shouldGetLeaveTypeById() throws Exception {
            when(leaveTypeService.getLeaveTypeById(leaveTypeId)).thenReturn(leaveType);

            mockMvc.perform(get("/api/v1/leave-types/{id}", leaveTypeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(leaveTypeId.toString()))
                    .andExpect(jsonPath("$.name").value("Annual Leave"));

            verify(leaveTypeService).getLeaveTypeById(leaveTypeId);
        }

        @Test
        @DisplayName("Should get all leave types paginated")
        void shouldGetAllLeaveTypesPaginated() throws Exception {
            Page<LeaveType> page = new PageImpl<>(List.of(leaveType),
                    PageRequest.of(0, 20), 1);
            when(leaveTypeService.getAllLeaveTypes(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/leave-types")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].name").value("Annual Leave"));

            verify(leaveTypeService).getAllLeaveTypes(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get active leave types")
        void shouldGetActiveLeaveTypes() throws Exception {
            when(leaveTypeService.getActiveLeaveTypes()).thenReturn(List.of(leaveType));

            mockMvc.perform(get("/api/v1/leave-types/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].name").value("Annual Leave"));

            verify(leaveTypeService).getActiveLeaveTypes();
        }
    }

    @Nested
    @DisplayName("Update Leave Type Tests")
    class UpdateLeaveTypeTests {

        @Test
        @DisplayName("Should update leave type successfully")
        void shouldUpdateLeaveTypeSuccessfully() throws Exception {
            LeaveTypeRequest request = new LeaveTypeRequest();
            request.setLeaveName("Updated Annual Leave");
            request.setAnnualQuota(new java.math.BigDecimal("25"));

            LeaveType updated = new LeaveType();
            updated.setId(leaveTypeId);
            updated.setLeaveName("Updated Annual Leave");
            updated.setAnnualQuota(new java.math.BigDecimal("25"));

            when(leaveTypeService.updateLeaveType(eq(leaveTypeId), any(LeaveType.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/leave-types/{id}", leaveTypeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Annual Leave"));

            verify(leaveTypeService).updateLeaveType(eq(leaveTypeId), any(LeaveType.class));
        }
    }

    @Nested
    @DisplayName("Activate/Deactivate Leave Type Tests")
    class ActivateDeactivateTests {

        @Test
        @DisplayName("Should activate leave type")
        void shouldActivateLeaveType() throws Exception {
            doNothing().when(leaveTypeService).activateLeaveType(leaveTypeId);
            when(leaveTypeService.getLeaveTypeById(leaveTypeId)).thenReturn(leaveType);

            mockMvc.perform(patch("/api/v1/leave-types/{id}/activate", leaveTypeId))
                    .andExpect(status().isOk());

            verify(leaveTypeService).activateLeaveType(leaveTypeId);
        }

        @Test
        @DisplayName("Should deactivate leave type")
        void shouldDeactivateLeaveType() throws Exception {
            LeaveType inactive = new LeaveType();
            inactive.setId(leaveTypeId);
            inactive.setLeaveName("Annual Leave");
            inactive.setIsActive(false);

            doNothing().when(leaveTypeService).deactivateLeaveType(leaveTypeId);
            when(leaveTypeService.getLeaveTypeById(leaveTypeId)).thenReturn(inactive);

            mockMvc.perform(patch("/api/v1/leave-types/{id}/deactivate", leaveTypeId))
                    .andExpect(status().isOk());

            verify(leaveTypeService).deactivateLeaveType(leaveTypeId);
        }
    }

    @Nested
    @DisplayName("Delete Leave Type Tests")
    class DeleteLeaveTypeTests {

        @Test
        @DisplayName("Should delete leave type")
        void shouldDeleteLeaveType() throws Exception {
            doNothing().when(leaveTypeService).deleteLeaveType(leaveTypeId);

            mockMvc.perform(delete("/api/v1/leave-types/{id}", leaveTypeId))
                    .andExpect(status().isNoContent());

            verify(leaveTypeService).deleteLeaveType(leaveTypeId);
        }
    }
}
