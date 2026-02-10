package com.hrms.domain.wall.model;

import com.hrms.domain.employee.Employee;
import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "social_posts", indexes = {
    @Index(name = "idx_wall_post_tenant", columnList = "tenant_id"),
    @Index(name = "idx_wall_post_tenant_author", columnList = "tenant_id,author_id"),
    @Index(name = "idx_wall_post_tenant_deleted", columnList = "tenant_id,is_deleted"),
    @Index(name = "idx_wall_post_tenant_type", columnList = "tenant_id,post_type"),
    @Index(name = "idx_wall_post_created_at", columnList = "created_at"),
    @Index(name = "idx_wall_post_pinned", columnList = "is_pinned,created_at"),
    @Index(name = "idx_wall_post_celebrated", columnList = "celebrated_employee_id")
})
@EntityListeners(AuditingEntityListener.class)
public class WallPost {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false, length = 50)
    private PostType type;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private Employee author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "celebrated_employee_id")
    private Employee praiseRecipient;

    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrls;

    @Column(name = "is_pinned")
    private boolean pinned = false;

    @Column(name = "is_deleted")
    private boolean deleted = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", length = 20)
    private PostVisibility visibility = PostVisibility.ORGANIZATION;

    @Column(name = "celebration_type", length = 50)
    private String celebrationType;

    @Column(name = "achievement_title", length = 500)
    private String achievementTitle;

    @Column(name = "likes_count")
    private int likesCount = 0;

    @Column(name = "comments_count")
    private int commentsCount = 0;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostReaction> reactions = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostComment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOption> pollOptions = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PostType {
        POST,
        POLL,
        PRAISE,
        CELEBRATION,
        ANNOUNCEMENT
    }

    public enum PostVisibility {
        ORGANIZATION,
        DEPARTMENT,
        TEAM,
        PUBLIC,
        PRIVATE
    }

    // Constructors
    public WallPost() {}

    public WallPost(PostType type, String content, Employee author) {
        this.type = type;
        this.content = content;
        this.author = author;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public PostType getType() {
        return type;
    }

    public void setType(PostType type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Employee getAuthor() {
        return author;
    }

    public void setAuthor(Employee author) {
        this.author = author;
    }

    public Employee getPraiseRecipient() {
        return praiseRecipient;
    }

    public void setPraiseRecipient(Employee praiseRecipient) {
        this.praiseRecipient = praiseRecipient;
    }

    public String getMediaUrls() {
        return mediaUrls;
    }

    public void setMediaUrls(String mediaUrls) {
        this.mediaUrls = mediaUrls;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public boolean isActive() {
        return !deleted;
    }

    public void setActive(boolean active) {
        this.deleted = !active;
    }

    public PostVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(PostVisibility visibility) {
        this.visibility = visibility;
    }

    public String getCelebrationType() {
        return celebrationType;
    }

    public void setCelebrationType(String celebrationType) {
        this.celebrationType = celebrationType;
    }

    public String getAchievementTitle() {
        return achievementTitle;
    }

    public void setAchievementTitle(String achievementTitle) {
        this.achievementTitle = achievementTitle;
    }

    public int getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(int likesCount) {
        this.likesCount = likesCount;
    }

    public int getCommentsCount() {
        return commentsCount;
    }

    public void setCommentsCount(int commentsCount) {
        this.commentsCount = commentsCount;
    }

    public List<PostReaction> getReactions() {
        return reactions;
    }

    public void setReactions(List<PostReaction> reactions) {
        this.reactions = reactions;
    }

    public List<PostComment> getComments() {
        return comments;
    }

    public void setComments(List<PostComment> comments) {
        this.comments = comments;
    }

    public List<PollOption> getPollOptions() {
        return pollOptions;
    }

    public void setPollOptions(List<PollOption> pollOptions) {
        this.pollOptions = pollOptions;
    }

    public void addPollOption(PollOption option) {
        pollOptions.add(option);
        option.setPost(this);
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Helper methods
    public int getLikeCount() {
        return likesCount;
    }

    public int getCommentCount() {
        return commentsCount;
    }

    // Alias for mediaUrls for convenience
    public String getImageUrl() {
        return mediaUrls;
    }

    public void setImageUrl(String imageUrl) {
        this.mediaUrls = imageUrl;
    }
}
