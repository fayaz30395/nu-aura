package com.nulogic.infrastructure.engagement.repository;

import com.nulogic.domain.engagement.MeetingAgendaTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingAgendaTemplateRepository extends JpaRepository<MeetingAgendaTemplate, UUID> {

    List<MeetingAgendaTemplate> findAllByTenantIdAndOwnerIdOrderByNameAsc(UUID tenantId, UUID ownerId);

    Optional<MeetingAgendaTemplate> findByIdAndTenantIdAndOwnerId(UUID id, UUID tenantId, UUID ownerId);
}
