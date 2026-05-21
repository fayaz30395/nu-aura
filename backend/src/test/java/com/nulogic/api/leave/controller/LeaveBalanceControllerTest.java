package com.nulogic.api.leave.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.leave.dto.LeaveBalanceResponse;
import com.nulogic.api.leave.dto.LeaveEncashmentRequest;
import com.nulogic.api.leave.mapper.LeaveBalanceMapperImpl;
import com.nulogic.application.leave.service.LeaveBalanceService;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LeaveBalanceController.class)
@ContextConfiguration(classes = {LeaveBalanceController.class, LeaveBalanceMapperImpl.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LeaveBalanceController Unit Tests")
class LeaveBalanceControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LeaveBalanceService leaveBalanceService;

    @MockitoBean
    private LeaveTypeRepository leaveTypeRepository;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID employeeId;
    private UUID leaveBalanceId;
    private LeaveBalance leaveBalance;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        leaveBalanceId = UUID.randomUUID();

        leaveBalance = new LeaveBalance();
        leaveBalance.setId(leaveBalanceId);
        leaveBalance.setEmployeeId(employeeId);
        leaveBalance.setAccrued(BigDecimal.valueOf(21));
        leaveBalance.setUsed(BigDecimal.valueOf(5));
        leaveBalance.setAvailable(BigDecimal.valueOf(16));
        leaveBalance.setYear(2024);
    }

    @Nested
    @DisplayName("Get Employee Balances Tests")
    class GetEmployeeBalancesTests {

        @Test
        @DisplayName("Should get leave balances for employee")
        void shouldGetLeaveBalancesForEmployee() throws Exception {
            LeaveBalanceResponse response = new LeaveBalanceResponse();
            response.setId(leaveBalanceId);
            response.setEmployeeId(employeeId);
            response.setAccrued(BigDecimal.valueOf(21));
            response.setUsed(BigDecimal.valueOf(5));
            response.setAvailable(BigDecimal.valueOf(16));
            response.setYear(2024);
            when(leaveBalanceService.getEmployeeBalancesEnriched(employeeId))
                    .thenReturn(List.of(response));

            mockMvc.perform(get("/api/v1/leave-balances/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

            verify(leaveBalanceService).getEmployeeBalancesEnriched(employeeId);
        }

        @Test
        @DisplayName("Should return empty list when no balances found")
        void shouldReturnEmptyListWhenNoBalances() throws Exception {
            when(leaveBalanceService.getEmployeeBalancesEnriched(employeeId))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/leave-balances/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("Should get leave balances for employee by year")
        void shouldGetLeaveBalancesForEmployeeByYear() throws Exception {
            when(leaveBalanceService.getEmployeeBalancesForYear(employeeId, 2024))
                    .thenReturn(List.of(leaveBalance));

            mockMvc.perform(get("/api/v1/leave-balances/employee/{employeeId}/year/{year}",
                            employeeId, 2024))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].year").value(2024));

            verify(leaveBalanceService).getEmployeeBalancesForYear(employeeId, 2024);
        }
    }

    @Nested
    @DisplayName("Leave Encashment Tests")
    class LeaveEncashmentTests {

        @Test
        @DisplayName("Should encash leave successfully")
        void shouldEncashLeaveSuccessfully() throws Exception {
            LeaveEncashmentRequest request = new LeaveEncashmentRequest();
            request.setLeaveBalanceId(leaveBalanceId);
            request.setDaysToEncash(5);

            when(leaveBalanceService.encashLeave(leaveBalanceId, 5))
                    .thenReturn(leaveBalance);

            mockMvc.perform(post("/api/v1/leave-balances/encash")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SUCCESS"))
                    .andExpect(jsonPath("$.daysEncashed").value(5));

            verify(leaveBalanceService).encashLeave(leaveBalanceId, 5);
        }

        @Test
        @DisplayName("Should return 400 when encashment request is invalid")
        void shouldReturn400WhenEncashmentInvalid() throws Exception {
            LeaveEncashmentRequest request = new LeaveEncashmentRequest();
            // Missing required fields

            mockMvc.perform(post("/api/v1/leave-balances/encash")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
