package com.hrms.api.helpdesk.dto;

import com.hrms.domain.helpdesk.Ticket;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject cannot exceed 200 characters")
    private String subject;

    @NotBlank(message = "Description is required")
    @Size(max = 5000, message = "Description cannot exceed 5000 characters")
    private String description;

    @NotNull(message = "Priority is required")
    private Ticket.TicketPriority priority;

    private Ticket.TicketStatus status;

    private UUID assignedTo;

    private LocalDateTime assignedAt;

    private LocalDateTime resolvedAt;

    private LocalDateTime closedAt;

    @Size(max = 2000, message = "Resolution notes cannot exceed 2000 characters")
    private String resolutionNotes;

    private LocalDateTime dueDate;

    @Size(max = 500, message = "Tags cannot exceed 500 characters")
    private String tags;

    @Size(max = 2000, message = "Attachment URLs cannot exceed 2000 characters")
    private String attachmentUrls;
}
