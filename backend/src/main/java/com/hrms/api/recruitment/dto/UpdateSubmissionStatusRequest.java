package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.AgencySubmission.InvoiceStatus;
import com.hrms.domain.recruitment.AgencySubmission.SubmissionStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateSubmissionStatusRequest {

    @NotNull(message = "Status is required")
    private SubmissionStatus status;

    private InvoiceStatus invoiceStatus;

    @DecimalMin(value = "0.00", message = "Invoice amount must be non-negative")
    private BigDecimal invoiceAmount;

    private LocalDate invoiceDate;

    private LocalDate hiredAt;

    @Size(max = 5000, message = "Notes must not exceed 5000 characters")
    private String notes;
}
