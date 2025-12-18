package com.hrms.infrastructure.recognition.repository;

import com.hrms.domain.recognition.RecognitionReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecognitionReactionRepository extends JpaRepository<RecognitionReaction, UUID> {

    Optional<RecognitionReaction> findByRecognitionIdAndEmployeeIdAndReactionType(
            UUID recognitionId, UUID employeeId, RecognitionReaction.ReactionType reactionType);

    List<RecognitionReaction> findByRecognitionId(UUID recognitionId);

    @Query("SELECT r.reactionType, COUNT(r) FROM RecognitionReaction r WHERE r.recognitionId = :recognitionId GROUP BY r.reactionType")
    List<Object[]> countByReactionType(@Param("recognitionId") UUID recognitionId);

    void deleteByRecognitionIdAndEmployeeIdAndReactionType(UUID recognitionId, UUID employeeId, RecognitionReaction.ReactionType reactionType);

    boolean existsByRecognitionIdAndEmployeeIdAndReactionType(UUID recognitionId, UUID employeeId, RecognitionReaction.ReactionType reactionType);
}
