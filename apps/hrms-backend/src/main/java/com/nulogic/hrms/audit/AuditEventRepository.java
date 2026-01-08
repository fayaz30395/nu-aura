package com.nulogic.hrms.audit;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    @EntityGraph(attributePaths = {"actor"})
    @Query("""
            select a from AuditEvent a
            where a.org.id = :orgId
              and a.module in :modules
              and (:module is null or a.module = :module)
              and (:action is null or a.action = :action)
              and (:actorId is null or a.actor.id = :actorId)
              and (:targetType is null or a.targetType = :targetType)
              and (:targetId is null or a.targetId = :targetId)
              and (:result is null or a.result = :result)
              and (:from is null or a.createdAt >= :from)
              and (:to is null or a.createdAt <= :to)
            """)
    Page<AuditEvent> search(@Param("orgId") UUID orgId,
                            @Param("modules") List<String> modules,
                            @Param("module") String module,
                            @Param("action") String action,
                            @Param("actorId") UUID actorId,
                            @Param("targetType") String targetType,
                            @Param("targetId") UUID targetId,
                            @Param("result") String result,
                            @Param("from") OffsetDateTime from,
                            @Param("to") OffsetDateTime to,
                            Pageable pageable);
}
