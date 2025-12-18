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
public class TicketCategoryResponse {
    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private UUID defaultAssigneeId;
    private String defaultAssigneeName;
    private Integer slaHours;
    private Boolean isActive;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
