package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "lms_certificates", indexes = {
        @Index(name = "idx_lms_cert_tenant", columnList = "tenantId"),
        @Index(name = "idx_lms_cert_employee", columnList = "employeeId"),
        @Index(name = "idx_lms_cert_course", columnList = "courseId"),
        @Index(name = "idx_lms_cert_number", columnList = "certificateNumber")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Certificate extends TenantAware {

    @Column(name = "certificate_number", nullable = false, unique = true, length = 50)
    private String certificateNumber;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Column(name = "course_title", length = 255)
    private String courseTitle;

    @Column(name = "employee_name", length = 200)
    private String employeeName;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "score_achieved")
    private Integer scoreAchieved;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Column(name = "certificate_url", length = 1000)
    private String certificateUrl;

    @Column(name = "verification_url", length = 1000)
    private String verificationUrl;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "issued_by")
    private UUID issuedBy;

    @Column(name = "issuer_name", length = 200)
    private String issuerName;

    @Column(name = "additional_info", columnDefinition = "TEXT")
    private String additionalInfo; // JSON for custom fields

    public void setCertificateNumber(String certificateNumber) {
        this.certificateNumber = certificateNumber;
    }

    public void setCourseId(UUID courseId) {
        this.courseId = courseId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public void setEnrollmentId(UUID enrollmentId) {
        this.enrollmentId = enrollmentId;
    }

    public void setCourseTitle(String courseTitle) {
        this.courseTitle = courseTitle;
    }

    public void setIssuedAt(LocalDateTime issuedAt) {
        this.issuedAt = issuedAt;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public void setScoreAchieved(Integer scoreAchieved) {
        this.scoreAchieved = scoreAchieved;
    }

    public void setIssuedBy(UUID issuedBy) {
        this.issuedBy = issuedBy;
    }

    public void setTenantId(UUID tenantId) {
        super.setTenantId(tenantId);
    }

    public UUID getId() {
        return super.getId();
    }

    // BaseEntity overrides if needed, but adding here to be safe
    public void setId(UUID id) {
        super.setId(id);
    }
}
