package com.nulogic.application.notification.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.notification.EmailNotification;
import com.nulogic.infrastructure.notification.repository.EmailNotificationRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailNotificationRepository emailRepository;
    private final EmailTemplateService templateService;
    // S13 Wave-13: route email send/queue timestamps through TenantTimeService so the
    // recipient's tenant zone is the source of truth (matters once tenants live outside IST).
    private final TenantTimeService tenantTimeService;
    @Value("${spring.mail.from:noreply@hrms.com}")
    private String fromEmail;
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Send an email and return a result indicating success or failure.
     * The email is first persisted as PENDING, then sent. If sending fails,
     * the result will contain the error details for caller handling.
     *
     * @return EmailSendResult with success/failure status and error details if applicable
     */
    @Transactional
    public EmailSendResult sendEmail(String recipientEmail, String recipientName, EmailNotification.EmailType emailType, Map<String, String> variables) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmailNotification.EmailType resolvedEmailType = emailType != null ? emailType : EmailNotification.EmailType.GENERAL;
        Map<String, String> resolvedVariables = variables != null ? variables : Map.of();

        try {
            // Generate email content from template (footer year resolved in tenant zone)
            String htmlBody = templateService.generateEmail(resolvedEmailType, resolvedVariables, tenantId);
            String subject = getSubject(resolvedEmailType, resolvedVariables);

            // Create email notification record
            EmailNotification notification = EmailNotification.builder()
                    .recipientEmail(recipientEmail)
                    .recipientName(recipientName)
                    .subject(subject)
                    .body(htmlBody)
                    .emailType(resolvedEmailType)
                    .status(EmailNotification.EmailStatus.PENDING)
                    .retryCount(0)
                    .build();

            notification.setTenantId(tenantId);
            EmailNotification saved = emailRepository.save(notification);

            // Send email and return result
            return sendEmailInternal(saved);

        } catch (RuntimeException e) {
            String errorMsg = "Failed to prepare email for " + recipientEmail + ": " + e.getMessage();
            log.error(errorMsg, e);
            return EmailSendResult.failure(errorMsg);
        }
    }

    /**
     * Internal method to send an email. Returns explicit result instead of silently failing.
     *
     * @param notification The email notification to send
     * @return EmailSendResult indicating success or failure with error details
     */
    @Transactional
    public EmailSendResult sendEmailInternal(EmailNotification notification) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Email deliverability: List-Unsubscribe header (RFC 8058 one-click)
            String unsubscribeUrl = frontendUrl + "/unsubscribe?email="
                    + URLEncoder.encode(notification.getRecipientEmail(), StandardCharsets.UTF_8);
            message.addHeader("List-Unsubscribe", "<" + unsubscribeUrl + ">");
            message.addHeader("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");

            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(notification.getRecipientEmail());
            helper.setSubject(notification.getSubject());
            // Email deliverability: multipart/alternative (text + html) to reduce spam scoring
            String htmlContent = notification.getBody();
            String plainText = htmlContent.replaceAll("<[^>]+>", "").replaceAll("&nbsp;", " ").replaceAll("\\s+", " ").trim();
            helper.setText(plainText, htmlContent);

            mailSender.send(message);

            // Update notification status — sentAt in the recipient tenant's zone (S13 Wave-13)
            notification.setStatus(EmailNotification.EmailStatus.SENT);
            notification.setSentAt(tenantTimeService.now(notification.getTenantId()));
            emailRepository.save(notification);

            log.info("Email sent successfully to {} - Type: {}", notification.getRecipientEmail(), notification.getEmailType());
            return EmailSendResult.success(notification.getId());

        } catch (MessagingException e) {
            String errorMsg = "Failed to send email to " + notification.getRecipientEmail() + ": " + e.getMessage();
            log.error(errorMsg);

            // Update notification with error
            notification.setStatus(EmailNotification.EmailStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
            notification.setRetryCount(notification.getRetryCount() + 1);
            emailRepository.save(notification);

            return EmailSendResult.failure(notification.getId(), errorMsg);
        }
    }

    /**
     * Retry failed emails (called by scheduled task).
     *
     * @deprecated Use {@link #retryFailedEmailsForTenant(UUID)} instead. This method
     * uses a cross-tenant query and should not be called from scheduled jobs.
     */
    @Deprecated
    @Transactional
    public void retryFailedEmails() {
        List<EmailNotification> failedEmails = emailRepository.findPendingOrRetryableEmails();

        log.info("Retrying {} failed emails", failedEmails.size());

        for (EmailNotification email : failedEmails) {
            if (email.getRetryCount() < 3) {
                sendEmailInternal(email);
            }
        }
    }

    /**
     * Retry failed emails for a specific tenant (called by scheduled task).
     *
     * <p>SEC-FIX: Tenant-scoped version that prevents cross-tenant data leakage.
     * The caller must set TenantContext before invoking this method.</p>
     */
    @Transactional
    public void retryFailedEmailsForTenant(UUID tenantId) {
        List<EmailNotification> failedEmails = emailRepository.findPendingOrRetryableEmailsByTenantId(tenantId);

        if (failedEmails.isEmpty()) {
            return;
        }

        log.info("Retrying {} failed emails for tenant {}", failedEmails.size(), tenantId);

        for (EmailNotification email : failedEmails) {
            if (email.getRetryCount() < 3) {
                sendEmailInternal(email);
            }
        }
    }

    /**
     * Send scheduled emails (called by scheduled task)
     */
    @Transactional
    public void sendScheduledEmails() {
        // Get all scheduled emails due for sending.
        // S13 Wave-13: "due" is evaluated in the tenant's own zone so a 9am-IST scheduled
        // mail fires at 9am-IST regardless of where the pod's JVM thinks it is.
        UUID tenantId = TenantContext.getCurrentTenant();
        List<EmailNotification> scheduledEmails = emailRepository.findScheduledEmailsDue(
                tenantId,
                EmailNotification.EmailStatus.SCHEDULED,
                tenantTimeService.now(tenantId)
        );

        log.info("Sending {} scheduled emails", scheduledEmails.size());

        for (EmailNotification email : scheduledEmails) {
            email.setStatus(EmailNotification.EmailStatus.PENDING);
            emailRepository.save(email);
            sendEmailInternal(email);
        }
    }

    private String getSubject(EmailNotification.EmailType type, Map<String, String> variables) {
        return switch (type) {
            case LEAVE_APPROVAL -> "Leave Request Approved - " + variables.getOrDefault("leaveType", "Leave");
            case LEAVE_REJECTION -> "Leave Request Status Update";
            case BIRTHDAY_REMINDER -> "Happy Birthday " + variables.getOrDefault("employeeName", "") + "!";
            case ANNIVERSARY_REMINDER -> "Happy Work Anniversary!";
            case PAYSLIP_READY -> "Payslip Ready - " + variables.getOrDefault("month", "");
            case ANNOUNCEMENT -> variables.getOrDefault("title", "New Announcement");
            case PASSWORD_RESET -> "Password Reset Request";
            case WELCOME -> "Welcome to HRMS!";
            case EXPENSE_APPROVAL -> "Expense Claim Approved";
            case EXPENSE_REJECTION -> "Expense Claim Status Update";
            case PERFORMANCE_REVIEW_DUE -> "Performance Review Due";
            case ATTENDANCE_ALERT -> "Attendance Alert";
            default -> "HRMS Notification";
        };
    }

    @Transactional
    public EmailSendResult sendLeaveApprovalEmail(String employeeEmail, String employeeName, String leaveType,
                                                  String startDate, String endDate, String duration, String reason) {
        Map<String, String> vars = Map.of(
                "employeeName", employeeName,
                "leaveType", leaveType,
                "startDate", startDate,
                "endDate", endDate,
                "duration", duration,
                "reason", reason,
                "dashboardUrl", frontendUrl + "/me/leaves"
        );
        return sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.LEAVE_APPROVAL, vars);
    }

    // Helper methods for common email types - all return EmailSendResult for explicit error handling

    @Transactional
    public EmailSendResult sendLeaveRejectionEmail(String employeeEmail, String employeeName, String leaveType,
                                                   String startDate, String endDate, String reason, String rejectionReason) {
        Map<String, String> vars = Map.of(
                "employeeName", employeeName,
                "leaveType", leaveType,
                "startDate", startDate,
                "endDate", endDate,
                "reason", reason,
                "rejectionReason", rejectionReason,
                "dashboardUrl", frontendUrl + "/me/leaves"
        );
        return sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.LEAVE_REJECTION, vars);
    }

    @Transactional
    public EmailSendResult sendBirthdayEmail(String employeeEmail, String employeeName) {
        Map<String, String> vars = Map.of("employeeName", employeeName);
        return sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.BIRTHDAY_REMINDER, vars);
    }

    @Transactional
    public EmailSendResult sendAnniversaryEmail(String employeeEmail, String employeeName, String years) {
        Map<String, String> vars = Map.of(
                "employeeName", employeeName,
                "years", years
        );
        return sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.ANNIVERSARY_REMINDER, vars);
    }

    @Transactional
    public EmailSendResult sendPayslipReadyEmail(String employeeEmail, String employeeName, String month,
                                                 String netSalary, String paymentDate) {
        Map<String, String> vars = Map.of(
                "employeeName", employeeName,
                "month", month,
                "netSalary", netSalary,
                "paymentDate", paymentDate,
                "payslipUrl", frontendUrl + "/me/payslips"
        );
        return sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.PAYSLIP_READY, vars);
    }

    @Transactional
    public EmailSendResult sendWelcomeEmail(String employeeEmail, String employeeName, String department, String joiningDate) {
        Map<String, String> vars = Map.of(
                "employeeName", employeeName,
                "email", employeeEmail,
                "department", department,
                "joiningDate", joiningDate,
                "portalUrl", frontendUrl
        );
        return sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.WELCOME, vars);
    }

    /**
     * Result object for email operations - provides explicit success/failure status.
     * Callers can check result.success() and handle failures appropriately.
     */
    public record EmailSendResult(
            boolean success,
            UUID notificationId,
            String errorMessage,
            EmailNotification.EmailStatus status
    ) {
        public static EmailSendResult success(UUID notificationId) {
            return new EmailSendResult(true, notificationId, null, EmailNotification.EmailStatus.SENT);
        }

        public static EmailSendResult queued(UUID notificationId) {
            return new EmailSendResult(true, notificationId, null, EmailNotification.EmailStatus.PENDING);
        }

        public static EmailSendResult failure(UUID notificationId, String errorMessage) {
            return new EmailSendResult(false, notificationId, errorMessage, EmailNotification.EmailStatus.FAILED);
        }

        public static EmailSendResult failure(String errorMessage) {
            return new EmailSendResult(false, null, errorMessage, EmailNotification.EmailStatus.FAILED);
        }
    }
}
