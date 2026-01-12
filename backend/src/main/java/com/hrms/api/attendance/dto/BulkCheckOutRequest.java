package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class BulkCheckOutRequest {
    @NotEmpty(message = "At least one employee ID is required")
    private List<UUID> employeeIds;

    private LocalDateTime checkOutTime;
    private String source = "WEB";
    private String location;
    private String ip;
}
