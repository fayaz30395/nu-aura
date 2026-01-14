package com.hrms.domain.wall.repository;

import com.hrms.domain.wall.model.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PollVoteRepository extends JpaRepository<PollVote, UUID> {

    @Query("SELECT v FROM PollVote v WHERE v.pollOption.id = :optionId AND v.employee.id = :employeeId")
    Optional<PollVote> findByPollOptionIdAndEmployeeId(@Param("optionId") UUID optionId, @Param("employeeId") UUID employeeId);

    @Query("SELECT v FROM PollVote v WHERE v.pollOption.post.id = :postId AND v.employee.id = :employeeId")
    Optional<PollVote> findByPostIdAndEmployeeId(@Param("postId") UUID postId, @Param("employeeId") UUID employeeId);

    @Query("SELECT COUNT(v) FROM PollVote v WHERE v.pollOption.id = :optionId")
    long countByPollOptionId(@Param("optionId") UUID optionId);

    @Query("SELECT COUNT(v) FROM PollVote v WHERE v.pollOption.post.id = :postId")
    long countByPostId(@Param("postId") UUID postId);

    boolean existsByPollOptionPostIdAndEmployeeId(UUID postId, UUID employeeId);

    void deleteByPollOptionPostIdAndEmployeeId(UUID postId, UUID employeeId);
}
