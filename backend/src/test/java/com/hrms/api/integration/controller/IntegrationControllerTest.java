package com.hrms.api.integration.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.integration.dto.*;
import com.hrms.common.security.*;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.infrastructure.payment.PaymentGatewayService;
import com.hrms.infrastructure.payment.PaymentRequest;
import com.hrms.infrastructure.payment.PaymentResponse;
import com.hrms.infrastructure.sms.SmsService;
import com.hrms.infrastructure.sms.SmsTemplate;
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

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IntegrationController.class)
@ContextConfiguration(classes = {IntegrationController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("IntegrationController Unit Tests")
class IntegrationControllerTest {

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SmsService smsService;

    @MockBean
    private SmsTemplate smsTemplate;

    @MockBean
    private PaymentGatewayService paymentGatewayService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    private static final String BASE_URL = "/api/v1/integrations";

    // ===================== SMS Tests =====================

    @Nested
    @DisplayName("GET /sms/status")
    class GetSmsStatusTests {

        @Test
        @DisplayName("Should return SMS status when configured")
        void shouldReturnSmsStatusWhenConfigured() throws Exception {
            when(smsService.isConfigured()).thenReturn(true);

            mockMvc.perform(get(BASE_URL + "/sms/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.integrationType").value("SMS"))
                    .andExpect(jsonPath("$.provider").value("Twilio"))
                    .andExpect(jsonPath("$.configured").value(true))
                    .andExpect(jsonPath("$.enabled").value(true))
                    .andExpect(jsonPath("$.message").value("SMS service is operational"));

            verify(smsService).isConfigured();
        }

        @Test
        @DisplayName("Should return unconfigured status when SMS not set up")
        void shouldReturnUnconfiguredWhenSmsNotSetUp() throws Exception {
            when(smsService.isConfigured()).thenReturn(false);

            mockMvc.perform(get(BASE_URL + "/sms/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.configured").value(false))
                    .andExpect(jsonPath("$.enabled").value(false))
                    .andExpect(jsonPath("$.message").value("SMS service is not configured"));
        }
    }

    @Nested
    @DisplayName("POST /sms/test")
    class TestSmsTests {

        @Test
        @DisplayName("Should return success when test SMS sent")
        void shouldReturnSuccessWhenTestSmsSent() throws Exception {
            SmsTestRequest request = SmsTestRequest.builder()
                    .phoneNumber("+14155552671")
                    .build();

            when(smsService.testConnection("+14155552671")).thenReturn(true);

            mockMvc.perform(post(BASE_URL + "/sms/test")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Test SMS sent successfully"));

            verify(smsService).testConnection("+14155552671");
        }

        @Test
        @DisplayName("Should return failure when test SMS fails")
        void shouldReturnFailureWhenTestSmsFails() throws Exception {
            SmsTestRequest request = SmsTestRequest.builder()
                    .phoneNumber("+14155552671")
                    .build();

            when(smsService.testConnection(anyString())).thenReturn(false);

            mockMvc.perform(post(BASE_URL + "/sms/test")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Failed to send test SMS"));
        }

        @Test
        @DisplayName("Should return error response when exception thrown during SMS test")
        void shouldReturnErrorWhenExceptionThrown() throws Exception {
            SmsTestRequest request = SmsTestRequest.builder()
                    .phoneNumber("+14155552671")
                    .build();

            when(smsService.testConnection(anyString()))
                    .thenThrow(new RuntimeException("Connection refused"));

            mockMvc.perform(post(BASE_URL + "/sms/test")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Error:")));
        }

        @Test
        @DisplayName("Should return 400 when phone number is missing")
        void shouldReturn400WhenPhoneNumberMissing() throws Exception {
            SmsSendRequest request = SmsSendRequest.builder().build();

            mockMvc.perform(post(BASE_URL + "/sms/test")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /sms/send")
    class SendSmsTests {

        @Test
        @DisplayName("Should send plain SMS successfully")
        void shouldSendPlainSmsSuccessfully() throws Exception {
            SmsSendRequest request = SmsSendRequest.builder()
                    .phoneNumber("+14155552671")
                    .message("Hello, this is a test message")
                    .build();

            when(smsService.sendSms("+14155552671", "Hello, this is a test message"))
                    .thenReturn("MSG-001");

            mockMvc.perform(post(BASE_URL + "/sms/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.messageId").value("MSG-001"))
                    .andExpect(jsonPath("$.phoneNumber").value("+14155552671"));

            verify(smsService).sendSms("+14155552671", "Hello, this is a test message");
        }

        @Test
        @DisplayName("Should send templated SMS when templateId is provided")
        void shouldSendTemplatedSmsWhenTemplateIdProvided() throws Exception {
            Map<String, String> variables = new HashMap<>();
            variables.put("name", "John");
            SmsSendRequest request = SmsSendRequest.builder()
                    .phoneNumber("+14155552671")
                    .templateId("OTP_TEMPLATE")
                    .variables(variables)
                    .build();

            when(smsService.sendTemplatedSms("+14155552671", "OTP_TEMPLATE", variables))
                    .thenReturn("MSG-002");

            mockMvc.perform(post(BASE_URL + "/sms/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.messageId").value("MSG-002"));

            verify(smsService).sendTemplatedSms(eq("+14155552671"), eq("OTP_TEMPLATE"), any());
        }

        @Test
        @DisplayName("Should return error response when SMS send fails")
        void shouldReturnErrorWhenSmsSendFails() throws Exception {
            SmsSendRequest request = SmsSendRequest.builder()
                    .phoneNumber("+14155552671")
                    .message("Test message")
                    .build();

            when(smsService.sendSms(anyString(), anyString()))
                    .thenThrow(new RuntimeException("Provider error"));

            mockMvc.perform(post(BASE_URL + "/sms/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorMessage").value("Provider error"));
        }
    }

    @Nested
    @DisplayName("GET /sms/templates")
    class GetSmsTemplatesTests {

        @Test
        @DisplayName("Should return all SMS templates")
        void shouldReturnAllSmsTemplates() throws Exception {
            Map<String, String> templates = new HashMap<>();
            templates.put("OTP_TEMPLATE", "Your OTP is {{otp}}");
            templates.put("WELCOME_TEMPLATE", "Welcome {{name}}!");

            when(smsTemplate.getAllTemplates()).thenReturn(templates);

            mockMvc.perform(get(BASE_URL + "/sms/templates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.OTP_TEMPLATE").exists())
                    .andExpect(jsonPath("$.WELCOME_TEMPLATE").exists());

            verify(smsTemplate).getAllTemplates();
        }
    }

    // ===================== Payment Gateway Tests =====================

    @Nested
    @DisplayName("GET /payment/status")
    class GetPaymentStatusTests {

        @Test
        @DisplayName("Should return payment gateway status when configured")
        void shouldReturnPaymentStatusWhenConfigured() throws Exception {
            when(paymentGatewayService.isConfigured()).thenReturn(true);
            when(paymentGatewayService.getSupportedPaymentMethods())
                    .thenReturn(new String[]{"CARD", "BANK_TRANSFER"});

            mockMvc.perform(get(BASE_URL + "/payment/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.integrationType").value("PAYMENT_GATEWAY"))
                    .andExpect(jsonPath("$.provider").value("Stripe"))
                    .andExpect(jsonPath("$.configured").value(true))
                    .andExpect(jsonPath("$.supportedMethods").isArray());

            verify(paymentGatewayService).isConfigured();
        }

        @Test
        @DisplayName("Should return unconfigured status when payment not set up")
        void shouldReturnUnconfiguredWhenPaymentNotSetUp() throws Exception {
            when(paymentGatewayService.isConfigured()).thenReturn(false);

            mockMvc.perform(get(BASE_URL + "/payment/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.configured").value(false))
                    .andExpect(jsonPath("$.supportedMethods").doesNotExist());
        }
    }

    @Nested
    @DisplayName("POST /payment/test")
    class TestPaymentGatewayTests {

        @Test
        @DisplayName("Should return success when payment gateway connection succeeds")
        void shouldReturnSuccessWhenConnectionSucceeds() throws Exception {
            when(paymentGatewayService.testConnection()).thenReturn(true);

            mockMvc.perform(post(BASE_URL + "/payment/test"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Payment gateway connection successful"));
        }

        @Test
        @DisplayName("Should return failure when payment gateway test fails")
        void shouldReturnFailureWhenTestFails() throws Exception {
            when(paymentGatewayService.testConnection()).thenReturn(false);

            mockMvc.perform(post(BASE_URL + "/payment/test"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Payment gateway connection failed"));
        }

        @Test
        @DisplayName("Should return error when exception thrown during payment test")
        void shouldReturnErrorWhenExceptionThrown() throws Exception {
            when(paymentGatewayService.testConnection())
                    .thenThrow(new RuntimeException("Stripe API unreachable"));

            mockMvc.perform(post(BASE_URL + "/payment/test"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Nested
    @DisplayName("POST /payment/create")
    class CreatePaymentTests {

        @Test
        @DisplayName("Should create payment successfully")
        void shouldCreatePaymentSuccessfully() throws Exception {
            PaymentRequest request = PaymentRequest.builder()
                    .amount(5000L)
                    .currency("USD")
                    .description("Salary advance")
                    .build();

            PaymentResponse response = PaymentResponse.builder()
                    .paymentId("PAY-001")
                    .status("CREATED")
                    .amount(5000L)
                    .currency("USD")
                    .build();

            when(paymentGatewayService.createPayment(any(PaymentRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post(BASE_URL + "/payment/create")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.paymentId").value("PAY-001"))
                    .andExpect(jsonPath("$.status").value("CREATED"));

            verify(paymentGatewayService).createPayment(any(PaymentRequest.class));
        }
    }

    @Nested
    @DisplayName("GET /payment/supported-methods")
    class GetSupportedPaymentMethodsTests {

        @Test
        @DisplayName("Should return supported payment methods")
        void shouldReturnSupportedPaymentMethods() throws Exception {
            when(paymentGatewayService.getSupportedPaymentMethods())
                    .thenReturn(new String[]{"CARD", "BANK_TRANSFER", "UPI"});

            mockMvc.perform(get(BASE_URL + "/payment/supported-methods"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(3));

            verify(paymentGatewayService).getSupportedPaymentMethods();
        }
    }

    // ===================== General Integration Status Tests =====================

    @Nested
    @DisplayName("GET /status")
    class GetAllIntegrationsStatusTests {

        @Test
        @DisplayName("Should return all integrations status map")
        void shouldReturnAllIntegrationsStatus() throws Exception {
            when(smsService.isConfigured()).thenReturn(true);
            when(paymentGatewayService.isConfigured()).thenReturn(false);

            mockMvc.perform(get(BASE_URL + "/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.SMS").exists())
                    .andExpect(jsonPath("$.PAYMENT").exists())
                    .andExpect(jsonPath("$.SMS.configured").value(true))
                    .andExpect(jsonPath("$.PAYMENT.configured").value(false));

            verify(smsService).isConfigured();
            verify(paymentGatewayService).isConfigured();
        }

        @Test
        @DisplayName("Should return both integrations as unconfigured when none set up")
        void shouldReturnBothUnconfiguredWhenNoneSetUp() throws Exception {
            when(smsService.isConfigured()).thenReturn(false);
            when(paymentGatewayService.isConfigured()).thenReturn(false);

            mockMvc.perform(get(BASE_URL + "/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.SMS.enabled").value(false))
                    .andExpect(jsonPath("$.PAYMENT.enabled").value(false));
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getSmsStatus should require SYSTEM_ADMIN permission")
        void getSmsStatusShouldRequireSystemAdmin() throws Exception {
            var method = IntegrationController.class.getMethod("getSmsStatus");
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getSmsStatus must have @RequiresPermission");
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.SYSTEM_ADMIN),
                    "getSmsStatus must require SYSTEM_ADMIN permission"
            );
        }

        @Test
        @DisplayName("testSms should require SYSTEM_ADMIN permission")
        void testSmsShouldRequireSystemAdmin() throws Exception {
            var method = IntegrationController.class.getMethod("testSms", SmsTestRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "testSms must have @RequiresPermission");
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.SYSTEM_ADMIN)
            );
        }

        @Test
        @DisplayName("getAllIntegrationsStatus should require SYSTEM_ADMIN permission")
        void getAllIntegrationsStatusShouldRequireSystemAdmin() throws Exception {
            var method = IntegrationController.class.getMethod("getAllIntegrationsStatus");
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getAllIntegrationsStatus must have @RequiresPermission");
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.SYSTEM_ADMIN)
            );
        }
    }
}
