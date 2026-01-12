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
public class TicketResponse {
    private UUID id;
    private UUID tenantId;
    private String ticketNumber;
    private UUID employeeId;
    private String employeeName;
    private UUID categoryId;
    private String categoryName;
    private String subject;
    private String description;
    private Ticket.TicketPriority priority;
    private Ticket.TicketStatus status;
    private UUID assignedTo;
    private String assignedToName;
    private LocalDateTime assignedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private String resolutionNotes;
    private LocalDateTime dueDate;
    private String tags;
    private String attachmentUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
