package com.nulogic.domain.engagement;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

/** Reusable list of agenda bullet points owned by one employee. */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "meeting_agenda_templates", indexes = {
        @Index(name = "idx_meeting_agenda_templates_tenant_owner", columnList = "tenant_id, owner_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MeetingAgendaTemplate extends TenantAware {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    // shortcut: bullets stored newline-separated in one TEXT column; move to a child table if per-bullet metadata is needed.
    @Column(name = "items", nullable = false, columnDefinition = "TEXT")
    private String items;
}
