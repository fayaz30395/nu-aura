package com.nulogic.hrms.outbox;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

@Component
public class OutboxProcessor {
    private final OutboxEventRepository outboxEventRepository;
    private final OutboxDispatcher dispatcher;

    public OutboxProcessor(OutboxEventRepository outboxEventRepository, OutboxDispatcher dispatcher) {
        this.outboxEventRepository = outboxEventRepository;
        this.dispatcher = dispatcher;
    }

    @Scheduled(fixedDelayString = "${HRMS_OUTBOX_POLL_MS:5000}")
    @Transactional
    public void process() {
        List<OutboxEvent> events = outboxEventRepository.findPendingReady(OutboxStatus.PENDING, PageRequest.of(0, 50));
        for (OutboxEvent event : events) {
            event.setStatus(OutboxStatus.PROCESSING);
            event.setAttempts(event.getAttempts() + 1);
            outboxEventRepository.save(event);

            try {
                dispatcher.dispatch(event);
                event.setStatus(OutboxStatus.SENT);
                event.setLastError(null);
                event.setNextRunAt(null);
            } catch (Exception ex) {
                event.setStatus(OutboxStatus.PENDING);
                event.setLastError(ex.getMessage());
                event.setNextRunAt(OffsetDateTime.now().plusMinutes(5));
            }

            outboxEventRepository.save(event);
        }
    }
}
