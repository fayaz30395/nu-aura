package com.hrms.api.payment.controller;

import com.hrms.api.payment.dto.PaymentTransactionDto;
import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.security.PaymentFeatureGuard;
import com.hrms.domain.payment.PaymentRefund;
import com.hrms.domain.payment.PaymentTransaction;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for PaymentController.
 * Uses plain Mockito (no Spring context) for fast, reliable execution.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PaymentController Tests")
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private PaymentFeatureGuard paymentFeatureGuard;

    @InjectMocks
    private PaymentController paymentController;

    @Nested
    @DisplayName("initiatePayment")
    class InitiatePaymentTests {

        @Test
        @DisplayName("Should return 201 when payment initiated successfully")
        void shouldReturn201WhenPaymentInitiated() {
            PaymentTransactionDto requestDto = buildPaymentRequestDto();
            PaymentTransaction savedTxn = buildPaymentTransaction();
            savedTxn.setId(UUID.randomUUID());
            savedTxn.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);
            savedTxn.setExternalRef("ext-123");

            when(paymentService.initiatePayment(any(PaymentTransaction.class))).thenReturn(savedTxn);

            ResponseEntity<PaymentTransactionDto> response = paymentController.initiatePayment(requestDto);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getStatus()).isEqualTo(PaymentTransaction.PaymentStatus.PROCESSING);
            assertThat(response.getBody().getExternalRef()).isEqualTo("ext-123");
            verify(paymentFeatureGuard).requirePaymentsEnabled();
            verify(paymentService).initiatePayment(any(PaymentTransaction.class));
        }
    }

    @Nested
    @DisplayName("checkPaymentStatus")
    class CheckPaymentStatusTests {

        @Test
        @DisplayName("Should return 200 with payment status")
        void shouldReturn200WithPaymentStatus() {
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction txn = buildPaymentTransaction();
            txn.setId(paymentId);
            txn.setStatus(PaymentTransaction.PaymentStatus.COMPLETED);

            when(paymentService.checkPaymentStatus(paymentId)).thenReturn(txn);

            ResponseEntity<PaymentTransactionDto> response = paymentController.checkPaymentStatus(paymentId);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getStatus()).isEqualTo(PaymentTransaction.PaymentStatus.COMPLETED);
            verify(paymentFeatureGuard).requirePaymentsEnabled();
        }
    }

    @Nested
    @DisplayName("getPaymentDetails")
    class GetPaymentDetailsTests {

        @Test
        @DisplayName("Should return 200 with payment details")
        void shouldReturn200WithPaymentDetails() {
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction txn = buildPaymentTransaction();
            txn.setId(paymentId);
            txn.setTransactionRef("TXN-001");

            when(paymentService.getPaymentTransaction(paymentId)).thenReturn(txn);

            ResponseEntity<PaymentTransactionDto> response = paymentController.getPaymentDetails(paymentId);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getTransactionRef()).isEqualTo("TXN-001");
        }
    }

    @Nested
    @DisplayName("listPayments")
    class ListPaymentsTests {

        @Test
        @DisplayName("Should return paginated list of payments")
        void shouldReturnPaginatedPaymentList() {
            PaymentTransaction txn = buildPaymentTransaction();
            txn.setId(UUID.randomUUID());
            Page<PaymentTransaction> page = new PageImpl<>(List.of(txn));
            Pageable pageable = PageRequest.of(0, 10);

            when(paymentService.listPaymentTransactions(any(Pageable.class))).thenReturn(page);

            ResponseEntity<Page<PaymentTransactionDto>> response = paymentController.listPayments(pageable);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getTotalElements()).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("refundPayment")
    class RefundPaymentTests {

        @Test
        @DisplayName("Should return 200 when refund initiated")
        void shouldReturn200WhenRefundInitiated() {
            UUID paymentId = UUID.randomUUID();
            PaymentRefund refund = PaymentRefund.builder()
                    .id(UUID.randomUUID())
                    .status(PaymentRefund.RefundStatus.PROCESSING)
                    .build();

            when(paymentService.processRefund(eq(paymentId), eq("Customer request")))
                    .thenReturn(refund);

            ResponseEntity<String> response = paymentController.refundPayment(paymentId, "Customer request");

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isEqualTo("Refund initiated successfully");
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
