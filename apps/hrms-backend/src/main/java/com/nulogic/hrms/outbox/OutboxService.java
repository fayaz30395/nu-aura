package com.nulogic.hrms.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.outbox.payload.CalendarEventPayload;
import com.nulogic.hrms.outbox.payload.EmailNotificationPayload;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxService {
    private final OutboxEventRepository outboxEventRepository;
    private final OrgService orgService;
    private final ObjectMapper objectMapper;

    public OutboxService(OutboxEventRepository outboxEventRepository,
                         OrgService orgService,
                         ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.orgService = orgService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void enqueueEmail(EmailNotificationPayload payload) {
        enqueue(OutboxEventType.EMAIL_NOTIFICATION, payload, payload.getIdempotencyKey());
    }

    @Transactional
    public void enqueueCalendar(CalendarEventPayload payload) {
        enqueue(OutboxEventType.CALENDAR_EVENT, payload, payload.getIdempotencyKey());
    }

    private void enqueue(OutboxEventType type, Object payload, String idempotencyKey) {
        if (idempotencyKey != null && outboxEventRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }
        Org org = orgService.getOrCreateOrg();
        OutboxEvent event = new OutboxEvent();
        event.setOrg(org);
        event.setEventType(type);
        event.setStatus(OutboxStatus.PENDING);
        event.setPayload(serialize(payload));
        event.setIdempotencyKey(idempotencyKey);
        event.setNextRunAt(OffsetDateTime.now());
        outboxEventRepository.save(event);
    }

    private String serialize(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Unable to serialize outbox payload", ex);
        }
    }
}
