package com.hrms.domain.contract;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ContractSignature entity for tracking signature workflow and status
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "contract_signatures", indexes = {
        @Index(name = "idx_contract_signatures_contract_id", columnList = "contract_id"),
        @Index(name = "idx_contract_signatures_status", columnList = "status"),
        @Index(name = "idx_contract_signatures_signer_email", columnList = "signer_email"),
        @Index(name = "idx_contract_signatures_created_at", columnList = "created_at"),
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ContractSignature extends BaseEntity {

    @Column(nullable = false)
    private UUID contractId;

    @Column
    private UUID signerId;

    @Column(nullable = false, length = 255)
    private String signerName;

    @Column(nullable = false, length = 255)
    private String signerEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SignerRole signerRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SignatureStatus status;

    @Column
    private LocalDateTime signedAt;

    @Column(length = 500)
    private String signatureImageUrl;

    @Column(length = 45)
    private String ipAddress;

    public boolean isPending() {
        return status == SignatureStatus.PENDING;
    }

    public boolean isSigned() {
        return status == SignatureStatus.SIGNED;
    }

    public boolean isDeclined() {
        return status == SignatureStatus.DECLINED;
    }

    public void markAsSigned() {
        this.status = SignatureStatus.SIGNED;
        this.signedAt = LocalDateTime.now();
    }

    public void markAsDeclined() {
        this.status = SignatureStatus.DECLINED;
    }
}
