package com.nulogic.hrms.outbox.payload;

import com.nulogic.hrms.attendance.RegularizationRequest;
import com.nulogic.hrms.leave.LeaveRequest;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmailNotificationPayload {
    String to;
    String subject;
    String body;
    String idempotencyKey;

    public static EmailNotificationPayload leaveApproved(LeaveRequest request) {
        return EmailNotificationPayload.builder()
                .to(request.getEmployee().getOfficialEmail())
                .subject("Leave approved")
                .body("Your leave request has been approved.")
                .idempotencyKey("leave-approved-" + request.getId())
                .build();
    }

    public static EmailNotificationPayload leaveRejected(LeaveRequest request) {
        return EmailNotificationPayload.builder()
                .to(request.getEmployee().getOfficialEmail())
                .subject("Leave rejected")
                .body("Your leave request has been rejected.")
                .idempotencyKey("leave-rejected-" + request.getId())
                .build();
    }

    public static EmailNotificationPayload regularizationApproved(RegularizationRequest request) {
        return EmailNotificationPayload.builder()
                .to(request.getEmployee().getOfficialEmail())
                .subject("Attendance regularization approved")
                .body("Your attendance regularization has been approved.")
                .idempotencyKey("regularization-approved-" + request.getId())
                .build();
    }

    public static EmailNotificationPayload regularizationRejected(RegularizationRequest request) {
        return EmailNotificationPayload.builder()
                .to(request.getEmployee().getOfficialEmail())
                .subject("Attendance regularization rejected")
                .body("Your attendance regularization has been rejected.")
                .idempotencyKey("regularization-rejected-" + request.getId())
                .build();
    }
}
