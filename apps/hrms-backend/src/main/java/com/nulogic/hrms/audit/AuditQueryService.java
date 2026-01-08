package com.nulogic.hrms.audit;

import com.nulogic.hrms.audit.dto.AuditEventResponse;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.bootstrap.PermissionCatalog;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.io.IOException;
import java.io.StringWriter;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditQueryService {
    private static final List<String> FULL_MODULES = buildFullModules();

    private final AuditEventRepository auditEventRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;

    public AuditQueryService(AuditEventRepository auditEventRepository,
                             AuthorizationService authorizationService,
                             OrgService orgService) {
        this.auditEventRepository = auditEventRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
    }

    @Transactional(readOnly = true)
    public Page<AuditEventResponse> search(UUID userId,
                                           String module,
                                           String action,
                                           UUID actorId,
                                           String targetType,
                                           UUID targetId,
                                           String result,
                                           OffsetDateTime from,
                                           OffsetDateTime to,
                                           Pageable pageable) {
        AuditAccess access = resolveAccess(userId, "VIEW");
        Org org = orgService.getOrCreateOrg();
        return auditEventRepository.search(org.getId(), access.allowedModules(), module, action, actorId,
                targetType, targetId, result, from, to, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public byte[] export(UUID userId,
                         String module,
                         String action,
                         UUID actorId,
                         String targetType,
                         UUID targetId,
                         String result,
                         OffsetDateTime from,
                         OffsetDateTime to) {
        AuditAccess access = resolveAccess(userId, "EXPORT");
        Org org = orgService.getOrCreateOrg();
        List<AuditEvent> events = auditEventRepository.search(org.getId(), access.allowedModules(), module, action,
                        actorId, targetType, targetId, result, from, to, Pageable.unpaged())
                .getContent();
        return toCsv(events);
    }

    private AuditAccess resolveAccess(UUID userId, String action) {
        if (authorizationService.hasPermission(userId, "AUDIT", action, PermissionScope.ORG)) {
            return new AuditAccess(FULL_MODULES);
        }

        if ("VIEW".equals(action)) {
            boolean integration = authorizationService.hasPermission(userId, "INTEGRATION", "VIEW", PermissionScope.ORG);
            boolean system = authorizationService.hasPermission(userId, "SYSTEM", "VIEW", PermissionScope.ORG);
            List<String> modules = new ArrayList<>();
            if (integration) {
                modules.add("INTEGRATION");
            }
            if (system) {
                modules.add("SYSTEM");
            }
            if (!modules.isEmpty()) {
                return new AuditAccess(modules);
            }
        }

        throw new AccessDeniedException("Forbidden");
    }

    private AuditEventResponse toResponse(AuditEvent event) {
        User actor = event.getActor();
        return AuditEventResponse.builder()
                .id(event.getId())
                .module(event.getModule())
                .action(event.getAction())
                .result(event.getResult())
                .targetType(event.getTargetType())
                .targetId(event.getTargetId())
                .actorId(actor != null ? actor.getId() : null)
                .actorEmail(actor != null ? actor.getEmail() : null)
                .actorName(actor != null ? actor.getFullName() : null)
                .ipAddress(event.getIpAddress())
                .userAgent(event.getUserAgent())
                .meta(event.getMeta())
                .createdAt(event.getCreatedAt())
                .build();
    }

    private byte[] toCsv(List<AuditEvent> events) {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("id", "created_at", "module", "action", "result", "actor_id", "actor_email",
                        "actor_name", "target_type", "target_id", "ip_address", "user_agent", "meta")
                .build();
        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (AuditEvent event : events) {
                User actor = event.getActor();
                printer.printRecord(
                        event.getId(),
                        event.getCreatedAt(),
                        event.getModule(),
                        event.getAction(),
                        event.getResult(),
                        actor != null ? actor.getId() : null,
                        actor != null ? actor.getEmail() : null,
                        actor != null ? actor.getFullName() : null,
                        event.getTargetType(),
                        event.getTargetId(),
                        event.getIpAddress(),
                        event.getUserAgent(),
                        event.getMeta()
                );
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to export audit events", ex);
        }
        return writer.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private static List<String> buildFullModules() {
        List<String> modules = new ArrayList<>(PermissionCatalog.MODULES);
        modules.add("AUTH");
        return modules;
    }

    private record AuditAccess(List<String> allowedModules) {
    }
}
