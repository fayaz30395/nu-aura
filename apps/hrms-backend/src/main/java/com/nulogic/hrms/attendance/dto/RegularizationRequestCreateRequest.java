package com.nulogic.hrms.attendance.dto;

import com.nulogic.hrms.attendance.RegularizationReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Data;

@Data
public class RegularizationRequestCreateRequest {
    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Reason is required")
    private RegularizationReason reason;

    @NotBlank(message = "Comment is required")
    private String comment;
}
