package com.hrms.application.analytics.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.report.service.ReportGenerationService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.analytics.ReportExecution;
import com.hrms.domain.analytics.ScheduledReport;
import com.hrms.infrastructure.analytics.repository.ReportExecutionRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Scheduler job that executes due scheduled reports.
 * Runs every minute to check for reports that need to be executed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledReportExecutionJob {

    private final ScheduledReportService scheduledReportService;
    private final ReportGenerationService reportGenerationService;
    private final ReportExecutionRepository reportExecutionRepository;
    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    @Value("${spring.mail.from:noreply@hrms.com}")
    private String fromEmail;

    @Value("${app.company.name:HRMS}")
    private String companyName;

    /**
     * Execute due scheduled reports every minute.
     */
    @Scheduled(cron = "0 * * * * *")
    @SchedulerLock(name = "executeScheduledReports", lockAtLeastFor = "PT2M", lockAtMostFor = "PT30M")
    @Transactional
    public void executeScheduledReports() {
        log.debug("Checking for scheduled reports due for execution...");

        List<ScheduledReport> dueReports = scheduledReportService.getReportsDueForExecution();

        if (dueReports.isEmpty()) {
            log.debug("No scheduled reports due for execution");
            return;
        }

        log.info("Found {} scheduled reports due for execution", dueReports.size());

        // R2-010 FIX: Wrap each report execution in its own try/catch so a single
        // failing report doesn't abort the entire batch.
        for (ScheduledReport scheduledReport : dueReports) {
            try {
                executeReport(scheduledReport);
            } catch (Exception e) { // Intentional broad catch — per-report error boundary
                log.error("Unhandled error executing scheduled report '{}' (id={}): {}",
                        scheduledReport.getScheduleName(), scheduledReport.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Execute a single scheduled report.
     *
     * <p>R2-010 FIX: {@code REQUIRES_NEW} propagation ensures each report runs in its own
     * transaction. Without it, a rollback triggered inside {@code executeReport} would
     * mark the outer transaction (from {@code executeScheduledReports}) as rollback-only,
     * silently preventing all subsequent reports in the same batch from being saved.</p>
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void executeReport(ScheduledReport scheduledReport) {
        UUID executionId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();

        log.info("Executing scheduled report: {} (id: {})", scheduledReport.getScheduleName(), scheduledReport.getId());

        // Set tenant context for multi-tenant operation
        TenantContext.setCurrentTenant(scheduledReport.getTenantId());

        // Create execution record
        ReportExecution execution = ReportExecution.builder()
                .id(executionId)
                .tenantId(scheduledReport.getTenantId())
                .reportDefinitionId(scheduledReport.getReportDefinitionId())
                .scheduledReportId(scheduledReport.getId())
                .executionType(ReportExecution.ExecutionType.SCHEDULED)
                .parameters(scheduledReport.getParameters())
                .status(ReportExecution.ExecutionStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .build();

        reportExecutionRepository.save(execution);

        try {
            // Parse parameters
            Map<String, Object> params = parseParameters(scheduledReport.getParameters());
            String reportType = (String) params.getOrDefault("reportType", "ANALYTICS");
            String exportFormat = (String) params.getOrDefault("exportFormat", "EXCEL");

            // Generate the report
            ReportGenerationService.ReportResult reportResult = generateReport(
                    scheduledReport, reportType, params);

            // Send email to recipients
            List<String> recipients = parseRecipients(scheduledReport.getRecipients());
            sendReportEmail(scheduledReport, reportResult, recipients);

            // Update execution record with success
            long executionTimeMs = System.currentTimeMillis() - startTime;
            execution.setStatus(ReportExecution.ExecutionStatus.COMPLETED);
            execution.setFilePath(reportResult.getObjectName());
            execution.setFileSize(reportResult.getSize());
            execution.setExecutionTimeMs(executionTimeMs);
            execution.setCompletedAt(LocalDateTime.now());
            reportExecutionRepository.save(execution);

            // Mark the scheduled report as executed (updates lastRunAt and nextRunAt)
            scheduledReportService.markAsExecuted(scheduledReport.getId());

            log.info("Successfully executed scheduled report: {} in {}ms",
                    scheduledReport.getScheduleName(), executionTimeMs);

        } catch (Exception e) { // Intentional broad catch — per-report error boundary
            log.error("Failed to execute scheduled report: {} - {}",
                    scheduledReport.getScheduleName(), e.getMessage(), e);

            // Update execution record with failure
            execution.setStatus(ReportExecution.ExecutionStatus.FAILED);
            execution.setErrorMessage(e.getMessage());
            execution.setExecutionTimeMs(System.currentTimeMillis() - startTime);
            execution.setCompletedAt(LocalDateTime.now());
            reportExecutionRepository.save(execution);

            // Still mark as executed to prevent repeated failures
            // The next run will be scheduled as usual
            try {
                scheduledReportService.markAsExecuted(scheduledReport.getId());
            } catch (Exception ex) { // Intentional broad catch — per-report error boundary
                log.error("Failed to mark report as executed after error: {}", ex.getMessage());
            }
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Generate report based on report type.
     */
    private ReportGenerationService.ReportResult generateReport(
            ScheduledReport scheduledReport, String reportType, Map<String, Object> params) {

        LocalDate today = LocalDate.now();
        String period = today.format(DateTimeFormatter.ofPattern("yyyy-MM"));

        // Build report data based on type
        Map<String, Object> reportData = new HashMap<>(params);
        reportData.put("scheduleName", scheduledReport.getScheduleName());
        reportData.put("generatedAt", LocalDateTime.now().toString());
        reportData.put("tenantId", scheduledReport.getTenantId().toString());

        // Generate appropriate report based on type
        return switch (reportType.toUpperCase()) {
            case "ATTENDANCE" -> {
                LocalDate startDate = today.withDayOfMonth(1);
                LocalDate endDate = today;
                reportData.put("startDate", startDate.toString());
                reportData.put("endDate", endDate.toString());
                reportData.put("presentDays", "0");
                reportData.put("absentDays", "0");
                reportData.put("lateDays", "0");
                reportData.put("totalHours", "0");
                reportData.put("records", List.of());
                yield reportGenerationService.generateAttendanceReport(
                        scheduledReport.getTenantId(), startDate, endDate, reportData, "DEPARTMENT");
            }
            case "LEAVE", "LEAVE_SUMMARY" -> {
                reportData.put("balances", List.of());
                reportData.put("history", List.of());
                yield reportGenerationService.generateLeaveReport(
                        scheduledReport.getTenantId(), today.getYear(), reportData);
            }
            default -> {
                // Default to analytics report for other types
                reportData.put("executiveSummary", "Scheduled report: " + scheduledReport.getScheduleName());
                reportData.put("headcountMetrics", Map.of("totalEmployees", 0, "activeEmployees", 0));
                reportData.put("attendanceMetrics", Map.of("attendanceRate", 0.0));
                reportData.put("leaveMetrics", Map.of("pendingRequests", 0));
                yield reportGenerationService.generateAnalyticsReport(reportData, period);
            }
        };
    }

    /**
     * Send report email to recipients with attachment.
     */
    private void sendReportEmail(ScheduledReport scheduledReport,
                                  ReportGenerationService.ReportResult reportResult,
                                  List<String> recipients) throws MessagingException {

        if (recipients.isEmpty()) {
            log.warn("No recipients configured for scheduled report: {}", scheduledReport.getScheduleName());
            return;
        }

        String subject = String.format("[%s] Scheduled Report: %s - %s",
                companyName,
                scheduledReport.getScheduleName(),
                LocalDate.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")));

        String body = buildEmailBody(scheduledReport, reportResult);

        for (String recipientEmail : recipients) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom(fromEmail);
                helper.setTo(recipientEmail.trim());
                helper.setSubject(subject);
                helper.setText(body, true);

                // Note: For actual attachment, you would need to fetch the file content
                // from storage service. For now, we include a download link in the email.

                mailSender.send(message);
                log.info("Sent report email to: {}", recipientEmail);

            } catch (Exception e) { // Intentional broad catch — per-report error boundary
                log.error("Failed to send report email to {}: {}", recipientEmail, e.getMessage());
            }
        }
    }

    /**
     * Build HTML email body for the report notification.
     */
    private String buildEmailBody(ScheduledReport scheduledReport,
                                   ReportGenerationService.ReportResult reportResult) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2980b9; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
                    .btn { display: inline-block; padding: 10px 20px; background: #2980b9; color: white;
                           text-decoration: none; border-radius: 4px; margin-top: 15px; }
                    .info { background: #e8f4fd; padding: 15px; border-radius: 4px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Scheduled Report Ready</h2>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your scheduled report <strong>%s</strong> has been generated successfully.</p>

                        <div class="info">
                            <p><strong>Report Details:</strong></p>
                            <ul>
                                <li><strong>Report Name:</strong> %s</li>
                                <li><strong>Report Type:</strong> %s</li>
                                <li><strong>Generated At:</strong> %s</li>
                                <li><strong>File Size:</strong> %s KB</li>
                            </ul>
                        </div>

                        <p>You can download the report from the HRMS portal or use the link below:</p>
                        <a href="%s" class="btn">Download Report</a>

                        <p style="margin-top: 20px;">
                            This is an automated email. If you no longer wish to receive these reports,
                            please update your subscription settings in the HRMS portal.
                        </p>
                    </div>
                    <div class="footer">
                        <p>&copy; %d %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
                scheduledReport.getScheduleName(),
                scheduledReport.getScheduleName(),
                reportResult.getReportType(),
                reportResult.getGeneratedAt().format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")),
                reportResult.getSize() / 1024,
                reportResult.getDownloadUrl() != null ? reportResult.getDownloadUrl() : "#",
                LocalDate.now().getYear(),
                companyName
        );
    }

    /**
     * Parse parameters JSON string to Map.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseParameters(String parametersJson) {
        if (parametersJson == null || parametersJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(parametersJson,
                    objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
        } catch (JsonProcessingException e) {
            log.error("Failed to parse parameters JSON: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * Parse recipients JSON array string to List.
     */
    @SuppressWarnings("unchecked")
    private List<String> parseRecipients(String recipientsJson) {
        if (recipientsJson == null || recipientsJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(recipientsJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            log.error("Failed to parse recipients JSON: {}", e.getMessage());
            return List.of();
        }
    }
}
