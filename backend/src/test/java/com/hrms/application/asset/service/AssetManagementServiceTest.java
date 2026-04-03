package com.hrms.application.asset.service;

import com.hrms.api.asset.dto.AssetRequest;
import com.hrms.api.asset.dto.AssetResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.asset.Asset;
import com.hrms.domain.asset.Asset.AssetCategory;
import com.hrms.domain.asset.Asset.AssetStatus;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.asset.repository.AssetMaintenanceRequestRepository;
import com.hrms.infrastructure.asset.repository.AssetRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("AssetManagementService Tests")
class AssetManagementServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private AssetMaintenanceRequestRepository maintenanceRequestRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WorkflowService workflowService;
    @Mock
    private EventPublisher eventPublisher;
    @Mock
    private AuditLogService auditLogService;
    @InjectMocks
    private AssetManagementService assetManagementService;
    private UUID tenantId;
    private UUID assetId;
    private UUID employeeId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        assetId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    private Asset buildAsset(AssetStatus status) {
        return Asset.builder()
                .id(assetId)
                .tenantId(tenantId)
                .assetCode("LAPTOP-001")
                .assetName("MacBook Pro")
                .category(AssetCategory.LAPTOP)
                .brand("Apple")
                .model("M3 Pro")
                .serialNumber("SN12345")
                .purchaseDate(LocalDate.now().minusMonths(6))
                .purchaseCost(new BigDecimal("2500"))
                .currentValue(new BigDecimal("2200"))
                .status(status)
                .location("HQ")
                .build();
    }

    private AssetRequest buildAssetRequest() {
        AssetRequest request = new AssetRequest();
        request.setAssetCode("LAPTOP-001");
        request.setAssetName("MacBook Pro");
        request.setCategory(AssetCategory.LAPTOP);
        request.setBrand("Apple");
        request.setModel("M3 Pro");
        request.setSerialNumber("SN12345");
        request.setPurchaseDate(LocalDate.now().minusMonths(6));
        request.setPurchaseCost(new BigDecimal("2500"));
        request.setCurrentValue(new BigDecimal("2200"));
        request.setLocation("HQ");
        return request;
    }

    // ==================== createAsset ====================

    @Test
    @DisplayName("createAsset - creates asset successfully")
    void createAsset_success() {
        AssetRequest request = buildAssetRequest();
        when(assetRepository.existsByTenantIdAndAssetCode(tenantId, "LAPTOP-001")).thenReturn(false);
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> {
            Asset a = inv.getArgument(0);
            a.setId(assetId);
            return a;
        });

        AssetResponse result = assetManagementService.createAsset(request);

        assertThat(result).isNotNull();
        assertThat(result.getAssetCode()).isEqualTo("LAPTOP-001");
        assertThat(result.getStatus()).isEqualTo(AssetStatus.AVAILABLE);
        verify(assetRepository).save(any(Asset.class));
    }

    @Test
    @DisplayName("createAsset - rejects duplicate asset code")
    void createAsset_duplicateCode() {
        AssetRequest request = buildAssetRequest();
        when(assetRepository.existsByTenantIdAndAssetCode(tenantId, "LAPTOP-001")).thenReturn(true);

        assertThatThrownBy(() -> assetManagementService.createAsset(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    // ==================== updateAsset ====================

    @Test
    @DisplayName("updateAsset - updates existing asset")
    void updateAsset_success() {
        Asset existing = buildAsset(AssetStatus.AVAILABLE);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(existing));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetRequest request = buildAssetRequest();
        request.setAssetName("MacBook Pro M4");

        AssetResponse result = assetManagementService.updateAsset(assetId, request);

        assertThat(result).isNotNull();
        verify(assetRepository).save(any(Asset.class));
    }

    @Test
    @DisplayName("updateAsset - throws when asset not found")
    void updateAsset_notFound() {
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetManagementService.updateAsset(assetId, buildAssetRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Asset not found");
    }

    // ==================== assignAsset ====================

    @Test
    @DisplayName("assignAsset - assigns available asset to employee")
    void assignAsset_success() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        Employee employee = new Employee();
        employee.setId(employeeId);

        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetResponse result = assetManagementService.assignAsset(assetId, employeeId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(AssetStatus.ASSIGNED);
    }

    @Test
    @DisplayName("assignAsset - fails when asset is not available")
    void assignAsset_notAvailable() {
        Asset asset = buildAsset(AssetStatus.ASSIGNED);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> assetManagementService.assignAsset(assetId, employeeId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not available");
    }

    @Test
    @DisplayName("assignAsset - fails when employee not found (tenant isolation)")
    void assignAsset_employeeNotInTenant() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetManagementService.assignAsset(assetId, employeeId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Employee not found");
    }

    // ==================== returnAsset ====================

    @Test
    @DisplayName("returnAsset - returns assigned asset")
    void returnAsset_success() {
        Asset asset = buildAsset(AssetStatus.ASSIGNED);
        asset.setAssignedTo(employeeId);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetResponse result = assetManagementService.returnAsset(assetId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(AssetStatus.AVAILABLE);
        assertThat(result.getAssignedTo()).isNull();
    }

    // ==================== getAssetById ====================

    @Test
    @DisplayName("getAssetById - returns asset DTO")
    void getAssetById_success() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));

        AssetResponse result = assetManagementService.getAssetById(assetId);

        assertThat(result).isNotNull();
        assertThat(result.getAssetCode()).isEqualTo("LAPTOP-001");
    }

    @Test
    @DisplayName("getAssetById - throws when not found")
    void getAssetById_notFound() {
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetManagementService.getAssetById(assetId))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ==================== deleteAsset ====================

    @Test
    @DisplayName("deleteAsset - deletes existing asset")
    void deleteAsset_success() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));

        assetManagementService.deleteAsset(assetId);

        verify(assetRepository).delete(asset);
    }

    // ==================== getAssetsByStatus ====================

    @Test
    @DisplayName("getAssetsByStatus - returns assets filtered by status")
    void getAssetsByStatus_success() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        when(assetRepository.findByTenantIdAndStatus(tenantId, AssetStatus.AVAILABLE))
                .thenReturn(List.of(asset));

        List<AssetResponse> result = assetManagementService.getAssetsByStatus(AssetStatus.AVAILABLE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(AssetStatus.AVAILABLE);
    }

    // ==================== getAssetsByEmployee ====================

    @Test
    @DisplayName("getAssetsByEmployee - returns employee assets")
    void getAssetsByEmployee_success() {
        Asset asset = buildAsset(AssetStatus.ASSIGNED);
        asset.setAssignedTo(employeeId);
        when(assetRepository.findByTenantIdAndAssignedTo(tenantId, employeeId)).thenReturn(List.of(asset));

        List<AssetResponse> result = assetManagementService.getAssetsByEmployee(employeeId);

        assertThat(result).hasSize(1);
    }

    // ==================== ApprovalCallbackHandler ====================

    @Test
    @DisplayName("getEntityType - returns ASSET_REQUEST")
    void getEntityType_returnsAssetRequest() {
        assertThat(assetManagementService.getEntityType()).isEqualTo(WorkflowDefinition.EntityType.ASSET_REQUEST);
    }

    @Test
    @DisplayName("onApproved - assigns asset when pending assignment")
    void onApproved_assignsPendingAsset() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        asset.setAssignedTo(employeeId);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));

        assetManagementService.onApproved(tenantId, assetId, UUID.randomUUID());

        verify(assetRepository).save(argThat(saved ->
                saved.getStatus() == AssetStatus.ASSIGNED
        ));
    }

    @Test
    @DisplayName("onRejected - clears pending assignment")
    void onRejected_clearsPendingAssignment() {
        Asset asset = buildAsset(AssetStatus.AVAILABLE);
        asset.setAssignedTo(employeeId);
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.of(asset));

        assetManagementService.onRejected(tenantId, assetId, UUID.randomUUID(), "Not approved");

        verify(assetRepository).save(argThat(saved ->
                saved.getAssignedTo() == null
        ));
    }

    @Test
    @DisplayName("onApproved - handles missing asset gracefully")
    void onApproved_missingAsset() {
        when(assetRepository.findByIdAndTenantId(assetId, tenantId)).thenReturn(Optional.empty());

        assetManagementService.onApproved(tenantId, assetId, UUID.randomUUID());

        verify(assetRepository, never()).save(any());
    }
}
