package com.nulogic.application.payroll.service;

import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openpdf.text.Document;
import org.openpdf.text.PageSize;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.PdfWriter;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("PayslipPdfService amount-in-words Tests")
class PayslipPdfServiceTest {

    private final PayslipPdfService service = new PayslipPdfService(
            mock(PayslipRepository.class), mock(EmployeeRepository.class), mock(TenantTimeService.class),
            mock(com.nulogic.infrastructure.tenant.repository.TenantRepository.class));

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

    @Test
    @DisplayName("Deductions table lists employee ESI so its lines add up to Total Deductions")
    void pdfShowsEmployeeEsiLine() throws Exception {
        Payslip payslip = Payslip.builder()
                .payrollRunId(UUID.randomUUID()).employeeId(UUID.randomUUID())
                .payPeriodYear(2025).payPeriodMonth(1).payDate(LocalDate.of(2025, 1, 31))
                .basicSalary(new BigDecimal("10000")).hra(new BigDecimal("8000"))
                .providentFund(new BigDecimal("1200")).professionalTax(new BigDecimal("200"))
                .incomeTax(BigDecimal.ZERO).otherDeductions(BigDecimal.ZERO)
                .employeeEsi(new BigDecimal("135.00")).employerEsi(new BigDecimal("585.00"))
                .build();
        payslip.calculateTotals();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter.getInstance(document, out);
        document.open();
        Method breakdown = PayslipPdfService.class
                .getDeclaredMethod("addSalaryBreakdown", Document.class, Payslip.class);
        breakdown.setAccessible(true);
        breakdown.invoke(service, document, payslip);
        document.close();

        PdfReader reader = new PdfReader(out.toByteArray());
        String text = new PdfTextExtractor(reader).getTextFromPage(1);
        reader.close();

        // 1200 + 200 + 135 = 1535; employer ESI 585 is not a deduction line
        assertThat(payslip.getTotalDeductions()).isEqualByComparingTo("1535.00");
        assertThat(text).contains("ESI (Employee)").contains("135").contains("1,535");
        assertThat(text).doesNotContain("585");
    }

    @Test
    @DisplayName("generatePayslipPdf returns a non-empty, valid PDF (regression: 0-byte output)")
    void generatePayslipPdf_returnsValidPdf() throws Exception {
        UUID tenantId = UUID.randomUUID();
        UUID payslipId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        PayslipRepository payslips = mock(PayslipRepository.class);
        EmployeeRepository employees = mock(EmployeeRepository.class);
        TenantTimeService time = mock(TenantTimeService.class);
        org.mockito.Mockito.when(time.today(tenantId)).thenReturn(LocalDate.of(2025, 1, 31));

        Payslip payslip = Payslip.builder()
                .payrollRunId(UUID.randomUUID()).employeeId(employeeId)
                .payPeriodYear(2025).payPeriodMonth(1).payDate(LocalDate.of(2025, 1, 31))
                .basicSalary(new BigDecimal("10000")).hra(new BigDecimal("8000"))
                .providentFund(new BigDecimal("1200")).professionalTax(new BigDecimal("200"))
                .incomeTax(BigDecimal.ZERO).otherDeductions(BigDecimal.ZERO).build();
        payslip.calculateTotals();
        com.nulogic.domain.employee.Employee emp = mock(com.nulogic.domain.employee.Employee.class);
        org.mockito.Mockito.when(emp.getFirstName()).thenReturn("NUAURA_TEST");
        org.mockito.Mockito.when(emp.getEmployeeCode()).thenReturn("NUAURA_TEST_001");
        org.mockito.Mockito.when(payslips.findByIdAndTenantId(payslipId, tenantId)).thenReturn(java.util.Optional.of(payslip));
        org.mockito.Mockito.when(employees.findByIdAndTenantId(employeeId, tenantId)).thenReturn(java.util.Optional.of(emp));

        com.nulogic.common.security.TenantContext.setCurrentTenant(tenantId);
        try {
            byte[] pdf = new PayslipPdfService(payslips, employees, time,
                    mock(com.nulogic.infrastructure.tenant.repository.TenantRepository.class)).generatePayslipPdf(payslipId);
            assertThat(pdf).isNotEmpty();
            assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
            PdfReader reader = new PdfReader(pdf);
            assertThat(reader.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            reader.close();
        } finally {
            com.nulogic.common.security.TenantContext.clear();
        }
    }
}
