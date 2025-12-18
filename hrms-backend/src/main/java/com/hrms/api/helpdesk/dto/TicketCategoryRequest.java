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
public class TicketCategoryRequest {
    private String name;
    private String description;
    private UUID defaultAssigneeId;
    private Integer slaHours;
    private Boolean isActive;
    private Integer displayOrder;
}
