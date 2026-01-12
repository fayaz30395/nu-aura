package com.hrms.infrastructure.recognition.repository;
import com.hrms.domain.recognition.PeerRecognition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;
@Repository
public interface PeerRecognitionRepository extends JpaRepository<PeerRecognition, UUID> {
    List<PeerRecognition> findByTenantIdAndReceiverIdOrderByCreatedAtDesc(UUID tenantId, UUID receiverId);
}
