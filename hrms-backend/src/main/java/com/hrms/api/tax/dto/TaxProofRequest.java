package com.hrms.api.tax.dto;

import com.hrms.domain.tax.TaxProof;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxProofRequest {
    private UUID taxDeclarationId;
    private TaxProof.ProofType proofType;
    private TaxProof.InvestmentSection investmentSection;
    private String proofDescription;
    private BigDecimal declaredAmount;
    private String documentName;
    private String documentUrl;
    private String documentType;
    private Long documentSize;
    private String issuerName;
    private String policyNumber;
    private String certificateNumber;
    private LocalDate startDate;
    private LocalDate endDate;
}
