package com.hrms.api.helpdesk.dto;

import com.hrms.domain.helpdesk.Ticket;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketRequest {
    private UUID employeeId;
    private UUID categoryId;
    private String subject;
    private String description;
    private Ticket.TicketPriority priority;
    private Ticket.TicketStatus status;
    private UUID assignedTo;
    private LocalDateTime assignedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private String resolutionNotes;
    private LocalDateTime dueDate;
    private String tags;
    private String attachmentUrls;
}
