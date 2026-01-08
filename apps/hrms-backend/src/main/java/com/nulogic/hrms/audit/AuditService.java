package com.nulogic.hrms.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.org.Org;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditEventRepository auditEventRepository, ObjectMapper objectMapper) {
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void recordAuthEvent(Org org, User actor, String action, String result,
                                String ipAddress, String userAgent, Map<String, Object> meta) {
        recordEvent(org, actor, "AUTH", action, null, null, result, ipAddress, userAgent, meta);
    }

    @Transactional
    public void recordEvent(Org org, User actor, String module, String action,
                            String targetType, java.util.UUID targetId, String result,
                            String ipAddress, String userAgent, Map<String, Object> meta) {
        AuditEvent event = new AuditEvent();
        event.setOrg(org);
        event.setActor(actor);
        event.setModule(module);
        event.setAction(action);
        event.setTargetType(targetType);
        event.setTargetId(targetId);
        event.setResult(result);
        event.setIpAddress(ipAddress);
        event.setUserAgent(userAgent);
        event.setMeta(serializeMeta(meta));
        auditEventRepository.save(event);
    }

    private String serializeMeta(Map<String, Object> meta) {
        if (meta == null || meta.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(meta);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }
}
