package com.hrms.infrastructure.payment;

/**
 * Interface for Payment Gateway operations
 */
public interface PaymentGatewayService {

    /**
     * Create a payment intent for processing payment
     */
    PaymentResponse createPayment(PaymentRequest request);

    /**
     * Capture an authorized payment
     */
    PaymentResponse capturePayment(String paymentId);

    /**
     * Refund a completed payment
     */
    PaymentResponse refundPayment(String paymentId, Long amount, String reason);

    /**
     * Get payment status
     */
    PaymentResponse getPaymentStatus(String paymentId);

    /**
     * Cancel a pending payment
     */
    PaymentResponse cancelPayment(String paymentId);

    /**
     * Validate if the payment gateway is properly configured
     */
    boolean isConfigured();

    /**
     * Test the payment gateway connection
     */
    boolean testConnection();

    /**
     * Get supported payment methods
     */
    String[] getSupportedPaymentMethods();
}
