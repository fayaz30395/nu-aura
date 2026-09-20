package com.nulogic.application.knowledge.service;

import com.nulogic.application.knowledge.util.TipTapTextExtractor;
import com.nulogic.common.exception.UnauthorizedException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.knowledge.WikiPage;
import com.nulogic.domain.knowledge.WikiSpace;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.knowledge.repository.WikiPageRepository;
import com.nulogic.infrastructure.knowledge.repository.WikiPageVersionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WikiPageApprovalTest {

    @Mock private WikiPageRepository wikiPageRepository;
    @Mock private WikiPageVersionRepository wikiPageVersionRepository;
    @Mock private FluenceNotificationService fluenceNotificationService;
    @Mock private FluenceActivityService fluenceActivityService;
    @Mock private TipTapTextExtractor tipTapTextExtractor;
    @Mock private TenantTimeService tenantTimeService;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private WikiSpaceApprovalService wikiSpaceApprovalService;

    private WikiPageService wikiPageService;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID spaceId = UUID.randomUUID();
    private final UUID pageId = UUID.randomUUID();
    private final UUID approverEmployeeId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        wikiPageService = new WikiPageService(
                wikiPageRepository, wikiPageVersionRepository, fluenceNotificationService,
                fluenceActivityService, tipTapTextExtractor, tenantTimeService, employeeRepository,
                wikiSpaceApprovalService);
        TenantContext.setCurrentTenant(tenantId);
        lenient().when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    private WikiPage pageWithStatus(WikiPage.PageStatus status) {
        WikiSpace space = WikiSpace.builder().build();
        space.setId(spaceId);
        WikiPage page = WikiPage.builder().space(space).title("Handbook").status(status).build();
        page.setId(pageId);
        return page;
    }

    @Test
    void publishPage_noApprovalRequired_publishesDirectly() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), Map.of());
        WikiPage page = pageWithStatus(WikiPage.PageStatus.DRAFT);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiSpaceApprovalService.isApprovalRequired(spaceId)).thenReturn(false);
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = wikiPageService.publishPage(pageId);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.PUBLISHED);
    }

    @Test
    void publishPage_approvalRequired_setsPendingApproval() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), Map.of());
        WikiPage page = pageWithStatus(WikiPage.PageStatus.DRAFT);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiSpaceApprovalService.isApprovalRequired(spaceId)).thenReturn(true);
        when(wikiSpaceApprovalService.getApprover(spaceId)).thenReturn(approverEmployeeId);
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = wikiPageService.publishPage(pageId);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.PENDING_APPROVAL);
    }

    @Test
    void approvePage_byNonApprover_throwsUnauthorized() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), Map.of());
        WikiPage page = pageWithStatus(WikiPage.PageStatus.PENDING_APPROVAL);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiSpaceApprovalService.getApprover(spaceId)).thenReturn(approverEmployeeId);

        assertThatThrownBy(() -> wikiPageService.approvePage(pageId))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void approvePage_byConfiguredApprover_publishesPage() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), approverEmployeeId, Set.of(), Map.of());
        WikiPage page = pageWithStatus(WikiPage.PageStatus.PENDING_APPROVAL);
        when(wikiPageRepository.findByIdAndTenantId(pageId, tenantId)).thenReturn(Optional.of(page));
        when(wikiSpaceApprovalService.getApprover(spaceId)).thenReturn(approverEmployeeId);
        when(wikiPageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WikiPage result = wikiPageService.approvePage(pageId);

        assertThat(result.getStatus()).isEqualTo(WikiPage.PageStatus.PUBLISHED);
    }
}
