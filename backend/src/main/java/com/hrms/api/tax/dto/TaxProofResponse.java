package com.hrms.api.tax.dto;

import com.hrms.domain.tax.TaxProof;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxProofResponse {
    private UUID id;
    private UUID tenantId;
    private UUID taxDeclarationId;
    private UUID employeeId;
    private String employeeName;
    private TaxProof.ProofType proofType;
    private TaxProof.InvestmentSection investmentSection;
    private String proofDescription;
    private BigDecimal declaredAmount;
    private BigDecimal approvedAmount;
    private String documentName;
    private String documentUrl;
    private String documentType;
    private Long documentSize;
    private String issuerName;
    private String policyNumber;
    private String certificateNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private TaxProof.ProofStatus status;
    private LocalDateTime submittedAt;
    private UUID verifiedBy;
    private String verifiedByName;
    private LocalDateTime verifiedAt;
    private String verificationNotes;
    private UUID rejectedBy;
    private String rejectedByName;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
