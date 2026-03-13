package com.hrms.domain.contract;

/**
 * Enumeration of contract statuses throughout their lifecycle
 */
public enum ContractStatus {
    DRAFT("Draft", "Contract is being prepared"),
    PENDING_REVIEW("Pending Review", "Awaiting review from authorized personnel"),
    PENDING_SIGNATURES("Pending Signatures", "Waiting for required signatures"),
    ACTIVE("Active", "Contract is in effect"),
    EXPIRED("Expired", "Contract has reached its end date"),
    TERMINATED("Terminated", "Contract was terminated early"),
    RENEWED("Renewed", "Contract has been renewed");

    private final String label;
    private final String description;

    ContractStatus(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}
