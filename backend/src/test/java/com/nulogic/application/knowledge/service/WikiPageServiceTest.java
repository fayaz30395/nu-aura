package com.nulogic.application.knowledge.service;

import com.nulogic.application.knowledge.util.TipTapTextExtractor;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.knowledge.WikiPage;
import com.nulogic.domain.knowledge.WikiSpace;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.events.FluenceContentEvent;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import com.nulogic.infrastructure.knowledge.repository.WikiPageRepository;
import com.nulogic.infrastructure.knowledge.repository.WikiPageVersionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WikiPageService core mutation paths")
class WikiPageServiceTest {

    @Mock
    private WikiPageRepository wikiPageRepository;
    @Mock
    private WikiPageVersionRepository wikiPageVersionRepository;
    @Mock
    private FluenceNotificationService fluenceNotificationService;
    @Mock
    private FluenceActivityService fluenceActivityService;
    @Mock
    private TipTapTextExtractor tipTapTextExtractor;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WikiSpaceApprovalService wikiSpaceApprovalService;
    @Mock
    private FluenceEditLockService fluenceEditLockService;
    @Mock
    private EventPublisher eventPublisher;

    private WikiPageService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID pageId = UUID.randomUUID();
    private final UUID spaceId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new WikiPageService(wikiPageRepository, wikiPageVersionRepository, fluenceNotificationService,
                fluenceActivityService, tipTapTextExtractor, tenantTimeService, employeeRepository,
                wikiSpaceApprovalService, fluenceEditLockService);
        ReflectionTestUtils.setField(service, "eventPublisher", eventPublisher);
        TenantContext.setCurrentTenant(tenantId);
        lenient().when(tenantTimeService.now(tenantId)).thenReturn(java.time.LocalDateTime.now());
        lenient().when(tipTapTextExtractor.extract(any())).thenReturn("");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    private WikiPage pageWithStatus(WikiPage.PageStatus status) {
        WikiSpace space = WikiSpace.builder().build();
        space.setId(spaceId);
        WikiPage page = WikiPage.builder().space(space).title("Handbook").content("{}").status(status).build();
        page.setId(pageId);
        page.setTenantId(tenantId);
        return page;
    }

    @Test
    @DisplayName("createPage persists, versions, and publishes a CREATED event")
    void createPagePublishesEvent() {
        WikiPage page = pageWithStatus(WikiPage.PageStatus.DRAFT);
        when(wikiPageRepository.save(any())).thenReturn(page);
        when(wikiPageVersionRepository.countByTenantIdAndPageId(any(), any())).thenReturn(0L);
        when(wikiPageVersionRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = service.createPage(page);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.DRAFT);
        verify(eventPublisher).publishFluenceContent("wiki", page.getId(), FluenceContentEvent.ACTION_CREATED, tenantId);
        verify(fluenceActivityService).recordActivity(eq(tenantId), any(), eq("CREATED"), eq("WIKI"), eq(page.getId()), any(), any());
    }

    @Test
    @DisplayName("updatePage rejects when a different user holds the edit lock")
    void updatePageRejectsWhenLocked() {
        WikiPage existing = pageWithStatus(WikiPage.PageStatus.DRAFT);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(existing));
        doThrow(new IllegalStateException("Content is currently being edited by Alice"))
                .when(fluenceEditLockService).requireNoConflictingLock(eq(tenantId), eq("WIKI"), eq(pageId), any());

        assertThatThrownBy(() -> service.updatePage(pageId, existing))
                .isInstanceOf(IllegalStateException.class);

        verify(wikiPageRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePage saves changes and publishes an UPDATED event when no lock conflict")
    void updatePageSucceedsWithoutLockConflict() {
        WikiPage existing = pageWithStatus(WikiPage.PageStatus.DRAFT);
        WikiPage changes = WikiPage.builder().title("Updated Title").content("{}").build();
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(existing));
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(wikiPageVersionRepository.countByTenantIdAndPageId(any(), any())).thenReturn(1L);
        when(wikiPageVersionRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = service.updatePage(pageId, changes);

        assertThat(result.getTitle()).isEqualTo("Updated Title");
        verify(eventPublisher).publishFluenceContent("wiki", pageId, FluenceContentEvent.ACTION_UPDATED, tenantId);
    }

    @Test
    @DisplayName("publishPage routes to PENDING_APPROVAL when the space requires approval")
    void publishPageRoutesToApprovalWhenRequired() {
        WikiPage page = pageWithStatus(WikiPage.PageStatus.DRAFT);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), java.util.Map.of());
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiSpaceApprovalService.isApprovalRequired(spaceId)).thenReturn(true);
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = service.publishPage(pageId);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.PENDING_APPROVAL);
        verify(fluenceNotificationService, never()).notifyWatchers(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("publishPage publishes directly and notifies watchers when no approval required")
    void publishPagePublishesDirectlyWhenNoApprovalRequired() {
        WikiPage page = pageWithStatus(WikiPage.PageStatus.DRAFT);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), java.util.Map.of());
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiSpaceApprovalService.isApprovalRequired(spaceId)).thenReturn(false);
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = service.publishPage(pageId);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.PUBLISHED);
        verify(eventPublisher).publishFluenceContent("wiki", pageId, FluenceContentEvent.ACTION_PUBLISHED, tenantId);
        verify(fluenceNotificationService).notifyWatchers(eq(tenantId), eq(pageId), any(), eq("published"), any());
    }

    @Test
    @DisplayName("deletePage removes the page and publishes a DELETED event")
    void deletePagePublishesEvent() {
        WikiPage page = pageWithStatus(WikiPage.PageStatus.DRAFT);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));

        service.deletePage(pageId);

        verify(wikiPageRepository).delete(page);
        verify(eventPublisher).publishFluenceContent("wiki", pageId, FluenceContentEvent.ACTION_DELETED, tenantId);
    }

    @Test
    @DisplayName("deletePage throws when the page doesn't exist")
    void deletePageThrowsWhenNotFound() {
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deletePage(pageId)).isInstanceOf(IllegalArgumentException.class);
        verify(eventPublisher, never()).publishFluenceContent(any(), any(), any(), any());
    }

    @Test
    @DisplayName("togglePin flips isPinned and stamps pinnedAt/pinnedBy")
    void togglePinSetsAndClearsPinFields() {
        WikiPage page = pageWithStatus(WikiPage.PageStatus.PUBLISHED);
        page.setIsPinned(false);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), java.util.Map.of());
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage pinned = service.togglePin(pageId);
        assertThat(pinned.getIsPinned()).isTrue();
        assertThat(pinned.getPinnedAt()).isNotNull();

        WikiPage unpinned = service.togglePin(pageId);
        assertThat(unpinned.getIsPinned()).isFalse();
        assertThat(unpinned.getPinnedAt()).isNull();
    }

    @Test
    @DisplayName("archivePage sets status to ARCHIVED")
    void archivePageSetsStatus() {
        WikiPage page = pageWithStatus(WikiPage.PageStatus.PUBLISHED);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = service.archivePage(pageId);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.ARCHIVED);
    }
}
