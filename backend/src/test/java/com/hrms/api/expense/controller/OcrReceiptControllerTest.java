package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.OcrResult;
import com.hrms.application.expense.service.OcrReceiptService;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OcrReceiptController.class)
@ContextConfiguration(classes = {OcrReceiptController.class, GlobalExceptionHandler.class, OcrReceiptControllerTest.TestConfig.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OcrReceiptController Integration Tests")
class OcrReceiptControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private OcrReceiptService ocrReceiptService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID tenantId;
    private OcrResult ocrResult;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        ocrResult = new OcrResult(
                "Coffee Shop",
                new BigDecimal("12.50"),
                "INR",
                LocalDate.now().minusDays(1),
                "Coffee Shop\nTotal: 12.50",
                0.95,
                "/receipts/scan-001.jpg",
                "scan-001.jpg"
        );
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Scan Receipt Tests")
    class ScanReceiptTests {

        @Test
        @DisplayName("Should scan JPEG receipt successfully")
        void shouldScanJpegReceiptSuccessfully() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "receipt.jpg", "image/jpeg", "fake-image-bytes".getBytes());

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(ocrReceiptService.scanReceipt(eq(tenantId), any())).thenReturn(ocrResult);

                mockMvc.perform(multipart("/api/v1/expenses/receipts/scan").file(file))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.merchantName").value("Coffee Shop"))
                        .andExpect(jsonPath("$.amount").value(12.50))
                        .andExpect(jsonPath("$.currency").value("INR"))
                        .andExpect(jsonPath("$.confidence").value(0.95));

                verify(ocrReceiptService).scanReceipt(eq(tenantId), any());
            }
        }

        @Test
        @DisplayName("Should scan PNG receipt successfully")
        void shouldScanPngReceiptSuccessfully() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "receipt.png", "image/png", "fake-png-bytes".getBytes());

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(ocrReceiptService.scanReceipt(eq(tenantId), any())).thenReturn(ocrResult);

                mockMvc.perform(multipart("/api/v1/expenses/receipts/scan").file(file))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.merchantName").value("Coffee Shop"));

                verify(ocrReceiptService).scanReceipt(eq(tenantId), any());
            }
        }

        @Test
        @DisplayName("Should scan PDF receipt successfully")
        void shouldScanPdfReceiptSuccessfully() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "receipt.pdf", "application/pdf", "fake-pdf-bytes".getBytes());

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(ocrReceiptService.scanReceipt(eq(tenantId), any())).thenReturn(ocrResult);

                mockMvc.perform(multipart("/api/v1/expenses/receipts/scan").file(file))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.receiptFileName").value("scan-001.jpg"));

                verify(ocrReceiptService).scanReceipt(eq(tenantId), any());
            }
        }

        @Test
        @DisplayName("Should return receipt date from OCR result")
        void shouldReturnReceiptDate() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "receipt.jpg", "image/jpeg", "fake-image-bytes".getBytes());

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(ocrReceiptService.scanReceipt(eq(tenantId), any())).thenReturn(ocrResult);

                mockMvc.perform(multipart("/api/v1/expenses/receipts/scan").file(file))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.receiptDate").exists())
                        .andExpect(jsonPath("$.rawText").value("Coffee Shop\nTotal: 12.50"));
            }
        }

        @Test
        @DisplayName("Should return storage path in OCR result")
        void shouldReturnStoragePath() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "receipt.jpg", "image/jpeg", "fake-image-bytes".getBytes());

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(ocrReceiptService.scanReceipt(eq(tenantId), any())).thenReturn(ocrResult);

                mockMvc.perform(multipart("/api/v1/expenses/receipts/scan").file(file))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.receiptStoragePath").value("/receipts/scan-001.jpg"));
            }
        }

        @Test
        @DisplayName("Should handle service exception gracefully")
        void shouldHandleServiceException() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "corrupt.jpg", "image/jpeg", "corrupt-data".getBytes());

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(ocrReceiptService.scanReceipt(eq(tenantId), any()))
                        .thenThrow(new RuntimeException("OCR processing failed"));

                mockMvc.perform(multipart("/api/v1/expenses/receipts/scan").file(file))
                        .andExpect(status().isInternalServerError());
            }
        }
    }
}
