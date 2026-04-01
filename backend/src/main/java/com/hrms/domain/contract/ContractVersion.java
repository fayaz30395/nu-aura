package com.hrms.domain.contract;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Where;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

/**
 * ContractVersion entity for maintaining version history and audit trail of contracts
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "contract_versions", indexes = {
        @Index(name = "idx_contract_versions_contract_id", columnList = "contract_id"),
        @Index(name = "idx_contract_versions_created_at", columnList = "created_at"),
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ContractVersion extends BaseEntity {

    @Column(nullable = false)
    private UUID contractId;

    @Column(nullable = false)
    private Integer versionNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> content;

    @Column(columnDefinition = "TEXT")
    private String changeNotes;
}
