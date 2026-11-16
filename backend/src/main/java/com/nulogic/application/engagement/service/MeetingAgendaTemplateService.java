package com.nulogic.application.engagement.service;

import com.nulogic.api.engagement.dto.AgendaTemplateRequest;
import com.nulogic.api.engagement.dto.AgendaTemplateResponse;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.engagement.MeetingAgendaTemplate;
import com.nulogic.infrastructure.engagement.repository.MeetingAgendaTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/** Agenda templates are private to their owner: every query is scoped by tenant AND owner. */
@Service
@RequiredArgsConstructor
public class MeetingAgendaTemplateService {

    private static final String SEPARATOR = "\n";

    private final MeetingAgendaTemplateRepository repository;

    @Transactional(readOnly = true)
    public List<AgendaTemplateResponse> list() {
        return repository.findAllByTenantIdAndOwnerIdOrderByNameAsc(tenantId(), ownerId())
                .stream().map(MeetingAgendaTemplateService::toResponse).toList();
    }

    @Transactional
    public AgendaTemplateResponse create(AgendaTemplateRequest request) {
        List<String> bullets = request.items().stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        if (bullets.isEmpty()) {
            throw new IllegalArgumentException("Template needs at least one agenda item");
        }
        MeetingAgendaTemplate template = MeetingAgendaTemplate.builder()
                .ownerId(ownerId())
                .name(request.name().trim())
                .items(String.join(SEPARATOR, bullets.stream().map(s -> s.replace('\n', ' ')).toList()))
                .build();
        template.setTenantId(tenantId());
        return toResponse(repository.save(template));
    }

    @Transactional
    public void delete(UUID id) {
        MeetingAgendaTemplate template = repository.findByIdAndTenantIdAndOwnerId(id, tenantId(), ownerId())
                .orElseThrow(() -> new ResourceNotFoundException("Agenda template not found"));
        template.softDelete();
        repository.save(template);
    }

    private static UUID tenantId() {
        return TenantContext.requireCurrentTenant();
    }

    private static UUID ownerId() {
        UUID id = SecurityContext.getCurrentEmployeeId();
        if (id == null) {
            throw new IllegalStateException("No employee linked to current user");
        }
        return id;
    }

    private static AgendaTemplateResponse toResponse(MeetingAgendaTemplate t) {
        return new AgendaTemplateResponse(t.getId(), t.getName(), Arrays.asList(t.getItems().split(SEPARATOR)));
    }
}
