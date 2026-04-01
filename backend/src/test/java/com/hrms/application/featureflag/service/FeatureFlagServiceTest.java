package com.hrms.application.featureflag.service;

import com.hrms.application.featureflag.FeatureFlagService;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.infrastructure.featureflag.FeatureFlagRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("FeatureFlagService Tests")
class FeatureFlagServiceTest {

    @Mock
    private FeatureFlagRepository featureFlagRepository;

    @InjectMocks
    private FeatureFlagService featureFlagService;

    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;

    @BeforeAll
    static void setUpClass() {
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
    }

    // ==================== isFeatureEnabled ====================

    @Test
    @DisplayName("isFeatureEnabled - returns true when enabled")
    void isFeatureEnabled_true() {
        when(featureFlagRepository.isFeatureEnabled(tenantId, "MATRIX_RBAC")).thenReturn(Optional.of(true));

        boolean result = featureFlagService.isFeatureEnabled("MATRIX_RBAC");

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("isFeatureEnabled - returns false when disabled")
    void isFeatureEnabled_false() {
        when(featureFlagRepository.isFeatureEnabled(tenantId, "MATRIX_RBAC")).thenReturn(Optional.of(false));

        boolean result = featureFlagService.isFeatureEnabled("MATRIX_RBAC");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isFeatureEnabled - defaults to false when not found")
    void isFeatureEnabled_defaultFalse() {
        when(featureFlagRepository.isFeatureEnabled(tenantId, "UNKNOWN")).thenReturn(Optional.empty());

        boolean result = featureFlagService.isFeatureEnabled("UNKNOWN");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("isFeatureEnabled - defaults to false when no tenant context")
    void isFeatureEnabled_noTenantContext() {
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(null);

        boolean result = featureFlagService.isFeatureEnabled("MATRIX_RBAC");

        assertThat(result).isFalse();
    }

    // ==================== isFeatureEnabled(key, tenantId) ====================

    @Test
    @DisplayName("isFeatureEnabled(key, tenantId) - checks specific tenant")
    void isFeatureEnabled_specificTenant() {
        UUID otherTenant = UUID.randomUUID();
        when(featureFlagRepository.isFeatureEnabled(otherTenant, "FEATURE_X")).thenReturn(Optional.of(true));

        boolean result = featureFlagService.isFeatureEnabled("FEATURE_X", otherTenant);

        assertThat(result).isTrue();
    }

    // ==================== getAllFlags ====================

    @Test
    @DisplayName("getAllFlags - returns all flags for tenant")
    void getAllFlags_success() {
        FeatureFlag flag = new FeatureFlag();
        flag.setFeatureKey("MATRIX_RBAC");
        flag.setEnabled(true);
        flag.setTenantId(tenantId);

        when(featureFlagRepository.findByTenantId(tenantId)).thenReturn(List.of(flag));

        List<FeatureFlag> result = featureFlagService.getAllFlags();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getFeatureKey()).isEqualTo("MATRIX_RBAC");
    }

    // ==================== getEnabledFeatures ====================

    @Test
    @DisplayName("getEnabledFeatures - returns only enabled feature keys")
    void getEnabledFeatures_success() {
        FeatureFlag enabled = new FeatureFlag();
        enabled.setFeatureKey("FEATURE_A");
        enabled.setEnabled(true);
        enabled.setTenantId(tenantId);

        when(featureFlagRepository.findByTenantIdAndEnabled(tenantId, true)).thenReturn(List.of(enabled));

        List<String> result = featureFlagService.getEnabledFeatures();

        assertThat(result).containsExactly("FEATURE_A");
    }
}
