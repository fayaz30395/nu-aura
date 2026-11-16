package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "template_instantiations", indexes = {
        @Index(name = "idx_template_instantiations_tenant", columnList = "tenantId"),
        @Index(name = "idx_template_instantiations_template", columnList = "templateId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TemplateInstantiation extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private DocumentTemplate template;

    @Column(nullable = false, length = 500)
    private String title;

    // PG rejects varchar into jsonb; cast on write (DEF-FLUENCE-01)
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "JSONB", nullable = false)
    private String content;

    // PG rejects varchar into jsonb; cast on write (DEF-FLUENCE-01)
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "JSONB")
    private String variableValues;

    @Column(name = "generated_document_url", length = 500)
    private String generatedDocumentUrl;
}
