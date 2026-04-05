package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.AgencySubmission.InvoiceStatus;
import com.hrms.domain.recruitment.AgencySubmission.SubmissionStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AgencySubmissionDto {
    private UUID id;
    private UUID tenantId;
    private UUID agencyId;
    private String agencyName;
    private UUID candidateId;
    private String candidateName;
    private UUID jobOpeningId;
    private String jobTitle;
    private LocalDateTime submittedAt;
    private BigDecimal feeAgreed;
    private String feeCurrency;
    private SubmissionStatus status;
    private LocalDate hiredAt;
    private InvoiceStatus invoiceStatus;
    private BigDecimal invoiceAmount;
    private LocalDate invoiceDate;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
}
