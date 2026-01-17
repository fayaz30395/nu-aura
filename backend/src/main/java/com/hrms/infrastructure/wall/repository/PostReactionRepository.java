package com.hrms.infrastructure.wall.repository;

import com.hrms.domain.wall.model.PostReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {

    @Query("SELECT r FROM PostReaction r WHERE r.post.id = :postId AND r.employee.id = :employeeId")
    Optional<PostReaction> findByPostIdAndEmployeeId(@Param("postId") UUID postId, @Param("employeeId") UUID employeeId);

    @Query("SELECT r FROM PostReaction r WHERE r.post.id = :postId AND r.employee.id = :employeeId AND r.reactionType = :reactionType")
    Optional<PostReaction> findByPostIdAndEmployeeIdAndReactionType(
            @Param("postId") UUID postId,
            @Param("employeeId") UUID employeeId,
            @Param("reactionType") PostReaction.ReactionType reactionType);

    List<PostReaction> findByPostId(UUID postId);

    @Query("SELECT COUNT(r) FROM PostReaction r WHERE r.post.id = :postId")
    long countByPostId(@Param("postId") UUID postId);

    @Query("SELECT COUNT(r) FROM PostReaction r WHERE r.post.id = :postId AND r.reactionType = :reactionType")
    long countByPostIdAndReactionType(@Param("postId") UUID postId, @Param("reactionType") PostReaction.ReactionType reactionType);

    @Query("SELECT r.reactionType, COUNT(r) FROM PostReaction r WHERE r.post.id = :postId GROUP BY r.reactionType")
    List<Object[]> countReactionsByTypeForPost(@Param("postId") UUID postId);

    void deleteByPostIdAndEmployeeId(UUID postId, UUID employeeId);

    boolean existsByPostIdAndEmployeeId(UUID postId, UUID employeeId);
}
