package com.nulogic.application.payroll.service;

import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("PayslipPdfService amount-in-words Tests")
class PayslipPdfServiceTest {

    private final PayslipPdfService service = new PayslipPdfService(
            mock(PayslipRepository.class), mock(EmployeeRepository.class), mock(TenantTimeService.class));

    @Test
    @DisplayName("Positive amount renders in words")
    void positiveAmount() {
        assertThat(service.convertToWords(new BigDecimal("1250.50")))
                .isEqualTo("One Thousand Two Hundred Fifty Rupees and Fifty Paise Only");
    }

    @Test
    @DisplayName("Negative net salary renders with Minus prefix instead of crashing")
    void negativeAmount() {
        assertThat(service.convertToWords(new BigDecimal("-1250.50")))
                .isEqualTo("Minus One Thousand Two Hundred Fifty Rupees and Fifty Paise Only");
        assertThat(service.convertToWords(new BigDecimal("-15")))
                .isEqualTo("Minus Fifteen Rupees Only");
    }

    @Test
    @DisplayName("Null amount renders as zero")
    void nullAmount() {
        assertThat(service.convertToWords(null)).isEqualTo("Zero Rupees Only");
    }
}
