package com.hrms.domain.contract;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * ContractTemplate entity for reusable contract templates
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "contract_templates", indexes = {
        @Index(name = "idx_contract_templates_tenant_id", columnList = "tenant_id"),
        @Index(name = "idx_contract_templates_type", columnList = "type"),
        @Index(name = "idx_contract_templates_is_active", columnList = "is_active"),
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ContractTemplate extends TenantAware {

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ContractType type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> content;

    @Column
    private Boolean isActive;
}
