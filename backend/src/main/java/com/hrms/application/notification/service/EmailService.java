package com.hrms.application.notification.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.notification.EmailNotification;
import com.hrms.infrastructure.notification.repository.EmailNotificationRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    @Value("${spring.mail.from:noreply@hrms.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Async
    @Transactional
    public void sendEmail(String recipientEmail, String recipientName, EmailNotification.EmailType emailType, Map<String, String> variables) {
        UUID tenantId = TenantContext.getCurrentTenant();

        try {
            // Generate email content from template
            String htmlBody = templateService.generateEmail(emailType, variables);
            String subject = getSubject(emailType, variables);

            // Create email notification record
            EmailNotification notification = EmailNotification.builder()
                    .recipientEmail(recipientEmail)
                    .recipientName(recipientName)
                    .subject(subject)
                    .body(htmlBody)
                    .emailType(emailType)
                    .status(EmailNotification.EmailStatus.PENDING)
                    .retryCount(0)
                    .build();

            notification.setTenantId(tenantId);
            emailRepository.save(notification);

            // Send email
            sendEmailInternal(notification);

        } catch (Exception e) {
            log.error("Error sending email to {}: {}", recipientEmail, e.getMessage(), e);
        }
    }

    @Transactional
    public void sendEmailInternal(EmailNotification notification) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(notification.getRecipientEmail());
            helper.setSubject(notification.getSubject());
            helper.setText(notification.getBody(), true);

            mailSender.send(message);

            // Update notification status
            notification.setStatus(EmailNotification.EmailStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            emailRepository.save(notification);

            log.info("Email sent successfully to {} - Type: {}", notification.getRecipientEmail(), notification.getEmailType());

        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", notification.getRecipientEmail(), e.getMessage());

            // Update notification with error
            notification.setStatus(EmailNotification.EmailStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
            notification.setRetryCount(notification.getRetryCount() + 1);
            emailRepository.save(notification);
        }
    }

    /**
     * Retry failed emails (called by scheduled task)
     */
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
     * Send scheduled emails (called by scheduled task)
     */
    @Transactional
    public void sendScheduledEmails() {
        // Get all scheduled emails due for sending
        List<EmailNotification> scheduledEmails = emailRepository.findScheduledEmailsDue(
            TenantContext.getCurrentTenant(),
            EmailNotification.EmailStatus.SCHEDULED,
            LocalDateTime.now()
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

    // Helper methods for common email types

    public void sendLeaveApprovalEmail(String employeeEmail, String employeeName, String leaveType,
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
        sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.LEAVE_APPROVAL, vars);
    }

    public void sendLeaveRejectionEmail(String employeeEmail, String employeeName, String leaveType,
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
        sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.LEAVE_REJECTION, vars);
    }

    public void sendBirthdayEmail(String employeeEmail, String employeeName) {
        Map<String, String> vars = Map.of("employeeName", employeeName);
        sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.BIRTHDAY_REMINDER, vars);
    }

    public void sendAnniversaryEmail(String employeeEmail, String employeeName, String years) {
        Map<String, String> vars = Map.of(
            "employeeName", employeeName,
            "years", years
        );
        sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.ANNIVERSARY_REMINDER, vars);
    }

    public void sendPayslipReadyEmail(String employeeEmail, String employeeName, String month,
                                      String netSalary, String paymentDate) {
        Map<String, String> vars = Map.of(
            "employeeName", employeeName,
            "month", month,
            "netSalary", netSalary,
            "paymentDate", paymentDate,
            "payslipUrl", frontendUrl + "/me/payslips"
        );
        sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.PAYSLIP_READY, vars);
    }

    public void sendWelcomeEmail(String employeeEmail, String employeeName, String department, String joiningDate) {
        Map<String, String> vars = Map.of(
            "employeeName", employeeName,
            "email", employeeEmail,
            "department", department,
            "joiningDate", joiningDate,
            "portalUrl", frontendUrl
        );
        sendEmail(employeeEmail, employeeName, EmailNotification.EmailType.WELCOME, vars);
    }
}
