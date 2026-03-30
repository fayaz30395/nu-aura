package com.hrms.api.featureflag;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.featureflag.FeatureFlagService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.domain.user.RoleScope;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for FeatureFlagController.
 * Tests CRUD endpoints, toggle, @RequiresPermission annotations, and the open /check/{featureKey} endpoint.
 */
@WebMvcTest(FeatureFlagController.class)
@ContextConfiguration(classes = {FeatureFlagController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FeatureFlagController Unit Tests")
class FeatureFlagControllerTest {

    private static final String BASE_URL = "/api/v1/feature-flags";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockBean
    private FeatureFlagService featureFlagService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    @MockBean
    private MeterRegistry meterRegistry;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private FeatureFlag enabledFlag;
    private FeatureFlag disabledFlag;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.SYSTEM_ADMIN, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);

        enabledFlag = FeatureFlag.builder()
                .id(UUID.randomUUID())
                .tenantId(TENANT_ID)
                .featureKey("MULTI_CURRENCY")
                .featureName("Multi-Currency Support")
                .build();

        disabledFlag = FeatureFlag.builder()
                .id(UUID.randomUUID())
                .tenantId(TENANT_ID)
                .featureKey("ADVANCED_ANALYTICS")
                .featureName("Advanced Analytics")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ==================== @RequiresPermission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getAllFlags should require SYSTEM_ADMIN permission")
        void getAllFlags_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = FeatureFlagController.class.getMethod("getAllFlags");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("getFlagsAsMap should require SYSTEM_ADMIN permission")
        void getFlagsAsMap_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = FeatureFlagController.class.getMethod("getFlagsAsMap");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("setFeatureFlag should require SYSTEM_ADMIN permission")
        void setFeatureFlag_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = FeatureFlagController.class.getMethod("setFeatureFlag",
                    FeatureFlagController.FeatureFlagRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("toggleFeature should require SYSTEM_ADMIN permission")
        void toggleFeature_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = FeatureFlagController.class.getMethod("toggleFeature", String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("checkFeature should NOT require any permission (public endpoint)")
        void checkFeature_shouldNotRequirePermission() throws NoSuchMethodException {
            Method method = FeatureFlagController.class.getMethod("checkFeature", String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            // checkFeature is intentionally open — no @RequiresPermission
            assertThat(annotation).isNull();
        }

        @Test
        @DisplayName("getFlagsByCategory should require SYSTEM_ADMIN permission")
        void getFlagsByCategory_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = FeatureFlagController.class.getMethod("getFlagsByCategory", String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("SYSTEM_ADMIN permission constant should have expected value")
        void systemAdminPermissionConstant_shouldHaveExpectedValue() {
            assertThat(Permission.SYSTEM_ADMIN).isEqualTo("SYSTEM:ADMIN");
        }
    }

    // ==================== GET /api/v1/feature-flags ====================

    @Nested
    @DisplayName("GET /api/v1/feature-flags — List All Flags")
    class GetAllFlagsTests {

        @Test
        @DisplayName("Should return list of feature flags with HTTP 200")
        void getAllFlags_returnsFlags() throws Exception {
            when(featureFlagService.getAllFlags()).thenReturn(List.of(enabledFlag, disabledFlag));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(2));

            verify(featureFlagService).getAllFlags();
        }

        @Test
        @DisplayName("Should return empty list when no flags defined")
        void getAllFlags_returnsEmptyList_whenNoFlags() throws Exception {
            when(featureFlagService.getAllFlags()).thenReturn(List.of());

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    // ==================== GET /api/v1/feature-flags/map ====================

    @Nested
    @DisplayName("GET /api/v1/feature-flags/map — Get Flags As Map")
    class GetFlagsAsMapTests {

        @Test
        @DisplayName("Should return flags as key-value map")
        void getFlagsAsMap_returnsMap() throws Exception {
            when(featureFlagService.getFlagsAsMap())
                    .thenReturn(Map.of("MULTI_CURRENCY", true, "ADVANCED_ANALYTICS", false));

            mockMvc.perform(get(BASE_URL + "/map").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.MULTI_CURRENCY").value(true))
                    .andExpect(jsonPath("$.ADVANCED_ANALYTICS").value(false));

            verify(featureFlagService).getFlagsAsMap();
        }
    }

    // ==================== GET /api/v1/feature-flags/enabled ====================

    @Nested
    @DisplayName("GET /api/v1/feature-flags/enabled — Get Enabled Features")
    class GetEnabledFeaturesTests {

        @Test
        @DisplayName("Should return list of enabled feature keys")
        void getEnabledFeatures_returnsEnabledKeys() throws Exception {
            when(featureFlagService.getEnabledFeatures())
                    .thenReturn(List.of("MULTI_CURRENCY", "PROBATION_TRACKING"));

            mockMvc.perform(get(BASE_URL + "/enabled").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0]").value("MULTI_CURRENCY"));

            verify(featureFlagService).getEnabledFeatures();
        }
    }

    // ==================== GET /api/v1/feature-flags/check/{featureKey} ====================

    @Nested
    @DisplayName("GET /api/v1/feature-flags/check/{featureKey} — Check Single Feature (Public)")
    class CheckFeatureTests {

        @Test
        @DisplayName("Should return enabled=true for an enabled feature")
        void checkFeature_returnsTrue_whenEnabled() throws Exception {
            when(featureFlagService.isFeatureEnabled("MULTI_CURRENCY")).thenReturn(true);

            mockMvc.perform(get(BASE_URL + "/check/MULTI_CURRENCY").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.featureKey").value("MULTI_CURRENCY"))
                    .andExpect(jsonPath("$.enabled").value(true));

            verify(featureFlagService).isFeatureEnabled("MULTI_CURRENCY");
        }

        @Test
        @DisplayName("Should return enabled=false for a disabled feature")
        void checkFeature_returnsFalse_whenDisabled() throws Exception {
            when(featureFlagService.isFeatureEnabled("ADVANCED_ANALYTICS")).thenReturn(false);

            mockMvc.perform(get(BASE_URL + "/check/ADVANCED_ANALYTICS").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.featureKey").value("ADVANCED_ANALYTICS"))
                    .andExpect(jsonPath("$.enabled").value(false));
        }

        @Test
        @DisplayName("Should return featureKey in response matching path variable")
        void checkFeature_echoesFeatureKey() throws Exception {
            when(featureFlagService.isFeatureEnabled("SHIFT_MANAGEMENT")).thenReturn(true);

            mockMvc.perform(get(BASE_URL + "/check/SHIFT_MANAGEMENT").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.featureKey").value("SHIFT_MANAGEMENT"));
        }
    }

    // ==================== GET /api/v1/feature-flags/category/{category} ====================

    @Nested
    @DisplayName("GET /api/v1/feature-flags/category/{category} — Get By Category")
    class GetFlagsByCategoryTests {

        @Test
        @DisplayName("Should return flags filtered by category")
        void getFlagsByCategory_returnsFilteredFlags() throws Exception {
            when(featureFlagService.getFlagsByCategory("PAYROLL"))
                    .thenReturn(List.of(enabledFlag));

            mockMvc.perform(get(BASE_URL + "/category/PAYROLL").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(featureFlagService).getFlagsByCategory("PAYROLL");
        }

        @Test
        @DisplayName("Should return empty list for unknown category")
        void getFlagsByCategory_returnsEmptyList_whenCategoryUnknown() throws Exception {
            when(featureFlagService.getFlagsByCategory("UNKNOWN")).thenReturn(List.of());

            mockMvc.perform(get(BASE_URL + "/category/UNKNOWN").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    // ==================== POST /api/v1/feature-flags ====================

    @Nested
    @DisplayName("POST /api/v1/feature-flags — Create or Update Flag")
    class SetFeatureFlagTests {

        @Test
        @DisplayName("Should create or update feature flag and return HTTP 200")
        void setFeatureFlag_createsOrUpdatesFlag() throws Exception {
            FeatureFlagController.FeatureFlagRequest request =
                    new FeatureFlagController.FeatureFlagRequest(
                            "NEW_FEATURE", true, "New Feature", "A new feature flag", "GENERAL");

            when(featureFlagService.setFeatureFlag(
                    anyString(), anyBoolean(), anyString(), anyString(), anyString()))
                    .thenReturn(enabledFlag);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(featureFlagService).setFeatureFlag(
                    anyString(), anyBoolean(), anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should return 400 when featureKey is blank")
        void setFeatureFlag_returns400_whenFeatureKeyBlank() throws Exception {
            FeatureFlagController.FeatureFlagRequest request =
                    new FeatureFlagController.FeatureFlagRequest(
                            "", true, "Name", "Desc", "CAT");

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when request body is missing")
        void setFeatureFlag_returns400_whenBodyMissing() throws Exception {
            mockMvc.perform(post(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== POST /api/v1/feature-flags/{featureKey}/toggle ====================

    @Nested
    @DisplayName("POST /api/v1/feature-flags/{featureKey}/toggle — Toggle Feature")
    class ToggleFeatureTests {

        @Test
        @DisplayName("Should toggle feature and return updated flag")
        void toggleFeature_returnsToggledFlag() throws Exception {
            when(featureFlagService.toggleFeature("MULTI_CURRENCY")).thenReturn(disabledFlag);

            mockMvc.perform(post(BASE_URL + "/MULTI_CURRENCY/toggle")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(featureFlagService).toggleFeature("MULTI_CURRENCY");
        }

        @Test
        @DisplayName("Should pass correct featureKey to service")
        void toggleFeature_passesFeatureKeyToService() throws Exception {
            when(featureFlagService.toggleFeature("SHIFT_MANAGEMENT")).thenReturn(enabledFlag);

            mockMvc.perform(post(BASE_URL + "/SHIFT_MANAGEMENT/toggle")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(featureFlagService).toggleFeature("SHIFT_MANAGEMENT");
        }

        @Test
        @DisplayName("Should return 500 when service fails")
        void toggleFeature_returns500_onServiceError() throws Exception {
            when(featureFlagService.toggleFeature(anyString()))
                    .thenThrow(new RuntimeException("Toggle failed"));

            mockMvc.perform(post(BASE_URL + "/BROKEN_FLAG/toggle")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }
    }
}
