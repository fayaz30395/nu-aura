package com.nulogic.application.knowledge.service;

import com.nulogic.application.knowledge.util.TipTapTextExtractor;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.knowledge.BlogPost;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.events.FluenceContentEvent;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import com.nulogic.infrastructure.knowledge.repository.BlogPostRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BlogPostService core mutation paths")
class BlogPostServiceTest {

    @Mock
    private BlogPostRepository blogPostRepository;
    @Mock
    private FluenceActivityService fluenceActivityService;
    @Mock
    private TipTapTextExtractor tipTapTextExtractor;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private FluenceEditLockService fluenceEditLockService;
    @Mock
    private EventPublisher eventPublisher;

    private BlogPostService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID postId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new BlogPostService(blogPostRepository, fluenceActivityService, tipTapTextExtractor,
                tenantTimeService, employeeRepository, fluenceEditLockService);
        ReflectionTestUtils.setField(service, "eventPublisher", eventPublisher);
        TenantContext.setCurrentTenant(tenantId);
        lenient().when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
        lenient().when(tipTapTextExtractor.extract(any())).thenReturn("");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    private BlogPost postWithStatus(BlogPost.BlogPostStatus status) {
        BlogPost post = BlogPost.builder().title("Tech Update").content("{}").status(status).build();
        post.setId(postId);
        post.setTenantId(tenantId);
        return post;
    }

    @Test
    @DisplayName("createPost persists as DRAFT and publishes a CREATED event")
    void createPostPublishesEvent() {
        BlogPost post = postWithStatus(BlogPost.BlogPostStatus.DRAFT);
        when(blogPostRepository.save(any())).thenReturn(post);

        BlogPost result = service.createPost(post);

        assertThat(result.getStatus()).isEqualTo(BlogPost.BlogPostStatus.DRAFT);
        verify(eventPublisher).publishFluenceContent("blog", post.getId(), FluenceContentEvent.ACTION_CREATED, tenantId);
        verify(fluenceActivityService).recordActivity(eq(tenantId), any(), eq("CREATED"), eq("BLOG"), eq(post.getId()), any(), any());
    }

    @Test
    @DisplayName("updatePost rejects when a different user holds the edit lock")
    void updatePostRejectsWhenLocked() {
        BlogPost existing = postWithStatus(BlogPost.BlogPostStatus.DRAFT);
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.of(existing));
        doThrow(new IllegalStateException("Content is currently being edited by Alice"))
                .when(fluenceEditLockService).requireNoConflictingLock(eq(tenantId), eq("BLOG"), eq(postId), any());

        assertThatThrownBy(() -> service.updatePost(postId, existing))
                .isInstanceOf(IllegalStateException.class);

        verify(blogPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePost saves changes and publishes an UPDATED event when no lock conflict")
    void updatePostSucceedsWithoutLockConflict() {
        BlogPost existing = postWithStatus(BlogPost.BlogPostStatus.DRAFT);
        BlogPost changes = BlogPost.builder().title("Updated Title").content("{}").build();
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.of(existing));
        when(blogPostRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BlogPost result = service.updatePost(postId, changes);

        assertThat(result.getTitle()).isEqualTo("Updated Title");
        verify(eventPublisher).publishFluenceContent("blog", postId, FluenceContentEvent.ACTION_UPDATED, tenantId);
    }

    @Test
    @DisplayName("updatePost throws when the post doesn't exist")
    void updatePostThrowsWhenNotFound() {
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updatePost(postId, postWithStatus(BlogPost.BlogPostStatus.DRAFT)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("publishPost sets status/publishedAt and publishes a PUBLISHED event")
    void publishPostPublishesEvent() {
        BlogPost post = postWithStatus(BlogPost.BlogPostStatus.DRAFT);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), java.util.Map.of());
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.of(post));
        when(blogPostRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BlogPost result = service.publishPost(postId);

        assertThat(result.getStatus()).isEqualTo(BlogPost.BlogPostStatus.PUBLISHED);
        assertThat(result.getPublishedAt()).isNotNull();
        verify(eventPublisher).publishFluenceContent("blog", postId, FluenceContentEvent.ACTION_PUBLISHED, tenantId);
    }

    @Test
    @DisplayName("schedulePost sets status SCHEDULED and the scheduled time")
    void schedulePostSetsScheduledFor() {
        BlogPost post = postWithStatus(BlogPost.BlogPostStatus.DRAFT);
        LocalDateTime scheduledFor = LocalDateTime.now().plusDays(1);
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.of(post));
        when(blogPostRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BlogPost result = service.schedulePost(postId, scheduledFor);

        assertThat(result.getStatus()).isEqualTo(BlogPost.BlogPostStatus.SCHEDULED);
        assertThat(result.getScheduledFor()).isEqualTo(scheduledFor);
    }

    @Test
    @DisplayName("archivePost sets status ARCHIVED")
    void archivePostSetsStatus() {
        BlogPost post = postWithStatus(BlogPost.BlogPostStatus.PUBLISHED);
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.of(post));
        when(blogPostRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BlogPost result = service.archivePost(postId);

        assertThat(result.getStatus()).isEqualTo(BlogPost.BlogPostStatus.ARCHIVED);
    }

    @Test
    @DisplayName("deletePost removes the post and publishes a DELETED event")
    void deletePostPublishesEvent() {
        BlogPost post = postWithStatus(BlogPost.BlogPostStatus.DRAFT);
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.of(post));

        service.deletePost(postId);

        verify(blogPostRepository).delete(post);
        verify(eventPublisher).publishFluenceContent("blog", postId, FluenceContentEvent.ACTION_DELETED, tenantId);
    }

    @Test
    @DisplayName("deletePost throws when the post doesn't exist")
    void deletePostThrowsWhenNotFound() {
        when(blogPostRepository.findByIdAndTenantId(postId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deletePost(postId)).isInstanceOf(IllegalArgumentException.class);
        verify(eventPublisher, never()).publishFluenceContent(any(), any(), any(), any());
    }
}
