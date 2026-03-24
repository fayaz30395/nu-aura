package com.hrms.api.payment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.payment.dto.PaymentTransactionDto;
import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.security.PaymentFeatureGuard;
import com.hrms.domain.payment.PaymentRefund;
import com.hrms.domain.payment.PaymentTransaction;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for PaymentController.
 * Verifies REST endpoint behavior, request/response mapping, and HTTP status codes.
 */
@WebMvcTest(PaymentController.class)
@ContextConfiguration(classes = {PaymentController.class})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("PaymentController Tests")
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentService paymentService;

    @MockBean
    private PaymentFeatureGuard paymentFeatureGuard;

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    private static final String BASE_URL = "/api/v1/payments";

    @Nested
    @DisplayName("POST /api/v1/payments")
    class InitiatePaymentEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 201 when payment initiated successfully")
        void shouldReturn201WhenPaymentInitiated() throws Exception {
            // Given
            PaymentTransactionDto requestDto = buildPaymentRequestDto();
            PaymentTransaction savedTxn = buildPaymentTransaction();
            savedTxn.setId(UUID.randomUUID());
            savedTxn.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);
            savedTxn.setExternalRef("ext-123");

            when(paymentService.initiatePayment(any(PaymentTransaction.class))).thenReturn(savedTxn);

            // When/Then
            mockMvc.perform(post(BASE_URL)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestDto)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("PROCESSING"))
                    .andExpect(jsonPath("$.externalRef").value("ext-123"));

            verify(paymentFeatureGuard).requirePaymentsEnabled();
            verify(paymentService).initiatePayment(any(PaymentTransaction.class));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/payments/{paymentId}/status")
    class CheckPaymentStatusEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 200 with payment status")
        void shouldReturn200WithPaymentStatus() throws Exception {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction txn = buildPaymentTransaction();
            txn.setId(paymentId);
            txn.setStatus(PaymentTransaction.PaymentStatus.COMPLETED);

            when(paymentService.checkPaymentStatus(paymentId)).thenReturn(txn);

            // When/Then
            mockMvc.perform(get(BASE_URL + "/" + paymentId + "/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"));

            verify(paymentFeatureGuard).requirePaymentsEnabled();
        }
    }

    @Nested
    @DisplayName("GET /api/v1/payments/{paymentId}")
    class GetPaymentDetailsEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 200 with payment details")
        void shouldReturn200WithPaymentDetails() throws Exception {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction txn = buildPaymentTransaction();
            txn.setId(paymentId);
            txn.setTransactionRef("TXN-001");

            when(paymentService.getPaymentTransaction(paymentId)).thenReturn(txn);

            // When/Then
            mockMvc.perform(get(BASE_URL + "/" + paymentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.transactionRef").value("TXN-001"));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/payments")
    class ListPaymentsEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return paginated list of payments")
        void shouldReturnPaginatedPaymentList() throws Exception {
            // Given
            PaymentTransaction txn = buildPaymentTransaction();
            txn.setId(UUID.randomUUID());
            Page<PaymentTransaction> page = new PageImpl<>(List.of(txn));

            when(paymentService.listPaymentTransactions(any(Pageable.class))).thenReturn(page);

            // When/Then
            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.totalElements").value(1));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/payments/{paymentId}/refund")
    class RefundPaymentEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 200 when refund initiated")
        void shouldReturn200WhenRefundInitiated() throws Exception {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentRefund refund = PaymentRefund.builder()
                    .id(UUID.randomUUID())
                    .status(PaymentRefund.RefundStatus.PROCESSING)
                    .build();

            when(paymentService.processRefund(eq(paymentId), eq("Customer request")))
                    .thenReturn(refund);

            // When/Then
            mockMvc.perform(post(BASE_URL + "/" + paymentId + "/refund")
                            .with(csrf())
                            .param("reason", "Customer request"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Refund initiated successfully"));

            verify(paymentFeatureGuard).requirePaymentsEnabled();
        }
    }

    // ===================== Helpers =====================

    private PaymentTransactionDto buildPaymentRequestDto() {
        return PaymentTransactionDto.builder()
                .transactionRef("TXN-TEST-001")
                .type(PaymentTransaction.PaymentType.PAYROLL)
                .amount(new BigDecimal("5000.00"))
                .currency("INR")
                .provider(PaymentTransaction.PaymentProvider.RAZORPAY)
                .recipientName("John Doe")
                .recipientAccountNumber("1234567890")
                .recipientIfsc("SBIN0001234")
                .build();
    }

    private PaymentTransaction buildPaymentTransaction() {
        return PaymentTransaction.builder()
                .transactionRef("TXN-TEST-001")
                .type(PaymentTransaction.PaymentType.PAYROLL)
                .amount(new BigDecimal("5000.00"))
                .currency("INR")
                .provider(PaymentTransaction.PaymentProvider.RAZORPAY)
                .recipientName("John Doe")
                .build();
    }
}
