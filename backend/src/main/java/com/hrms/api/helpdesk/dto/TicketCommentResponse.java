package com.hrms.api.helpdesk.dto;

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
public class TicketCommentResponse {
    private UUID id;
    private UUID tenantId;
    private UUID ticketId;
    private String ticketNumber;
    private UUID commenterId;
    private String commenterName;
    private String comment;
    private Boolean isInternal;
    private String attachmentUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
