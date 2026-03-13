package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.Map;
import java.util.UUID;

/**
 * Event published for significant employee lifecycle milestones.
 *
 * <p>Enables downstream services to respond to employee changes:
 * - ONBOARDED: Create default leave balances, assign onboarding tasks
 * - OFFBOARDED: Remove access, initiate document collection
 * - PROMOTED: Update compensation, create performance review cycles
 * - TRANSFERRED: Update department assignments, location, reporting structure
 * - HIRED: Initialize employee record with basic info
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeeLifecycleEvent extends BaseKafkaEvent {

    /**
     * Employee ID (primary subject of the lifecycle event).
     */
    @JsonProperty("employee_id")
    private UUID employeeId;

    /**
     * Event type: HIRED, ONBOARDED, PROMOTED, TRANSFERRED, OFFBOARDED
     */
    @JsonProperty("event_type_enum")
    private String eventTypeEnum;

    /**
     * User ID of the initiator (typically HR Admin or Manager).
     */
    @JsonProperty("initiated_by")
    private UUID initiatedBy;

    /**
     * Employee's email address (for communication).
     */
    @JsonProperty("email")
    private String email;

    /**
     * Employee's name.
     */
    @JsonProperty("name")
    private String name;

    /**
     * Department ID the employee is assigned to.
     */
    @JsonProperty("department_id")
    private UUID departmentId;

    /**
     * Reporting manager ID.
     */
    @JsonProperty("manager_id")
    private UUID managerId;

    /**
     * Job title/designation.
     */
    @JsonProperty("job_title")
    private String jobTitle;

    /**
     * Employment type: PERMANENT, CONTRACT, TEMPORARY, etc.
     */
    @JsonProperty("employment_type")
    private String employmentType;

    /**
     * Event-specific metadata.
     * For PROMOTED: oldJobTitle, newJobTitle, salaryIncrease, effectiveDate
     * For TRANSFERRED: oldDepartment, newDepartment, oldLocation, newLocation, oldReportingManager
     * For OFFBOARDED: reason, lastWorkingDay, exitInterviewDate
     * For ONBOARDED: startDate, onboardingManagerId, mentorId
     */
    @JsonProperty("metadata")
    private Map<String, Object> metadata;

    /**
     * Whether this is part of a bulk operation (batch hiring, batch onboarding).
     */
    @JsonProperty("bulk_operation")
    private boolean bulkOperation;
}
