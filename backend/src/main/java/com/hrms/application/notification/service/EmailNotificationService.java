package com.hrms.application.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for sending email notifications.
 * Supports both plain text and HTML templates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.from:noreply@hrms.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Send a simple text email.
     */
    @Async
    @Transactional
    public void sendSimpleEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);

            mailSender.send(message);
            log.info("Sent simple email to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    /**
     * Send an HTML email using a template.
     */
    @Async
    @Transactional
    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            Context context = new Context();
            context.setVariables(variables);
            context.setVariable("frontendUrl", frontendUrl);

            String htmlContent = templateEngine.process(templateName, context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Sent HTML email to: {} using template: {}", to, templateName);
        } catch (MessagingException e) {
            log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
        }
    }

    // ==================== Leave Notifications ====================

    /**
     * Notify employee about leave request submission.
     */
    @Async
    public void notifyLeaveRequestSubmitted(String employeeEmail, String employeeName,
                                             String leaveType, String dateRange) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "leaveType", leaveType,
                "dateRange", dateRange,
                "status", "submitted"
        );
        sendHtmlEmail(employeeEmail, "Leave Request Submitted", "email/leave-request-status", variables);
    }

    /**
     * Notify manager about new leave request pending approval.
     */
    @Async
    public void notifyManagerLeaveRequest(String managerEmail, String managerName,
                                           String employeeName, String leaveType,
                                           String dateRange, UUID requestId) {
        Map<String, Object> variables = Map.of(
                "managerName", managerName,
                "employeeName", employeeName,
                "leaveType", leaveType,
                "dateRange", dateRange,
                "approvalUrl", frontendUrl + "/leave/approve/" + requestId
        );
        sendHtmlEmail(managerEmail, "Leave Request Pending Approval", "email/leave-pending-approval", variables);
    }

    /**
     * Notify employee about leave approval.
     */
    @Async
    public void notifyLeaveApproved(String employeeEmail, String employeeName,
                                     String leaveType, String dateRange) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "leaveType", leaveType,
                "dateRange", dateRange,
                "status", "approved"
        );
        sendHtmlEmail(employeeEmail, "Leave Request Approved", "email/leave-request-status", variables);
    }

    /**
     * Notify employee about leave rejection.
     */
    @Async
    public void notifyLeaveRejected(String employeeEmail, String employeeName,
                                     String leaveType, String dateRange, String reason) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "leaveType", leaveType,
                "dateRange", dateRange,
                "status", "rejected",
                "reason", reason
        );
        sendHtmlEmail(employeeEmail, "Leave Request Rejected", "email/leave-request-status", variables);
    }

    // ==================== Payroll Notifications ====================

    /**
     * Notify employee about payslip availability.
     */
    @Async
    public void notifyPayslipAvailable(String employeeEmail, String employeeName,
                                        String month, String year) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "month", month,
                "year", year,
                "payslipUrl", frontendUrl + "/payroll/payslips"
        );
        sendHtmlEmail(employeeEmail, "Your Payslip is Ready", "email/payslip-available", variables);
    }

    // ==================== Account Notifications ====================

    /**
     * Send welcome email to new employee.
     */
    @Async
    @Transactional
    public void sendWelcomeEmail(String employeeEmail, String employeeName, String tempPassword) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "tempPassword", tempPassword,
                "loginUrl", frontendUrl + "/login"
        );
        sendHtmlEmail(employeeEmail, "Welcome to HRMS", "email/welcome", variables);
    }

    /**
     * Send password reset email.
     */
    @Async
    @Transactional
    public void sendPasswordResetEmail(String email, String name, String resetToken) {
        Map<String, Object> variables = Map.of(
                "name", name,
                "resetUrl", frontendUrl + "/reset-password?token=" + resetToken,
                "expiryHours", 24
        );
        sendHtmlEmail(email, "Password Reset Request", "email/password-reset", variables);
    }

    /**
     * Send password changed confirmation.
     */
    @Async
    @Transactional
    public void sendPasswordChangedEmail(String email, String name) {
        Map<String, Object> variables = Map.of(
                "name", name
        );
        sendHtmlEmail(email, "Password Changed Successfully", "email/password-changed", variables);
    }

    // ==================== Attendance Notifications ====================

    /**
     * Send attendance reminder.
     */
    @Async
    @Transactional
    public void sendAttendanceReminder(String employeeEmail, String employeeName) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "attendanceUrl", frontendUrl + "/attendance"
        );
        sendHtmlEmail(employeeEmail, "Attendance Reminder", "email/attendance-reminder", variables);
    }

    // ==================== Announcement Notifications ====================

    /**
     * Send company announcement.
     */
    @Async
    @Transactional
    public void sendAnnouncement(String employeeEmail, String employeeName,
                                  String title, String content) {
        Map<String, Object> variables = Map.of(
                "employeeName", employeeName,
                "title", title,
                "content", content
        );
        sendHtmlEmail(employeeEmail, title, "email/announcement", variables);
    }
}
