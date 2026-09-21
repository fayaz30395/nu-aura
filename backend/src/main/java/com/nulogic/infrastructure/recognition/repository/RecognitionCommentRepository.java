package com.nulogic.infrastructure.recognition.repository;

import com.nulogic.domain.recognition.RecognitionComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecognitionCommentRepository extends JpaRepository<RecognitionComment, UUID> {

    Page<RecognitionComment> findByRecognitionIdAndTenantIdOrderByCommentedAtAsc(
            UUID recognitionId, UUID tenantId, Pageable pageable);

    Optional<RecognitionComment> findByIdAndTenantId(UUID id, UUID tenantId);
}
