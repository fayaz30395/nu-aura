package com.nulogic.application.notification.service;

import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.notification.EmailNotification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailTemplateServiceTest {

    private TenantTimeService tenantTimeService;
    private EmailTemplateService service;

    @BeforeEach
    void setUp() {
        tenantTimeService = mock(TenantTimeService.class);
        service = new EmailTemplateService(tenantTimeService);
    }

    @ParameterizedTest
    @EnumSource(EmailNotification.EmailType.class)
    void generateEmailRendersHtmlForEveryEmailType(EmailNotification.EmailType type) {
        UUID tenantId = UUID.randomUUID();
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2028, 1, 1));

        String html = service.generateEmail(type, fullVariables(), tenantId);

        assertThat(html)
                .contains("<!DOCTYPE html>")
                .contains("<div class=\"container\">")
                .contains("&copy; 2028 HRMS Platform")
                .doesNotContain("%s");
        assertThat(html).containsAnyOf("Ada Lovelace", "Team", "New Announcement");
    }

    @Test
    void generateEmailUsesTenantZonedYear() {
        UUID tenantId = UUID.randomUUID();
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2027, 12, 31));

        String html = service.generateEmail(
                EmailNotification.EmailType.PAYSLIP_READY,
                fullVariables(),
                tenantId);

        assertThat(html)
                .contains("Your Payslip is Ready")
                .contains("Net Salary: INR 100000")
                .contains("&copy; 2027 HRMS Platform");
        verify(tenantTimeService).today(tenantId);
    }

    @Test
    void backwardCompatibleOverloadUsesNullTenant() {
        when(tenantTimeService.today(null)).thenReturn(LocalDate.of(2026, 1, 1));

        String html = service.generateEmail(
                EmailNotification.EmailType.PASSWORD_RESET,
                Map.of("employeeName", "Ada Lovelace", "resetUrl", "https://example.test/reset"));

        assertThat(html)
                .contains("Password Reset Request")
                .contains("https://example.test/reset")
                .contains("&copy; 2026 HRMS Platform");
        verify(tenantTimeService).today(null);
    }

    @Test
    void missingVariablesFallBackToSafeDefaults() {
        UUID tenantId = UUID.randomUUID();
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2026, 6, 24));

        String html = service.generateEmail(
                EmailNotification.EmailType.EXPENSE_REJECTION,
                Map.of(),
                tenantId);

        assertThat(html)
                .contains("Expense Claim Status Update")
                .contains("Rejection Reason: Not specified")
                .contains("href=\"#\"")
                .contains("&copy; 2026 HRMS Platform");
    }

    private static Map<String, String> fullVariables() {
        return Map.ofEntries(
                Map.entry("employeeName", "Ada Lovelace"),
                Map.entry("leaveType", "Annual"),
                Map.entry("startDate", "2026-07-01"),
                Map.entry("endDate", "2026-07-03"),
                Map.entry("duration", "3"),
                Map.entry("reason", "Vacation"),
                Map.entry("rejectionReason", "Coverage gap"),
                Map.entry("dashboardUrl", "https://example.test/dashboard"),
                Map.entry("years", "5"),
                Map.entry("month", "June 2026"),
                Map.entry("netSalary", "INR 100000"),
                Map.entry("paymentDate", "2026-06-30"),
                Map.entry("payslipUrl", "https://example.test/payslip"),
                Map.entry("title", "Policy Update"),
                Map.entry("message", "Please read the updated policy."),
                Map.entry("sender", "People Ops"),
                Map.entry("resetUrl", "https://example.test/reset"),
                Map.entry("email", "ada@example.test"),
                Map.entry("department", "Engineering"),
                Map.entry("joiningDate", "2026-07-10"),
                Map.entry("portalUrl", "https://example.test/portal"),
                Map.entry("amount", "INR 1200"),
                Map.entry("date", "2026-06-23"),
                Map.entry("category", "Travel"),
                Map.entry("description", "Airport transfer")
        );
    }
}
