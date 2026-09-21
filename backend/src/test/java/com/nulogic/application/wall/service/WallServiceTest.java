package com.nulogic.application.wall.service;

import com.nulogic.api.wall.dto.CreatePostRequest;
import com.nulogic.api.wall.dto.UpdatePostRequest;
import com.nulogic.application.common.service.ContentViewService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.wall.model.PostReaction;
import com.nulogic.domain.wall.model.WallPost;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.wall.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WallService core mutation paths")
class WallServiceTest {

    @Mock
    private WallPostRepository wallPostRepository;
    @Mock
    private PostReactionRepository postReactionRepository;
    @Mock
    private PostCommentRepository postCommentRepository;
    @Mock
    private PollOptionRepository pollOptionRepository;
    @Mock
    private PollVoteRepository pollVoteRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ContentViewService contentViewService;

    private WallService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID postId = UUID.randomUUID();
    private final UUID authorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new WallService(wallPostRepository, postReactionRepository, postCommentRepository,
                pollOptionRepository, pollVoteRepository, employeeRepository, contentViewService);
        TenantContext.setCurrentTenant(tenantId);
        lenient().when(postReactionRepository.countReactionsByTypeForPost(any())).thenReturn(List.of());
        lenient().when(postReactionRepository.findRecentByPostId(any(), any())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    private Employee author() {
        Employee employee = new Employee();
        employee.setId(authorId);
        employee.setFirstName("Jane");
        employee.setLastName("Doe");
        return employee;
    }

    private WallPost post(Employee author) {
        WallPost post = new WallPost(WallPost.PostType.POST, "Hello world", author);
        post.setId(postId);
        post.setTenantId(tenantId);
        return post;
    }

    @Test
    @DisplayName("createPost persists a post authored by the given employee")
    void createPostPersistsPost() {
        Employee author = author();
        when(employeeRepository.findByIdAndTenantId(authorId, tenantId)).thenReturn(Optional.of(author));
        when(wallPostRepository.save(any())).thenAnswer(inv -> {
            WallPost saved = inv.getArgument(0);
            saved.setId(postId);
            return saved;
        });

        CreatePostRequest request = new CreatePostRequest();
        request.setType(WallPost.PostType.POST);
        request.setContent("Hello world");

        var response = service.createPost(request, authorId);

        assertThat(response.getContent()).isEqualTo("Hello world");
        verify(wallPostRepository).save(argThat(p -> p.getAuthor().getId().equals(authorId)));
    }

    @Test
    @DisplayName("createPost throws when the author doesn't exist in this tenant")
    void createPostThrowsWhenAuthorNotFound() {
        when(employeeRepository.findByIdAndTenantId(authorId, tenantId)).thenReturn(Optional.empty());

        CreatePostRequest request = new CreatePostRequest();
        request.setType(WallPost.PostType.POST);
        request.setContent("Hello world");

        assertThatThrownBy(() -> service.createPost(request, authorId))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("updatePost allows the author to edit their own post")
    void updatePostAllowsAuthor() {
        WallPost existing = post(author());
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));
        when(wallPostRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdatePostRequest request = new UpdatePostRequest();
        request.setContent("Updated content");

        var response = service.updatePost(postId, request, authorId);

        assertThat(response.getContent()).isEqualTo("Updated content");
    }

    @Test
    @DisplayName("updatePost rejects a non-author without WALL:MANAGE")
    void updatePostRejectsNonAuthor() {
        WallPost existing = post(author());
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), Map.of());

        UpdatePostRequest request = new UpdatePostRequest();
        request.setContent("Malicious edit");

        assertThatThrownBy(() -> service.updatePost(postId, request, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);

        verify(wallPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("deletePost soft-deletes (sets active=false) when called by the author")
    void deletePostSoftDeletesForAuthor() {
        WallPost existing = post(author());
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));

        service.deletePost(postId, authorId);

        assertThat(existing.isActive()).isFalse();
        verify(wallPostRepository).save(existing);
    }

    @Test
    @DisplayName("deletePost rejects a non-author without WALL:MANAGE")
    void deletePostRejectsNonAuthor() {
        WallPost existing = post(author());
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of(), Map.of());

        assertThatThrownBy(() -> service.deletePost(postId, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);

        verify(wallPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("pinPost sets the pinned flag")
    void pinPostSetsPinnedFlag() {
        WallPost existing = post(author());
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));
        when(wallPostRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = service.pinPost(postId, true);

        assertThat(response.isPinned()).isTrue();
    }

    @Test
    @DisplayName("addReaction creates a new reaction and increments the like count")
    void addReactionCreatesNewReaction() {
        WallPost existing = post(author());
        Employee reactor = author();
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));
        when(employeeRepository.findByIdAndTenantId(authorId, tenantId)).thenReturn(Optional.of(reactor));
        when(postReactionRepository.findByPostIdAndEmployeeId(postId, authorId)).thenReturn(Optional.empty());

        service.addReaction(postId, authorId, PostReaction.ReactionType.LIKE);

        verify(postReactionRepository).save(any(PostReaction.class));
        assertThat(existing.getLikesCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("addReaction updates the reaction type when one already exists")
    void addReactionUpdatesExistingReaction() {
        WallPost existing = post(author());
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));
        when(employeeRepository.findByIdAndTenantId(authorId, tenantId)).thenReturn(Optional.of(author()));
        PostReaction existingReaction = new PostReaction(existing, author(), PostReaction.ReactionType.LIKE);
        when(postReactionRepository.findByPostIdAndEmployeeId(postId, authorId)).thenReturn(Optional.of(existingReaction));

        service.addReaction(postId, authorId, PostReaction.ReactionType.LOVE);

        assertThat(existingReaction.getReactionType()).isEqualTo(PostReaction.ReactionType.LOVE);
        verify(postReactionRepository).save(existingReaction);
        // Existing reaction path must not double-count the like
        verify(wallPostRepository, never()).save(existing);
    }

    @Test
    @DisplayName("removeReaction deletes the reaction and decrements the like count")
    void removeReactionDeletesAndDecrementsCount() {
        WallPost existing = post(author());
        existing.setLikesCount(1);
        PostReaction reaction = new PostReaction(existing, author(), PostReaction.ReactionType.LIKE);
        when(postReactionRepository.findByPostIdAndEmployeeId(postId, authorId)).thenReturn(Optional.of(reaction));
        when(wallPostRepository.findByIdAndActiveTrue(tenantId, postId)).thenReturn(Optional.of(existing));

        service.removeReaction(postId, authorId);

        verify(postReactionRepository).delete(reaction);
        assertThat(existing.getLikesCount()).isEqualTo(0);
    }
}
