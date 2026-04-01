package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.OcrResult;
import com.hrms.application.document.service.FileStorageService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OcrReceiptServiceTest {

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private OcrReceiptService ocrReceiptService;

    private static final UUID TENANT_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ocrReceiptService, "tessdataPath", "/usr/share/tesseract-ocr/5/tessdata");
        ReflectionTestUtils.setField(ocrReceiptService, "ocrLanguage", "eng");
    }

    // ─── Validation Tests ────────────────────────────────────────────────────

    @Test
    @DisplayName("Should reject null file")
    void scanReceipt_nullFile_throwsBusinessException() {
        assertThatThrownBy(() -> ocrReceiptService.scanReceipt(TENANT_ID, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty");
    }

    @Test
    @DisplayName("Should reject empty file")
    void scanReceipt_emptyFile_throwsBusinessException() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> ocrReceiptService.scanReceipt(TENANT_ID, emptyFile))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty");
    }

    @Test
    @DisplayName("Should reject unsupported file type")
    void scanReceipt_unsupportedType_throwsBusinessException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content".getBytes());

        assertThatThrownBy(() -> ocrReceiptService.scanReceipt(TENANT_ID, file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unsupported file type");
    }

    @Test
    @DisplayName("Should reject file exceeding 10MB")
    void scanReceipt_tooLarge_throwsBusinessException() {
        byte[] largeContent = new byte[11 * 1024 * 1024]; // 11MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.jpg", "image/jpeg", largeContent);

        assertThatThrownBy(() -> ocrReceiptService.scanReceipt(TENANT_ID, file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("10MB");
    }

    // ─── Amount Extraction Tests ─────────────────────────────────────────────

    @Test
    @DisplayName("Should extract INR amount with rupee symbol")
    void extractAmount_rupeeSymbol() {
        BigDecimal amount = ocrReceiptService.extractAmount("Total: ₹1,234.56");
        assertThat(amount).isEqualByComparingTo(new BigDecimal("1234.56"));
    }

    @Test
    @DisplayName("Should extract amount with Rs. prefix")
    void extractAmount_rsPrefix() {
        BigDecimal amount = ocrReceiptService.extractAmount("Amount Rs. 5,000.00");
        assertThat(amount).isEqualByComparingTo(new BigDecimal("5000.00"));
    }

    @Test
    @DisplayName("Should extract amount labeled as Total")
    void extractAmount_totalLabel() {
        BigDecimal amount = ocrReceiptService.extractAmount(
                "Subtotal: 800.00\nTax: 144.00\nTotal: 944.00");
        assertThat(amount).isEqualByComparingTo(new BigDecimal("944.00"));
    }

    @Test
    @DisplayName("Should extract Grand Total over regular Total")
    void extractAmount_grandTotal() {
        BigDecimal amount = ocrReceiptService.extractAmount(
                "Total: 800.00\nGrand Total: 1,200.00");
        // Should return the labeled "Grand Total" value
        assertThat(amount).isEqualByComparingTo(new BigDecimal("1200.00"));
    }

    @Test
    @DisplayName("Should return null for no amounts")
    void extractAmount_noAmounts() {
        BigDecimal amount = ocrReceiptService.extractAmount("No amounts here");
        assertThat(amount).isNull();
    }

    @Test
    @DisplayName("Should return null for null text")
    void extractAmount_null() {
        assertThat(ocrReceiptService.extractAmount(null)).isNull();
    }

    // ─── Date Extraction Tests ───────────────────────────────────────────────

    @Test
    @DisplayName("Should extract date in dd/MM/yyyy format")
    void extractDate_slashFormat() {
        LocalDate date = ocrReceiptService.extractDate("Date: 15/03/2026");
        assertThat(date).isEqualTo(LocalDate.of(2026, 3, 15));
    }

    @Test
    @DisplayName("Should extract date in yyyy-MM-dd format")
    void extractDate_isoFormat() {
        LocalDate date = ocrReceiptService.extractDate("Invoice date 2026-01-20");
        assertThat(date).isEqualTo(LocalDate.of(2026, 1, 20));
    }

    @Test
    @DisplayName("Should extract date in dd-MM-yyyy format")
    void extractDate_dashFormat() {
        LocalDate date = ocrReceiptService.extractDate("Date: 28-02-2025");
        assertThat(date).isEqualTo(LocalDate.of(2025, 2, 28));
    }

    @Test
    @DisplayName("Should return null for no date")
    void extractDate_noDate() {
        assertThat(ocrReceiptService.extractDate("No date here")).isNull();
    }

    @Test
    @DisplayName("Should return null for null text")
    void extractDate_null() {
        assertThat(ocrReceiptService.extractDate(null)).isNull();
    }

    // ─── Merchant Name Extraction Tests ──────────────────────────────────────

    @Test
    @DisplayName("Should extract merchant from first meaningful line")
    void extractMerchantName_firstLine() {
        String text = "ACME Corporation\n123 Main Street\nDate: 15/03/2026\nTotal: ₹500.00";
        String merchant = ocrReceiptService.extractMerchantName(text);
        assertThat(merchant).isEqualTo("ACME Corporation");
    }

    @Test
    @DisplayName("Should skip empty lines and date lines")
    void extractMerchantName_skipHeaders() {
        String text = "\n\n15/03/2026\nHotel Taj Palace\nRoom charges";
        String merchant = ocrReceiptService.extractMerchantName(text);
        assertThat(merchant).isEqualTo("Hotel Taj Palace");
    }

    @Test
    @DisplayName("Should return null for empty text")
    void extractMerchantName_empty() {
        assertThat(ocrReceiptService.extractMerchantName("")).isNull();
    }

    @Test
    @DisplayName("Should return null for null text")
    void extractMerchantName_null() {
        assertThat(ocrReceiptService.extractMerchantName(null)).isNull();
    }

    @Test
    @DisplayName("Should truncate merchant name to 200 characters")
    void extractMerchantName_truncatesLongName() {
        String longName = "A".repeat(250);
        String merchant = ocrReceiptService.extractMerchantName(longName);
        assertThat(merchant).hasSize(200);
    }

    // ─── Currency Extraction Tests ───────────────────────────────────────────

    @Test
    @DisplayName("Should detect INR from rupee symbol")
    void extractCurrency_rupee() {
        assertThat(ocrReceiptService.extractCurrency("Total: ₹500")).isEqualTo("INR");
    }

    @Test
    @DisplayName("Should detect USD from dollar sign")
    void extractCurrency_usd() {
        assertThat(ocrReceiptService.extractCurrency("Total: $50.00")).isEqualTo("USD");
    }

    @Test
    @DisplayName("Should default to INR")
    void extractCurrency_default() {
        assertThat(ocrReceiptService.extractCurrency("Total: 500")).isEqualTo("INR");
    }

    // ─── Confidence Calculation Tests ────────────────────────────────────────

    @Test
    @DisplayName("Should return 0 confidence for blank text")
    void calculateConfidence_blank() {
        assertThat(ocrReceiptService.calculateConfidence("")).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should return 0 confidence for null text")
    void calculateConfidence_null() {
        assertThat(ocrReceiptService.calculateConfidence(null)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should return high confidence for receipt-like text")
    void calculateConfidence_goodReceipt() {
        String receiptText = """
                ACME Restaurant
                123 Main Street, Mumbai
                Date: 15/03/2026
                Item 1: ₹200.00
                Item 2: ₹300.00
                Total: ₹500.00
                Thank you for your purchase!
                """;
        double confidence = ocrReceiptService.calculateConfidence(receiptText);
        assertThat(confidence).isGreaterThanOrEqualTo(0.6);
    }

    @Test
    @DisplayName("Should return low confidence for garbage text")
    void calculateConfidence_garbage() {
        String garbage = "!@#$%^&*(){}|<>?~`";
        double confidence = ocrReceiptService.calculateConfidence(garbage);
        assertThat(confidence).isLessThan(0.5);
    }
}
