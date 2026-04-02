package com.hrms.api.asset.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.asset.dto.AssetRequest;
import com.hrms.api.asset.dto.AssetResponse;
import com.hrms.application.asset.service.AssetManagementService;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.asset.Asset;
import com.hrms.domain.asset.AssetMaintenanceRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
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

@WebMvcTest(AssetManagementController.class)
@ContextConfiguration(classes = {AssetManagementController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AssetManagementController Unit Tests")
class AssetManagementControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AssetManagementService assetService;

    @MockitoBean
    private DataScopeService dataScopeService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID assetId;
    private UUID employeeId;
    private AssetResponse assetResponse;

    @BeforeEach
    void setUp() {
        assetId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        assetResponse = new AssetResponse();
        assetResponse.setId(assetId);
        assetResponse.setAssetName("MacBook Pro");
        assetResponse.setAssetTag("ASSET-001");
        assetResponse.setStatus(Asset.AssetStatus.AVAILABLE);
    }

    @Nested
    @DisplayName("Create Asset Tests")
    class CreateAssetTests {

        @Test
        @DisplayName("Should create asset successfully")
        void shouldCreateAssetSuccessfully() throws Exception {
            AssetRequest request = new AssetRequest();
            request.setAssetName("MacBook Pro");
            request.setAssetTag("ASSET-001");

            when(assetService.createAsset(any(AssetRequest.class))).thenReturn(assetResponse);

            mockMvc.perform(post("/api/v1/assets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(assetId.toString()))
                    .andExpect(jsonPath("$.assetName").value("MacBook Pro"));

            verify(assetService).createAsset(any(AssetRequest.class));
        }
    }

    @Nested
    @DisplayName("Get Asset Tests")
    class GetAssetTests {

        @Test
        @DisplayName("Should get asset by ID")
        void shouldGetAssetById() throws Exception {
            when(assetService.getAssetById(assetId)).thenReturn(assetResponse);

            mockMvc.perform(get("/api/v1/assets/{assetId}", assetId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(assetId.toString()))
                    .andExpect(jsonPath("$.assetName").value("MacBook Pro"));

            verify(assetService).getAssetById(assetId);
        }

        @Test
        @DisplayName("Should get all assets paginated")
        void shouldGetAllAssetsPaginated() throws Exception {
            Page<AssetResponse> page = new PageImpl<>(List.of(assetResponse),
                    PageRequest.of(0, 20), 1);

            when(dataScopeService.getScopeSpecification(anyString()))
                    .thenReturn((root, query, cb) -> cb.conjunction());
            when(assetService.getAllAssets(any(Specification.class), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/assets")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(assetService).getAllAssets(any(Specification.class), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get assets by employee")
        void shouldGetAssetsByEmployee() throws Exception {
            when(assetService.getAssetsByEmployee(employeeId)).thenReturn(List.of(assetResponse));

            mockMvc.perform(get("/api/v1/assets/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(assetService).getAssetsByEmployee(employeeId);
        }

        @Test
        @DisplayName("Should get assets by status")
        void shouldGetAssetsByStatus() throws Exception {
            when(assetService.getAssetsByStatus(Asset.AssetStatus.AVAILABLE))
                    .thenReturn(List.of(assetResponse));

            mockMvc.perform(get("/api/v1/assets/status/{status}", Asset.AssetStatus.AVAILABLE))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(assetService).getAssetsByStatus(Asset.AssetStatus.AVAILABLE);
        }
    }

    @Nested
    @DisplayName("Update Asset Tests")
    class UpdateAssetTests {

        @Test
        @DisplayName("Should update asset successfully")
        void shouldUpdateAssetSuccessfully() throws Exception {
            AssetRequest request = new AssetRequest();
            request.setAssetName("MacBook Pro 16");
            request.setAssetTag("ASSET-001");

            AssetResponse updated = new AssetResponse();
            updated.setId(assetId);
            updated.setAssetName("MacBook Pro 16");

            when(assetService.updateAsset(eq(assetId), any(AssetRequest.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/assets/{assetId}", assetId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.assetName").value("MacBook Pro 16"));

            verify(assetService).updateAsset(eq(assetId), any(AssetRequest.class));
        }
    }

    @Nested
    @DisplayName("Asset Assignment Tests")
    class AssetAssignmentTests {

        @Test
        @DisplayName("Should assign asset to employee")
        void shouldAssignAssetToEmployee() throws Exception {
            AssetResponse assigned = new AssetResponse();
            assigned.setId(assetId);
            assigned.setAssignedToEmployeeId(employeeId);
            assigned.setStatus(Asset.AssetStatus.ASSIGNED);

            when(assetService.assignAsset(assetId, employeeId)).thenReturn(assigned);

            mockMvc.perform(post("/api/v1/assets/{assetId}/assign", assetId)
                            .param("employeeId", employeeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ASSIGNED"));

            verify(assetService).assignAsset(assetId, employeeId);
        }

        @Test
        @DisplayName("Should return asset")
        void shouldReturnAsset() throws Exception {
            AssetResponse returned = new AssetResponse();
            returned.setId(assetId);
            returned.setStatus(Asset.AssetStatus.AVAILABLE);

            when(assetService.returnAsset(assetId)).thenReturn(returned);

            mockMvc.perform(post("/api/v1/assets/{assetId}/return", assetId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("AVAILABLE"));

            verify(assetService).returnAsset(assetId);
        }
    }

    @Nested
    @DisplayName("Delete Asset Tests")
    class DeleteAssetTests {

        @Test
        @DisplayName("Should delete asset")
        void shouldDeleteAsset() throws Exception {
            doNothing().when(assetService).deleteAsset(assetId);

            mockMvc.perform(delete("/api/v1/assets/{assetId}", assetId))
                    .andExpect(status().isNoContent());

            verify(assetService).deleteAsset(assetId);
        }
    }

    @Nested
    @DisplayName("Self-Service Asset Request Tests")
    class SelfServiceTests {

        @Test
        @DisplayName("Should create self-service asset request")
        void shouldCreateSelfServiceAssetRequest() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            AssetManagementController.AssetSelfRequest request =
                    new AssetManagementController.AssetSelfRequest(assetId);

            when(assetService.requestAssetAssignment(assetId, currentEmployeeId))
                    .thenReturn(assetResponse);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);

                mockMvc.perform(post("/api/v1/assets/request")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isCreated());

                verify(assetService).requestAssetAssignment(assetId, currentEmployeeId);
            }
        }
    }

    @Nested
    @DisplayName("Maintenance Tests")
    class MaintenanceTests {

        @Test
        @DisplayName("Should create maintenance request")
        void shouldCreateMaintenanceRequest() throws Exception {
            UUID requestedBy = UUID.randomUUID();
            AssetManagementController.MaintenanceRequestBody body =
                    new AssetManagementController.MaintenanceRequestBody(
                            assetId, "REPAIR", "Screen broken", "HIGH");

            AssetMaintenanceRequest maintenanceRequest = new AssetMaintenanceRequest();
            maintenanceRequest.setId(UUID.randomUUID());
            maintenanceRequest.setAssetId(assetId);

            when(assetService.createMaintenanceRequest(eq(assetId), eq(requestedBy),
                    eq("REPAIR"), eq("Screen broken"), eq("HIGH")))
                    .thenReturn(maintenanceRequest);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(requestedBy);

                mockMvc.perform(post("/api/v1/assets/maintenance")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(body)))
                        .andExpect(status().isCreated());

                verify(assetService).createMaintenanceRequest(eq(assetId), eq(requestedBy),
                        eq("REPAIR"), eq("Screen broken"), eq("HIGH"));
            }
        }

        @Test
        @DisplayName("Should get maintenance history for asset")
        void shouldGetMaintenanceHistory() throws Exception {
            AssetMaintenanceRequest request = new AssetMaintenanceRequest();
            request.setId(UUID.randomUUID());
            request.setAssetId(assetId);

            when(assetService.getMaintenanceHistory(assetId)).thenReturn(List.of(request));

            mockMvc.perform(get("/api/v1/assets/{assetId}/maintenance", assetId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(assetService).getMaintenanceHistory(assetId);
        }
    }
}
