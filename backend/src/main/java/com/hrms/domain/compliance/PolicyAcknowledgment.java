package com.hrms.domain.compliance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "policy_acknowledgments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"policy_id", "employee_id", "policy_version"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PolicyAcknowledgment extends TenantAware {


    @Column(name = "policy_id", nullable = false)
    private UUID policyId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "policy_version", nullable = false)
    private Integer policyVersion;

    private LocalDateTime acknowledgedAt;

    private String ipAddress;

    private String userAgent;

    @Column(columnDefinition = "TEXT")
    private String digitalSignature; // Optional electronic signature

    public void acknowledge() {
        this.acknowledgedAt = LocalDateTime.now();
    }
}
