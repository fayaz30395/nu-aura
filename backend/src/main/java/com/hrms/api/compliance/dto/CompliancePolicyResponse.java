package com.hrms.api.compliance.dto;

import com.hrms.domain.compliance.CompliancePolicy;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class CompliancePolicyResponse {
    private UUID id;
    private String name;
    private String code;
    private String description;
    private CompliancePolicy.PolicyCategory category;
    private CompliancePolicy.PolicyStatus status;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private Integer policyVersion;
    private Boolean requiresAcknowledgment;

    public static CompliancePolicyResponse from(CompliancePolicy policy) {
        return CompliancePolicyResponse.builder()
                .id(policy.getId())
                .name(policy.getName())
                .code(policy.getCode())
                .description(policy.getDescription())
                .category(policy.getCategory())
                .status(policy.getStatus())
                .effectiveDate(policy.getEffectiveDate())
                .expiryDate(policy.getExpiryDate())
                .policyVersion(policy.getPolicyVersion())
                .requiresAcknowledgment(policy.getRequiresAcknowledgment())
                .build();
    }
}
