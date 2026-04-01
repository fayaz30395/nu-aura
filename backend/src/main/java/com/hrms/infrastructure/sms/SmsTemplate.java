package com.hrms.infrastructure.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Templates for common SMS notifications
 */
@Slf4j
@Component
public class SmsTemplate {

    private final Map<String, String> templates = new HashMap<>();

    public SmsTemplate() {
        initializeTemplates();
    }

    private void initializeTemplates() {
        // Authentication & Security
        templates.put("OTP_VERIFICATION",
                "Your HRMS verification code is: {{code}}. This code expires in {{expiry}} minutes. Do not share this code with anyone.");

        templates.put("PASSWORD_RESET",
                "A password reset has been requested for your HRMS account. If this wasn't you, please contact IT immediately.");

        templates.put("LOGIN_ALERT",
                "New login detected on your HRMS account from {{location}} at {{time}}. If this wasn't you, secure your account immediately.");

        // Leave Management
        templates.put("LEAVE_APPROVED",
                "Your leave request for {{dates}} has been approved by {{approver}}. Enjoy your time off!");

        templates.put("LEAVE_REJECTED",
                "Your leave request for {{dates}} has been rejected. Reason: {{reason}}. Contact your manager for details.");

        templates.put("LEAVE_BALANCE_LOW",
                "Alert: Your {{leaveType}} balance is running low. Current balance: {{balance}} days.");

        // Attendance
        templates.put("ATTENDANCE_REMINDER",
                "Reminder: You haven't marked your attendance today. Please check in before {{deadline}}.");

        templates.put("MISSED_CHECKOUT",
                "You forgot to check out yesterday ({{date}}). Please regularize your attendance.");

        templates.put("LATE_ARRIVAL",
                "You checked in late today at {{time}}. Standard time is {{standardTime}}. {{lateMinutes}} minutes late.");

        // Payroll
        templates.put("SALARY_PROCESSED",
                "Your salary for {{month}} has been processed. Amount: {{amount}}. Expected credit date: {{date}}.");

        templates.put("PAYSLIP_AVAILABLE",
                "Your payslip for {{month}} is now available in the HRMS portal.");

        // General Notifications
        templates.put("ANNOUNCEMENT",
                "{{companyName}}: {{message}}");

        templates.put("TASK_ASSIGNED",
                "New task assigned: {{taskName}}. Due date: {{dueDate}}. Priority: {{priority}}.");

        templates.put("APPROVAL_PENDING",
                "You have {{count}} pending approvals in HRMS. Please review them at your earliest convenience.");

        log.info("Initialized {} SMS templates", templates.size());
    }

    /**
     * Render a template with provided variables
     */
    public String renderTemplate(String templateId, Map<String, String> variables) {
        String template = templates.get(templateId);

        if (template == null) {
            log.warn("Template not found: {}. Using raw message.", templateId);
            return templateId;
        }

        String message = template;
        if (variables != null) {
            for (Map.Entry<String, String> entry : variables.entrySet()) {
                String placeholder = "{{" + entry.getKey() + "}}";
                message = message.replace(placeholder, entry.getValue());
            }
        }

        return message;
    }

    public Map<String, String> getAllTemplates() {
        return new HashMap<>(templates);
    }
}
