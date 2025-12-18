package com.hrms.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@MappedSuperclass
public abstract class TenantAware extends BaseEntity {

    @Column(nullable = false, updatable = false)
    private UUID tenantId;

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
}
