package com.hrms.domain.contract;

/**
 * Enumeration of signer roles
 */
public enum SignerRole {
    EMPLOYEE("Employee"),
    MANAGER("Manager"),
    HR("HR"),
    LEGAL("Legal"),
    VENDOR("Vendor");

    private final String label;

    SignerRole(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
