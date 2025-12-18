package com.hrms.application.notification.service;

import com.hrms.domain.notification.EmailNotification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

import java.util.Map;

@Service
public class EmailTemplateService {

    private static final String BASE_TEMPLATE = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                    .content { padding: 30px 20px; }
                    .content h2 { color: #667eea; margin-top: 0; font-size: 20px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    .info-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                    </div>
                    <div class="content">
                        %s
                    </div>
                    <div class="footer">
                        <p>&copy; %d HRMS Platform. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """;

    public String generateEmail(EmailNotification.EmailType type, Map<String, String> variables) {
        String title = getEmailTitle(type);
        String body = getEmailBody(type, variables);
        return String.format(BASE_TEMPLATE, title, body, LocalDate.now().getYear());
    }

    private String getEmailTitle(EmailNotification.EmailType type) {
        return switch (type) {
            case LEAVE_APPROVAL -> "Leave Request Approved ✅";
            case LEAVE_REJECTION -> "Leave Request Update";
            case BIRTHDAY_REMINDER -> "Happy Birthday! 🎉";
            case ANNIVERSARY_REMINDER -> "Work Anniversary Celebration! 🎊";
            case PAYSLIP_READY -> "Your Payslip is Ready";
            case ANNOUNCEMENT -> "Important Announcement";
            case PASSWORD_RESET -> "Password Reset Request";
            case WELCOME -> "Welcome to HRMS! 👋";
            case EXPENSE_APPROVAL -> "Expense Claim Approved ✅";
            case EXPENSE_REJECTION -> "Expense Claim Update";
            case PERFORMANCE_REVIEW_DUE -> "Performance Review Due";
            case ATTENDANCE_ALERT -> "Attendance Alert";
            default -> "HRMS Notification";
        };
    }

    private String getEmailBody(EmailNotification.EmailType type, Map<String, String> variables) {
        return switch (type) {
            case LEAVE_APPROVAL -> generateLeaveApprovalEmail(variables);
            case LEAVE_REJECTION -> generateLeaveRejectionEmail(variables);
            case BIRTHDAY_REMINDER -> generateBirthdayEmail(variables);
            case ANNIVERSARY_REMINDER -> generateAnniversaryEmail(variables);
            case PAYSLIP_READY -> generatePayslipReadyEmail(variables);
            case ANNOUNCEMENT -> generateAnnouncementEmail(variables);
            case PASSWORD_RESET -> generatePasswordResetEmail(variables);
            case WELCOME -> generateWelcomeEmail(variables);
            case EXPENSE_APPROVAL -> generateExpenseApprovalEmail(variables);
            case EXPENSE_REJECTION -> generateExpenseRejectionEmail(variables);
            default -> generateGenericEmail(variables);
        };
    }

    private String generateLeaveApprovalEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Great News! Your Leave Request has been Approved</h2>
                <p>Hi %s,</p>
                <p>Your leave request has been approved by your manager.</p>
                <div class="info-box">
                    <strong>Leave Details:</strong><br>
                    📅 Leave Type: %s<br>
                    📅 From: %s<br>
                    📅 To: %s<br>
                    📅 Duration: %s days<br>
                    💬 Reason: %s
                </div>
                <p>Your leave balance has been updated accordingly.</p>
                <a href="%s" class="button">View Leave Details</a>
                <p>Have a great time!</p>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("leaveType", ""),
                vars.getOrDefault("startDate", ""),
                vars.getOrDefault("endDate", ""),
                vars.getOrDefault("duration", ""),
                vars.getOrDefault("reason", ""),
                vars.getOrDefault("dashboardUrl", "#"));
    }

    private String generateLeaveRejectionEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Leave Request Status Update</h2>
                <p>Hi %s,</p>
                <p>We regret to inform you that your leave request has been declined.</p>
                <div class="info-box">
                    <strong>Leave Details:</strong><br>
                    📅 Leave Type: %s<br>
                    📅 From: %s<br>
                    📅 To: %s<br>
                    💬 Your Reason: %s<br>
                    ❌ Rejection Reason: %s
                </div>
                <p>Please contact your manager for more information or to discuss alternative dates.</p>
                <a href="%s" class="button">View Leave Details</a>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("leaveType", ""),
                vars.getOrDefault("startDate", ""),
                vars.getOrDefault("endDate", ""),
                vars.getOrDefault("reason", ""),
                vars.getOrDefault("rejectionReason", "Not specified"),
                vars.getOrDefault("dashboardUrl", "#"));
    }

    private String generateBirthdayEmail(Map<String, String> vars) {
        return String.format(
                """
                        <h2>🎉 Happy Birthday, %s! 🎂</h2>
                        <p>The entire team wishes you a wonderful birthday filled with joy and happiness!</p>
                        <div class="info-box" style="background: linear-gradient(135deg, #FFE5E5 0%, #FFF0F0 100%); border-left-color: #FF6B9D;">
                            <p style="font-size: 16px; margin: 0;">May this year bring you success, good health, and lots of memorable moments! 🎊</p>
                        </div>
                        <p>Wishing you all the best,<br>Team HRMS</p>
                        """,
                vars.getOrDefault("employeeName", ""));
    }

    private String generateAnniversaryEmail(Map<String, String> vars) {
        return String.format(
                """
                        <h2>🎊 Congratulations on Your Work Anniversary!</h2>
                        <p>Dear %s,</p>
                        <p>Today marks %s years of your valuable contribution to our organization!</p>
                        <div class="info-box" style="background: linear-gradient(135deg, #E5F4FF 0%, #F0F9FF 100%); border-left-color: #4A90E2;">
                            <p style="font-size: 16px; margin: 0;">Thank you for your dedication, hard work, and commitment. You are an integral part of our success! 🌟</p>
                        </div>
                        <p>Here's to many more years of growth and achievements together!</p>
                        <p>Best regards,<br>Team HRMS</p>
                        """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("years", ""));
    }

    private String generatePayslipReadyEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Your Payslip is Ready for %s</h2>
                <p>Hi %s,</p>
                <p>Your payslip for the month of %s has been generated and is now available for download.</p>
                <div class="info-box">
                    <strong>Payroll Summary:</strong><br>
                    💰 Net Salary: %s<br>
                    📅 Payment Date: %s<br>
                    📄 Month/Year: %s
                </div>
                <a href="%s" class="button">Download Payslip</a>
                <p>If you have any questions, please contact the HR department.</p>
                """,
                vars.getOrDefault("month", ""),
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("month", ""),
                vars.getOrDefault("netSalary", ""),
                vars.getOrDefault("paymentDate", ""),
                vars.getOrDefault("month", ""),
                vars.getOrDefault("payslipUrl", "#"));
    }

    private String generateAnnouncementEmail(Map<String, String> vars) {
        return String.format("""
                <h2>%s</h2>
                <p>Hi %s,</p>
                %s
                <p>Best regards,<br>%s</p>
                """,
                vars.getOrDefault("title", "New Announcement"),
                vars.getOrDefault("employeeName", "Team"),
                vars.getOrDefault("message", ""),
                vars.getOrDefault("sender", "HR Department"));
    }

    private String generatePasswordResetEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Password Reset Request</h2>
                <p>Hi %s,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <a href="%s" class="button">Reset Password</a>
                <p><strong>Note:</strong> This link will expire in 24 hours.</p>
                <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("resetUrl", "#"));
    }

    private String generateWelcomeEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Welcome to the Team! 👋</h2>
                <p>Hi %s,</p>
                <p>We're excited to have you join our organization!</p>
                <div class="info-box">
                    <strong>Your Details:</strong><br>
                    👤 Name: %s<br>
                    📧 Email: %s<br>
                    🏢 Department: %s<br>
                    📅 Joining Date: %s
                </div>
                <p>You can access the HRMS portal using the link below:</p>
                <a href="%s" class="button">Access HRMS Portal</a>
                <p>If you have any questions, feel free to reach out to the HR team.</p>
                <p>Welcome aboard!</p>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("email", ""),
                vars.getOrDefault("department", ""),
                vars.getOrDefault("joiningDate", ""),
                vars.getOrDefault("portalUrl", "#"));
    }

    private String generateExpenseApprovalEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Expense Claim Approved ✅</h2>
                <p>Hi %s,</p>
                <p>Your expense claim has been approved!</p>
                <div class="info-box">
                    <strong>Expense Details:</strong><br>
                    💰 Amount: %s<br>
                    📅 Date: %s<br>
                    📝 Category: %s<br>
                    💬 Description: %s
                </div>
                <p>The amount will be credited to your account in the next payroll cycle.</p>
                <a href="%s" class="button">View Expense Details</a>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("amount", ""),
                vars.getOrDefault("date", ""),
                vars.getOrDefault("category", ""),
                vars.getOrDefault("description", ""),
                vars.getOrDefault("dashboardUrl", "#"));
    }

    private String generateExpenseRejectionEmail(Map<String, String> vars) {
        return String.format("""
                <h2>Expense Claim Status Update</h2>
                <p>Hi %s,</p>
                <p>Your expense claim has been declined.</p>
                <div class="info-box">
                    <strong>Expense Details:</strong><br>
                    💰 Amount: %s<br>
                    📅 Date: %s<br>
                    📝 Category: %s<br>
                    ❌ Rejection Reason: %s
                </div>
                <p>Please contact your manager for more information or to resubmit with corrections.</p>
                <a href="%s" class="button">View Expense Details</a>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("amount", ""),
                vars.getOrDefault("date", ""),
                vars.getOrDefault("category", ""),
                vars.getOrDefault("rejectionReason", "Not specified"),
                vars.getOrDefault("dashboardUrl", "#"));
    }

    private String generateGenericEmail(Map<String, String> vars) {
        return String.format("""
                <p>Hi %s,</p>
                %s
                <p>Best regards,<br>HRMS Team</p>
                """,
                vars.getOrDefault("employeeName", ""),
                vars.getOrDefault("message", "You have a new notification."));
    }
}
