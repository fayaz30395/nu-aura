package com.hrms.domain.ai;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chatbot_conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotConversation {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "conversation_history", columnDefinition = "TEXT")
    private String conversationHistory; // JSON array of messages

    @Column(name = "intent", length = 100)
    private String intent; // Detected user intent

    @Column(name = "entities", columnDefinition = "TEXT")
    private String entities; // JSON with extracted entities

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ConversationStatus status;

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating; // 1-5

    @Column(name = "was_escalated")
    private Boolean wasEscalated;

    @Column(name = "escalated_to")
    private UUID escalatedTo;

    @Column(name = "resolved")
    private Boolean resolved;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ConversationStatus {
        ACTIVE,
        RESOLVED,
        ESCALATED,
        ABANDONED
    }
}
