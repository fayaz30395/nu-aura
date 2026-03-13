package com.hrms.domain.contract;

/**
 * Enumeration of signature statuses
 */
public enum SignatureStatus {
    PENDING("Pending", "Signature pending"),
    SIGNED("Signed", "Signature received"),
    DECLINED("Declined", "Signature declined");

    private final String label;
    private final String description;

    SignatureStatus(String label, String description) {
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
