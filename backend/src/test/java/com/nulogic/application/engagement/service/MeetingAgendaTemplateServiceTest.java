package com.nulogic.application.engagement.service;

import com.nulogic.api.engagement.dto.AgendaTemplateRequest;
import com.nulogic.api.engagement.dto.AgendaTemplateResponse;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.engagement.MeetingAgendaTemplate;
import com.nulogic.infrastructure.engagement.repository.MeetingAgendaTemplateRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("MeetingAgendaTemplateService")
class MeetingAgendaTemplateServiceTest {

    @Mock private MeetingAgendaTemplateRepository repository;
    @InjectMocks private MeetingAgendaTemplateService service;

    private MockedStatic<SecurityContext> sc;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID owner = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(tenantId);
        sc = mockStatic(SecurityContext.class);
        sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(owner);
        when(repository.save(any(MeetingAgendaTemplate.class))).thenAnswer(i -> {
            MeetingAgendaTemplate t = i.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });
    }

    @AfterEach
    void tearDown() {
        sc.close();
        TenantContext.clear();
    }

    @Test
    @DisplayName("create stamps tenant + owner and trims/drops blank bullets")
    void createStampsOwnerAndTenant() {
        AgendaTemplateResponse r = service.create(new AgendaTemplateRequest(" Weekly ", List.of(" Wins ", "  ", "Blockers")));

        assertThat(r.name()).isEqualTo("Weekly");
        assertThat(r.items()).containsExactly("Wins", "Blockers");
        verify(repository).save(argThat(t -> owner.equals(t.getOwnerId()) && tenantId.equals(t.getTenantId())));
    }

    @Test
    @DisplayName("create rejects a template whose bullets are all blank")
    void createRejectsAllBlank() {
        assertThatThrownBy(() -> service.create(new AgendaTemplateRequest("X", List.of("  "))))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("list is scoped to tenant and owner")
    void listScoped() {
        when(repository.findAllByTenantIdAndOwnerIdOrderByNameAsc(tenantId, owner)).thenReturn(List.of());
        assertThat(service.list()).isEmpty();
        verify(repository).findAllByTenantIdAndOwnerIdOrderByNameAsc(tenantId, owner);
    }

    @Test
    @DisplayName("delete of someone else's template is not found (no IDOR)")
    void deleteOthersNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.findByIdAndTenantIdAndOwnerId(id, tenantId, owner)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(id)).isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("delete soft-deletes own template")
    void deleteOwn() {
        UUID id = UUID.randomUUID();
        MeetingAgendaTemplate t = MeetingAgendaTemplate.builder().ownerId(owner).name("n").items("a").build();
        when(repository.findByIdAndTenantIdAndOwnerId(id, tenantId, owner)).thenReturn(Optional.of(t));

        service.delete(id);

        assertThat(t.isDeleted()).isTrue();
    }
}
