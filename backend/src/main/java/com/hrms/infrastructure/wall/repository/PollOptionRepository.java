package com.hrms.infrastructure.wall.repository;

import com.hrms.domain.wall.model.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PollOptionRepository extends JpaRepository<PollOption, UUID> {

    @Query("SELECT o FROM PollOption o WHERE o.post.id = :postId ORDER BY o.displayOrder")
    List<PollOption> findByPostIdOrderByDisplayOrder(@Param("postId") UUID postId);

    @Query("SELECT o.id, COUNT(v) FROM PollOption o LEFT JOIN o.votes v WHERE o.post.id = :postId GROUP BY o.id")
    List<Object[]> getVoteCountsByPostId(@Param("postId") UUID postId);
}
