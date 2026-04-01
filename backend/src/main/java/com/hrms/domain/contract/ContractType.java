package com.hrms.domain.contract;

/**
 * Enumeration of contract types
 */
public enum ContractType {
    EMPLOYMENT("Employment Contract"),
    VENDOR("Vendor Contract"),
    NDA("Non-Disclosure Agreement"),
    SLA("Service Level Agreement"),
    FREELANCER("Freelancer Agreement"),
    OTHER("Other");

    private final String label;

    ContractType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
