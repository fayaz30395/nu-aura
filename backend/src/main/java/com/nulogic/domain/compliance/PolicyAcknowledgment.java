package com.nulogic.domain.compliance;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
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
        this.acknowledgedAt = LocalDateTime.now(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }
}
