package com.hrms.api.payment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Import;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.api.payment.dto.PaymentConfigDto;
import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.exception.FeatureDisabledException;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.PaymentFeatureGuard;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.payment.PaymentConfig;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for PaymentConfigController.
 * Tests config save, connection test, feature guard enforcement,
 * and permission annotation presence on every endpoint.
 */
@WebMvcTest(PaymentConfigController.class)
@ContextConfiguration(classes = {PaymentConfigController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PaymentConfigController Unit Tests")
class PaymentConfigControllerTest {

    private static final String BASE_URL = "/api/v1/payments/config";
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private PaymentService paymentService;
    @MockitoBean
    private PaymentFeatureGuard paymentFeatureGuard;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;
    private PaymentConfigDto validConfigRequest;
    private PaymentConfig savedConfig;

    @BeforeEach
    void setUp() {
        validConfigRequest = PaymentConfigDto.builder()
                .provider(PaymentConfig.PaymentProvider.RAZORPAY)
                .apiKey("rzp_test_abc123xyz")
                .merchantId("MERCHANT_001")
                .webhookSecret("wh_secret_test")
                .isActive(true)
                .configKey("razorpay-prod")
                .build();

        // PaymentConfig uses @SuperBuilder — construct via setter pattern
        savedConfig = new PaymentConfig();
        savedConfig.setProvider(PaymentConfig.PaymentProvider.RAZORPAY);
        savedConfig.setApiKeyEncrypted("****xyz");
        savedConfig.setMerchantId("MERCHANT_001");
        savedConfig.setIsActive(true);
        savedConfig.setConfigKey("razorpay-prod");
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/payments/config  — Save Payment Config
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST / — Save Payment Config")
    class SavePaymentConfigEndpoint {

        @Test
        @DisplayName("Should return 201 with saved config when payments are enabled")
        void shouldReturn201WithSavedConfigWhenEnabled() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            when(paymentService.savePaymentConfig(any(PaymentConfig.class))).thenReturn(savedConfig);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.merchantId").value("MERCHANT_001"))
                    .andExpect(jsonPath("$.provider").value("RAZORPAY"))
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(paymentFeatureGuard).requirePaymentsEnabled();
            verify(paymentService).savePaymentConfig(any(PaymentConfig.class));
        }

        @Test
        @DisplayName("Should mask API key in response — apiKey field must not be present in response")
        void shouldMaskApiKeyInResponse() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            when(paymentService.savePaymentConfig(any(PaymentConfig.class))).thenReturn(savedConfig);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().isCreated())
                    // apiKey plaintext must never appear in response
                    .andExpect(jsonPath("$.apiKey").doesNotExist());
        }

        @Test
        @DisplayName("Should call PaymentFeatureGuard before processing config save")
        void shouldCallFeatureGuardBeforeProcessing() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            when(paymentService.savePaymentConfig(any(PaymentConfig.class))).thenReturn(savedConfig);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().isCreated());

            // Guard must be called before service
            var inOrder = inOrder(paymentFeatureGuard, paymentService);
            inOrder.verify(paymentFeatureGuard).requirePaymentsEnabled();
            inOrder.verify(paymentService).savePaymentConfig(any(PaymentConfig.class));
        }

        @Test
        @DisplayName("Should propagate FeatureDisabledException when payments disabled")
        void shouldPropagateFeatureDisabledExceptionWhenPaymentsDisabled() throws Exception {
            doThrow(new FeatureDisabledException("payments",
                    "The payments module is currently disabled."))
                    .when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().is5xxServerError());

            verify(paymentService, never()).savePaymentConfig(any());
        }

        @Test
        @DisplayName("POST / has @RequiresPermission(PAYMENT_CONFIG_MANAGE)")
        void saveConfigEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = PaymentConfigController.class.getMethod(
                    "savePaymentConfig", PaymentConfigDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.PAYMENT_CONFIG_MANAGE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/payments/config/test-connection
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /test-connection — Test Payment Gateway Connection")
    class TestConnectionEndpoint {

        @Test
        @DisplayName("Should return 200 with success message when payments are enabled")
        void shouldReturn200WhenPaymentsEnabled() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL + "/test-connection")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().isOk())
                    .andExpect(content().string(
                            org.hamcrest.Matchers.containsString("Connection test initiated")));

            verify(paymentFeatureGuard).requirePaymentsEnabled();
        }

        @Test
        @DisplayName("Should call feature guard before test-connection")
        void shouldCallFeatureGuardBeforeTestConnection() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL + "/test-connection")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().isOk());

            verify(paymentFeatureGuard, times(1)).requirePaymentsEnabled();
        }

        @Test
        @DisplayName("POST /test-connection has @RequiresPermission(PAYMENT_CONFIG_MANAGE)")
        void testConnectionEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = PaymentConfigController.class.getMethod(
                    "testConnection", PaymentConfigDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.PAYMENT_CONFIG_MANAGE);
        }

        @Test
        @DisplayName("Should not invoke paymentService for connection test (no persistence)")
        void shouldNotInvokePaymentServiceOnConnectionTest() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL + "/test-connection")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validConfigRequest)))
                    .andExpect(status().isOk());

            // Connection test is a no-op in this impl — service should not be called
            verifyNoInteractions(paymentService);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Controller-level annotation checks
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Controller-level annotation validation")
    class AnnotationValidation {

        @Test
        @DisplayName("Controller has @RestController annotation")
        void controllerHasRestControllerAnnotation() {
            assertThat(PaymentConfigController.class
                    .isAnnotationPresent(org.springframework.web.bind.annotation.RestController.class))
                    .isTrue();
        }

        @Test
        @DisplayName("Controller maps to /api/v1/payments/config base path")
        void controllerMapsToCorrectBasePath() {
            org.springframework.web.bind.annotation.RequestMapping mapping =
                    PaymentConfigController.class.getAnnotation(
                            org.springframework.web.bind.annotation.RequestMapping.class);

            assertThat(mapping).isNotNull();
            assertThat(mapping.value()).contains("/api/v1/payments/config");
        }
    }
}
