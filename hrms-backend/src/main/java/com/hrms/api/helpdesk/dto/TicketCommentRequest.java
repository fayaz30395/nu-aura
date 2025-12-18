package com.hrms.api.helpdesk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketCommentRequest {
    private UUID ticketId;
    private UUID commenterId;
    private String comment;
    private Boolean isInternal;
    private String attachmentUrls;
}
