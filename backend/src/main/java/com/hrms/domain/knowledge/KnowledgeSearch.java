package com.hrms.domain.knowledge;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "knowledge_searches", indexes = {
        @Index(name = "idx_knowledge_searches_tenant", columnList = "tenantId"),
        @Index(name = "idx_knowledge_searches_query", columnList = "query"),
        @Index(name = "idx_knowledge_searches_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class KnowledgeSearch extends BaseEntity {

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 500)
    private String query;

    @Column(name = "results_count")
    private Integer resultsCount;

    @Column(name = "searched_by")
    private UUID searchedBy;
}
