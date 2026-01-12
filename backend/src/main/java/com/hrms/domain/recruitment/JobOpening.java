package com.hrms.domain.recruitment;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "job_openings")
@Data
public class JobOpening {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "job_code", nullable = false, unique = true, length = 50)
    private String jobCode;

    @Column(name = "job_title", nullable = false, length = 200)
    private String jobTitle;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "employment_type", length = 50)
    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType;

    @Column(name = "experience_required", length = 100)
    private String experienceRequired;

    @Column(name = "min_salary")
    private BigDecimal minSalary;

    @Column(name = "max_salary")
    private BigDecimal maxSalary;

    @Column(name = "number_of_openings")
    private Integer numberOfOpenings;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "skills_required", columnDefinition = "TEXT")
    private String skillsRequired;

    @Column(name = "hiring_manager_id")
    private UUID hiringManagerId;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private JobStatus status;

    @Column(name = "posted_date")
    private LocalDate postedDate;

    @Column(name = "closing_date")
    private LocalDate closingDate;

    @Column(name = "priority", length = 20)
    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum EmploymentType {
        FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP
    }

    public enum JobStatus {
        DRAFT, OPEN, ON_HOLD, CLOSED, CANCELLED
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }
}
