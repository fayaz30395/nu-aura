package com.nulogic.hrms.outbox.payload;

import com.nulogic.hrms.leave.LeaveRequest;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CalendarEventPayload {
    String employeeEmail;
    String summary;
    LocalDate startDate;
    LocalDate endDate;
    boolean halfDay;
    String halfDaySession;
    String idempotencyKey;
    String leaveRequestId;

    public static CalendarEventPayload leaveApproved(LeaveRequest request) {
        return CalendarEventPayload.builder()
                .employeeEmail(request.getEmployee().getOfficialEmail())
                .summary("Approved Leave")
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .halfDay(request.isHalfDay())
                .halfDaySession(request.getHalfDaySession() != null ? request.getHalfDaySession().name() : null)
                .idempotencyKey("calendar-leave-" + request.getId())
                .leaveRequestId(request.getId().toString())
                .build();
    }
}
