package com.hrms.domain.asset;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link AssetMaintenanceRequest} entity.
 * Validates default values, builder behaviour, and enum coverage.
 */
class AssetMaintenanceRequestTest {

    private static final UUID TENANT = UUID.randomUUID();
    private static final UUID ASSET = UUID.randomUUID();
    private static final UUID EMPLOYEE = UUID.randomUUID();

    @Nested
    @DisplayName("Default values")
    class DefaultValues {

        @Test
        @DisplayName("status should default to REQUESTED")
        void statusDefaultsToRequested() {
            AssetMaintenanceRequest req = AssetMaintenanceRequest.builder()
                    .tenantId(TENANT)
                    .assetId(ASSET)
                    .requestedBy(EMPLOYEE)
                    .maintenanceType(AssetMaintenanceRequest.MaintenanceType.REPAIR)
                    .issueDescription("Screen flickering")
                    .build();

            assertThat(req.getStatus()).isEqualTo(AssetMaintenanceRequest.MaintenanceStatus.REQUESTED);
        }

        @Test
        @DisplayName("priority should default to MEDIUM")
        void priorityDefaultsToMedium() {
            AssetMaintenanceRequest req = AssetMaintenanceRequest.builder()
                    .tenantId(TENANT)
                    .assetId(ASSET)
                    .requestedBy(EMPLOYEE)
                    .maintenanceType(AssetMaintenanceRequest.MaintenanceType.INSPECTION)
                    .issueDescription("Annual inspection")
                    .build();

            assertThat(req.getPriority()).isEqualTo(AssetMaintenanceRequest.MaintenancePriority.MEDIUM);
        }

        @Test
        @DisplayName("optional fields should be null by default")
        void optionalFieldsAreNull() {
            AssetMaintenanceRequest req = AssetMaintenanceRequest.builder()
                    .tenantId(TENANT)
                    .assetId(ASSET)
                    .requestedBy(EMPLOYEE)
                    .maintenanceType(AssetMaintenanceRequest.MaintenanceType.REPAIR)
                    .issueDescription("Broken key")
                    .build();

            assertThat(req.getAssignedVendor()).isNull();
            assertThat(req.getEstimatedCost()).isNull();
            assertThat(req.getActualCost()).isNull();
            assertThat(req.getScheduledDate()).isNull();
            assertThat(req.getCompletedDate()).isNull();
            assertThat(req.getResolutionNotes()).isNull();
            assertThat(req.getApprovedBy()).isNull();
        }
    }

    @Nested
    @DisplayName("Builder")
    class BuilderTests {

        @Test
        @DisplayName("should build a fully-populated maintenance request")
        void fullBuild() {
            UUID approver = UUID.randomUUID();
            LocalDate scheduled = LocalDate.of(2026, 4, 15);
            LocalDate completed = LocalDate.of(2026, 4, 18);

            AssetMaintenanceRequest req = AssetMaintenanceRequest.builder()
                    .tenantId(TENANT)
                    .assetId(ASSET)
                    .requestedBy(EMPLOYEE)
                    .maintenanceType(AssetMaintenanceRequest.MaintenanceType.UPGRADE)
                    .issueDescription("RAM upgrade to 32 GB")
                    .priority(AssetMaintenanceRequest.MaintenancePriority.HIGH)
                    .status(AssetMaintenanceRequest.MaintenanceStatus.COMPLETED)
                    .assignedVendor("TechFix Corp")
                    .estimatedCost(new BigDecimal("250.00"))
                    .actualCost(new BigDecimal("230.50"))
                    .scheduledDate(scheduled)
                    .completedDate(completed)
                    .resolutionNotes("Upgraded successfully")
                    .approvedBy(approver)
                    .build();

            assertThat(req.getTenantId()).isEqualTo(TENANT);
            assertThat(req.getAssetId()).isEqualTo(ASSET);
            assertThat(req.getRequestedBy()).isEqualTo(EMPLOYEE);
            assertThat(req.getMaintenanceType()).isEqualTo(AssetMaintenanceRequest.MaintenanceType.UPGRADE);
            assertThat(req.getIssueDescription()).isEqualTo("RAM upgrade to 32 GB");
            assertThat(req.getPriority()).isEqualTo(AssetMaintenanceRequest.MaintenancePriority.HIGH);
            assertThat(req.getStatus()).isEqualTo(AssetMaintenanceRequest.MaintenanceStatus.COMPLETED);
            assertThat(req.getAssignedVendor()).isEqualTo("TechFix Corp");
            assertThat(req.getEstimatedCost()).isEqualByComparingTo("250.00");
            assertThat(req.getActualCost()).isEqualByComparingTo("230.50");
            assertThat(req.getScheduledDate()).isEqualTo(scheduled);
            assertThat(req.getCompletedDate()).isEqualTo(completed);
            assertThat(req.getResolutionNotes()).isEqualTo("Upgraded successfully");
            assertThat(req.getApprovedBy()).isEqualTo(approver);
        }
    }

    @Nested
    @DisplayName("Soft delete (inherited)")
    class SoftDeleteTests {

        @Test
        @DisplayName("softDelete should mark entity as deleted")
        void softDelete() {
            AssetMaintenanceRequest req = AssetMaintenanceRequest.builder()
                    .tenantId(TENANT)
                    .assetId(ASSET)
                    .requestedBy(EMPLOYEE)
                    .maintenanceType(AssetMaintenanceRequest.MaintenanceType.REPAIR)
                    .issueDescription("Test")
                    .build();

            assertThat(req.isDeleted()).isFalse();
            req.softDelete();
            assertThat(req.isDeleted()).isTrue();
            assertThat(req.getDeletedAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Enum coverage")
    class EnumCoverage {

        @Test
        @DisplayName("MaintenanceType should have 5 values")
        void maintenanceTypeValues() {
            assertThat(AssetMaintenanceRequest.MaintenanceType.values()).hasSize(5);
        }

        @Test
        @DisplayName("MaintenancePriority should have 4 values")
        void priorityValues() {
            assertThat(AssetMaintenanceRequest.MaintenancePriority.values()).hasSize(4);
        }

        @Test
        @DisplayName("MaintenanceStatus should have 6 values")
        void statusValues() {
            assertThat(AssetMaintenanceRequest.MaintenanceStatus.values()).hasSize(6);
        }
    }
}
