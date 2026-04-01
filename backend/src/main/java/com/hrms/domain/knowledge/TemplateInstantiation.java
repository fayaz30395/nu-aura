package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Where(clause = "is_deleted = false")
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

    @Column(columnDefinition = "JSONB", nullable = false)
    private String content;

    @Column(columnDefinition = "JSONB")
    private String variableValues;

    @Column(name = "generated_document_url", length = 500)
    private String generatedDocumentUrl;
}
