package com.hrms.domain.recognition;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;
@Entity @Table(name = "peer_recognitions") @Data @NoArgsConstructor @AllArgsConstructor
public class PeerRecognition {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "giver_id", nullable = false) private UUID giverId;
    @Column(name = "receiver_id", nullable = false) private UUID receiverId;
    @Column(name = "badge_id") private UUID badgeId;
    @Column(name = "message", columnDefinition = "TEXT", nullable = false) private String message;
    @Column(name = "is_public") private Boolean isPublic;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
}
