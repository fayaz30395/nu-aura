package com.hrms.api.benefits.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.benefits.dto.BenefitPlanRequest;
import com.hrms.api.benefits.dto.BenefitPlanResponse;
import com.hrms.application.benefits.service.BenefitManagementService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.benefits.BenefitPlan;
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

@WebMvcTest(BenefitManagementController.class)
@ContextConfiguration(classes = {BenefitManagementController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("BenefitManagementController Unit Tests")
class BenefitManagementControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BenefitManagementService benefitService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID planId;
    private BenefitPlanResponse planResponse;

    @BeforeEach
    void setUp() {
        planId = UUID.randomUUID();

        planResponse = BenefitPlanResponse.builder()
                .id(planId)
                .planName("Health Insurance")
                .benefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE)
                .isActive(true)
                .build();
    }

    @Nested
    @DisplayName("Create Benefit Plan Tests")
    class CreateBenefitPlanTests {

        @Test
        @DisplayName("Should create benefit plan successfully")
        void shouldCreateBenefitPlanSuccessfully() throws Exception {
            BenefitPlanRequest request = new BenefitPlanRequest();
            request.setPlanName("Health Insurance");
            request.setBenefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE);

            when(benefitService.createPlan(any(BenefitPlanRequest.class))).thenReturn(planResponse);

            mockMvc.perform(post("/api/v1/benefits/plans")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(planId.toString()))
                    .andExpect(jsonPath("$.planName").value("Health Insurance"));

            verify(benefitService).createPlan(any(BenefitPlanRequest.class));
        }
    }

    @Nested
    @DisplayName("Get Benefit Plan Tests")
    class GetBenefitPlanTests {

        @Test
        @DisplayName("Should get benefit plan by ID")
        void shouldGetBenefitPlanById() throws Exception {
            when(benefitService.getPlanById(planId)).thenReturn(planResponse);

            mockMvc.perform(get("/api/v1/benefits/plans/{planId}", planId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(planId.toString()))
                    .andExpect(jsonPath("$.planName").value("Health Insurance"));

            verify(benefitService).getPlanById(planId);
        }

        @Test
        @DisplayName("Should get all benefit plans paginated")
        void shouldGetAllBenefitPlansPaginated() throws Exception {
            Page<BenefitPlanResponse> page = new PageImpl<>(List.of(planResponse),
                    PageRequest.of(0, 20), 1);
            when(benefitService.getAllPlans(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/benefits/plans")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(benefitService).getAllPlans(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get active benefit plans")
        void shouldGetActiveBenefitPlans() throws Exception {
            when(benefitService.getActivePlans()).thenReturn(List.of(planResponse));

            mockMvc.perform(get("/api/v1/benefits/plans/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(benefitService).getActivePlans();
        }

        @Test
        @DisplayName("Should get plans by benefit type")
        void shouldGetPlansByBenefitType() throws Exception {
            when(benefitService.getPlansByType(BenefitPlan.BenefitType.HEALTH_INSURANCE))
                    .thenReturn(List.of(planResponse));

            mockMvc.perform(get("/api/v1/benefits/plans/type/{benefitType}",
                            BenefitPlan.BenefitType.HEALTH_INSURANCE))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(benefitService).getPlansByType(BenefitPlan.BenefitType.HEALTH_INSURANCE);
        }
    }

    @Nested
    @DisplayName("Update Benefit Plan Tests")
    class UpdateBenefitPlanTests {

        @Test
        @DisplayName("Should update benefit plan")
        void shouldUpdateBenefitPlan() throws Exception {
            BenefitPlanRequest request = new BenefitPlanRequest();
            request.setPlanName("Updated Health Insurance");
            request.setBenefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE);

            BenefitPlanResponse updated = BenefitPlanResponse.builder()
                    .id(planId)
                    .planName("Updated Health Insurance")
                    .build();

            when(benefitService.updatePlan(eq(planId), any(BenefitPlanRequest.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/benefits/plans/{planId}", planId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.planName").value("Updated Health Insurance"));

            verify(benefitService).updatePlan(eq(planId), any(BenefitPlanRequest.class));
        }
    }

    @Nested
    @DisplayName("Activate/Deactivate Plan Tests")
    class ActivateDeactivatePlanTests {

        @Test
        @DisplayName("Should activate benefit plan")
        void shouldActivateBenefitPlan() throws Exception {
            when(benefitService.activatePlan(planId)).thenReturn(planResponse);

            mockMvc.perform(post("/api/v1/benefits/plans/{planId}/activate", planId))
                    .andExpect(status().isOk());

            verify(benefitService).activatePlan(planId);
        }

        @Test
        @DisplayName("Should deactivate benefit plan")
        void shouldDeactivateBenefitPlan() throws Exception {
            BenefitPlanResponse inactive = BenefitPlanResponse.builder()
                    .id(planId)
                    .isActive(false)
                    .build();

            when(benefitService.deactivatePlan(planId)).thenReturn(inactive);

            mockMvc.perform(post("/api/v1/benefits/plans/{planId}/deactivate", planId))
                    .andExpect(status().isOk());

            verify(benefitService).deactivatePlan(planId);
        }
    }

    @Nested
    @DisplayName("Delete Benefit Plan Tests")
    class DeleteBenefitPlanTests {

        @Test
        @DisplayName("Should delete benefit plan")
        void shouldDeleteBenefitPlan() throws Exception {
            doNothing().when(benefitService).deletePlan(planId);

            mockMvc.perform(delete("/api/v1/benefits/plans/{planId}", planId))
                    .andExpect(status().isNoContent());

            verify(benefitService).deletePlan(planId);
        }
    }
}
