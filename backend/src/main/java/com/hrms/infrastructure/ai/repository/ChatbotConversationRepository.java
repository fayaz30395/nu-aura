package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.ChatbotConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatbotConversationRepository extends JpaRepository<ChatbotConversation, UUID> {

    Optional<ChatbotConversation> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ChatbotConversation> findByTenantIdAndUserId(UUID tenantId, UUID userId, Pageable pageable);

    Optional<ChatbotConversation> findBySessionIdAndTenantId(UUID sessionId, UUID tenantId);

    List<ChatbotConversation> findByTenantIdAndUserIdAndStatus(
            UUID tenantId, UUID userId, ChatbotConversation.ConversationStatus status);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatbotConversation c WHERE c.tenantId = :tenantId AND c.createdAt < :cutoffDate")
    void deleteOlderThan(@Param("tenantId") UUID tenantId, @Param("cutoffDate") LocalDateTime cutoffDate);
}
