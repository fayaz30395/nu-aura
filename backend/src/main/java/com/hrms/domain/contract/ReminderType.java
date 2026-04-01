package com.hrms.domain.contract;

/**
 * Enumeration of contract reminder types
 */
public enum ReminderType {
    EXPIRY("Expiry", "Reminder for contract expiry"),
    RENEWAL("Renewal", "Reminder for contract renewal"),
    REVIEW("Review", "Reminder to review contract");

    private final String label;
    private final String description;

    ReminderType(String label, String description) {
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
