package com.hrms.application.notification.service;

import com.hrms.config.TwilioConfig;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmsNotificationService Tests")
class SmsNotificationServiceTest {

    @Mock
    private TwilioConfig twilioConfig;

    @InjectMocks
    private SmsNotificationService smsNotificationService;

    @BeforeEach
    void setUp() {
        // Default mock mode for testing
        lenient().when(twilioConfig.isMockMode()).thenReturn(true);
        lenient().when(twilioConfig.getFromNumber()).thenReturn("+15551234567");
        lenient().when(twilioConfig.getMaxMessageLength()).thenReturn(1600);
    }

    @Nested
    @DisplayName("Phone Number Validation Tests")
    class PhoneNumberValidationTests {

        @ParameterizedTest
        @ValueSource(strings = {"+15551234567", "+919876543210", "+442071234567", "+8613812345678"})
        @DisplayName("Should accept valid E.164 phone numbers")
        void shouldAcceptValidE164PhoneNumbers(String phoneNumber) {
            assertThat(smsNotificationService.isValidPhoneNumber(phoneNumber)).isTrue();
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "1234567890", "555-123-4567", "+0123456789", "phone", "+", "+1"})
        @DisplayName("Should reject invalid phone numbers")
        void shouldRejectInvalidPhoneNumbers(String phoneNumber) {
            assertThat(smsNotificationService.isValidPhoneNumber(phoneNumber)).isFalse();
        }

        @Test
        @DisplayName("Should reject null phone number")
        void shouldRejectNullPhoneNumber() {
            assertThat(smsNotificationService.isValidPhoneNumber(null)).isFalse();
        }

        @Test
        @DisplayName("Should reject blank phone number")
        void shouldRejectBlankPhoneNumber() {
            assertThat(smsNotificationService.isValidPhoneNumber("   ")).isFalse();
        }
    }

    @Nested
    @DisplayName("Phone Number Formatting Tests")
    class PhoneNumberFormattingTests {

        @Test
        @DisplayName("Should format US phone number with country code")
        void shouldFormatUSPhoneNumber() {
            String result = smsNotificationService.formatPhoneNumber("5551234567", "1");
            assertThat(result).isEqualTo("+15551234567");
        }

        @Test
        @DisplayName("Should format Indian phone number with country code")
        void shouldFormatIndianPhoneNumber() {
            String result = smsNotificationService.formatPhoneNumber("9876543210", "91");
            assertThat(result).isEqualTo("+919876543210");
        }

        @Test
        @DisplayName("Should preserve already formatted E.164 number")
        void shouldPreserveE164Number() {
            String result = smsNotificationService.formatPhoneNumber("+15551234567", "1");
            assertThat(result).isEqualTo("+15551234567");
        }

        @Test
        @DisplayName("Should handle phone number with special characters")
        void shouldHandlePhoneNumberWithSpecialCharacters() {
            String result = smsNotificationService.formatPhoneNumber("(555) 123-4567", "1");
            assertThat(result).isEqualTo("+15551234567");
        }

        @Test
        @DisplayName("Should return null for null input")
        void shouldReturnNullForNullInput() {
            String result = smsNotificationService.formatPhoneNumber(null, "1");
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("Should return null for invalid formatted number")
        void shouldReturnNullForInvalidFormattedNumber() {
            String result = smsNotificationService.formatPhoneNumber("abc", "1");
            assertThat(result).isNull();
        }
    }

    @Nested
    @DisplayName("Send SMS Tests (Mock Mode)")
    class SendSmsMockModeTests {

        @Test
        @DisplayName("Should send SMS in mock mode successfully")
        void shouldSendSmsInMockMode() {
            SmsNotificationService.SmsResult result = smsNotificationService.sendSms(
                    "+15559876543",
                    "Test message"
            );

            assertThat(result.success()).isTrue();
            assertThat(result.messageSid()).startsWith("MOCK_");
            assertThat(result.status()).contains("mock");
        }

        @Test
        @DisplayName("Should reject invalid phone number")
        void shouldRejectInvalidPhoneNumber() {
            SmsNotificationService.SmsResult result = smsNotificationService.sendSms(
                    "invalid-phone",
                    "Test message"
            );

            assertThat(result.success()).isFalse();
            assertThat(result.errorMessage()).contains("Invalid phone number");
        }

        @Test
        @DisplayName("Should truncate long message")
        void shouldTruncateLongMessage() {
            when(twilioConfig.getMaxMessageLength()).thenReturn(50);

            String longMessage = "A".repeat(100);
            SmsNotificationService.SmsResult result = smsNotificationService.sendSms(
                    "+15559876543",
                    longMessage
            );

            assertThat(result.success()).isTrue();
        }

        @Test
        @DisplayName("Should use custom from number when provided")
        void shouldUseCustomFromNumber() {
            SmsNotificationService.SmsResult result = smsNotificationService.sendSms(
                    "+15559876543",
                    "Test message",
                    "+15551111111"
            );

            assertThat(result.success()).isTrue();
        }

        @Test
        @DisplayName("Should store mock message in store")
        void shouldStoreMockMessageInStore() {
            smsNotificationService.clearMockMessageStore();

            smsNotificationService.sendSms("+15559876543", "Test message");

            Map<String, SmsNotificationService.MockSmsRecord> store = smsNotificationService.getMockMessageStore();
            assertThat(store).hasSize(1);

            SmsNotificationService.MockSmsRecord record = store.values().iterator().next();
            assertThat(record.to()).isEqualTo("+15559876543");
            assertThat(record.body()).isEqualTo("Test message");
        }
    }

    @Nested
    @DisplayName("Bulk SMS Tests")
    class BulkSmsTests {

        @Test
        @DisplayName("Should send bulk SMS to multiple recipients")
        void shouldSendBulkSms() {
            List<String> phoneNumbers = List.of("+15551111111", "+15552222222", "+15553333333");

            Map<String, SmsNotificationService.SmsResult> results = smsNotificationService.sendBulkSms(
                    phoneNumbers,
                    "Bulk message"
            );

            assertThat(results).hasSize(3);
            assertThat(results.values()).allMatch(SmsNotificationService.SmsResult::success);
        }

        @Test
        @DisplayName("Should handle mixed valid and invalid numbers in bulk")
        void shouldHandleMixedNumbersInBulk() {
            List<String> phoneNumbers = List.of("+15551111111", "invalid", "+15553333333");

            Map<String, SmsNotificationService.SmsResult> results = smsNotificationService.sendBulkSms(
                    phoneNumbers,
                    "Bulk message"
            );

            assertThat(results).hasSize(3);
            assertThat(results.get("+15551111111").success()).isTrue();
            assertThat(results.get("invalid").success()).isFalse();
            assertThat(results.get("+15553333333").success()).isTrue();
        }
    }

    @Nested
    @DisplayName("Service Status Tests")
    class ServiceStatusTests {

        @Test
        @DisplayName("Should return mock mode status")
        void shouldReturnMockModeStatus() {
            when(twilioConfig.isMockMode()).thenReturn(true);

            assertThat(smsNotificationService.isMockMode()).isTrue();
        }

        @Test
        @DisplayName("Should return service status")
        void shouldReturnServiceStatus() {
            when(twilioConfig.isMockMode()).thenReturn(true);
            when(twilioConfig.isConfigured()).thenReturn(false);
            when(twilioConfig.getFromNumber()).thenReturn("+15551234567");

            SmsNotificationService.ServiceStatus status = smsNotificationService.getStatus();

            assertThat(status.mockMode()).isTrue();
            assertThat(status.fromNumber()).isEqualTo("+15551234567");
        }
    }

    @Nested
    @DisplayName("Mock Message Store Tests")
    class MockMessageStoreTests {

        @Test
        @DisplayName("Should clear mock message store")
        void shouldClearMockMessageStore() {
            smsNotificationService.sendSms("+15559876543", "Test 1");
            smsNotificationService.sendSms("+15559876543", "Test 2");

            assertThat(smsNotificationService.getMockMessageStore()).isNotEmpty();

            smsNotificationService.clearMockMessageStore();

            assertThat(smsNotificationService.getMockMessageStore()).isEmpty();
        }

        @Test
        @DisplayName("Should return defensive copy of mock store")
        void shouldReturnDefensiveCopyOfMockStore() {
            smsNotificationService.sendSms("+15559876543", "Test");

            Map<String, SmsNotificationService.MockSmsRecord> store1 = smsNotificationService.getMockMessageStore();
            Map<String, SmsNotificationService.MockSmsRecord> store2 = smsNotificationService.getMockMessageStore();

            assertThat(store1).isNotSameAs(store2);
        }
    }

    @Nested
    @DisplayName("SmsResult Tests")
    class SmsResultTests {

        @Test
        @DisplayName("Should create success result")
        void shouldCreateSuccessResult() {
            SmsNotificationService.SmsResult result = SmsNotificationService.SmsResult.success("SID123", "SENT");

            assertThat(result.success()).isTrue();
            assertThat(result.messageSid()).isEqualTo("SID123");
            assertThat(result.status()).isEqualTo("SENT");
            assertThat(result.errorMessage()).isNull();
        }

        @Test
        @DisplayName("Should create failure result")
        void shouldCreateFailureResult() {
            SmsNotificationService.SmsResult result = SmsNotificationService.SmsResult.failure("Connection timeout");

            assertThat(result.success()).isFalse();
            assertThat(result.messageSid()).isNull();
            assertThat(result.status()).isEqualTo("FAILED");
            assertThat(result.errorMessage()).isEqualTo("Connection timeout");
        }
    }
}
