package com.hrms.api.wall.dto;

import com.hrms.domain.wall.model.WallPost;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class WallPostResponse {

    private UUID id;
    private WallPost.PostType type;
    private String content;
    private AuthorInfo author;
    private AuthorInfo praiseRecipient;
    private String imageUrl;
    private boolean pinned;
    private WallPost.PostVisibility visibility;
    private List<PollOptionResponse> pollOptions;
    private int likeCount;
    private int commentCount;
    private Map<String, Integer> reactionCounts;
    private boolean hasReacted;
    private String userReactionType;
    private boolean hasVoted;
    private UUID userVotedOptionId;
    private String celebrationType;
    private List<ReactorInfo> recentReactors;
    private int totalReactorCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static class AuthorInfo {
        private UUID id;
        private String employeeId;
        private String fullName;
        private String designation;
        private String department;
        private String avatarUrl;

        // Getters and Setters
        public UUID getId() {
            return id;
        }

        public void setId(UUID id) {
            this.id = id;
        }

        public String getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(String employeeId) {
            this.employeeId = employeeId;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getDesignation() {
            return designation;
        }

        public void setDesignation(String designation) {
            this.designation = designation;
        }

        public String getDepartment() {
            return department;
        }

        public void setDepartment(String department) {
            this.department = department;
        }

        public String getAvatarUrl() {
            return avatarUrl;
        }

        public void setAvatarUrl(String avatarUrl) {
            this.avatarUrl = avatarUrl;
        }
    }

    public static class PollOptionResponse {
        private UUID id;
        private String text;
        private int voteCount;
        private double votePercentage;

        // Getters and Setters
        public UUID getId() {
            return id;
        }

        public void setId(UUID id) {
            this.id = id;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public int getVoteCount() {
            return voteCount;
        }

        public void setVoteCount(int voteCount) {
            this.voteCount = voteCount;
        }

        public double getVotePercentage() {
            return votePercentage;
        }

        public void setVotePercentage(double votePercentage) {
            this.votePercentage = votePercentage;
        }
    }

    public static class ReactorInfo {
        private UUID employeeId;
        private String fullName;
        private String avatarUrl;
        private String reactionType;
        private LocalDateTime reactedAt;

        // Getters and Setters
        public UUID getEmployeeId() { return employeeId; }
        public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

        public String getReactionType() { return reactionType; }
        public void setReactionType(String reactionType) { this.reactionType = reactionType; }

        public LocalDateTime getReactedAt() { return reactedAt; }
        public void setReactedAt(LocalDateTime reactedAt) { this.reactedAt = reactedAt; }
    }

    // Main class Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public WallPost.PostType getType() {
        return type;
    }

    public void setType(WallPost.PostType type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public AuthorInfo getAuthor() {
        return author;
    }

    public void setAuthor(AuthorInfo author) {
        this.author = author;
    }

    public AuthorInfo getPraiseRecipient() {
        return praiseRecipient;
    }

    public void setPraiseRecipient(AuthorInfo praiseRecipient) {
        this.praiseRecipient = praiseRecipient;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public WallPost.PostVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(WallPost.PostVisibility visibility) {
        this.visibility = visibility;
    }

    public List<PollOptionResponse> getPollOptions() {
        return pollOptions;
    }

    public void setPollOptions(List<PollOptionResponse> pollOptions) {
        this.pollOptions = pollOptions;
    }

    public int getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(int likeCount) {
        this.likeCount = likeCount;
    }

    public int getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(int commentCount) {
        this.commentCount = commentCount;
    }

    public Map<String, Integer> getReactionCounts() {
        return reactionCounts;
    }

    public void setReactionCounts(Map<String, Integer> reactionCounts) {
        this.reactionCounts = reactionCounts;
    }

    public boolean isHasReacted() {
        return hasReacted;
    }

    public void setHasReacted(boolean hasReacted) {
        this.hasReacted = hasReacted;
    }

    public String getUserReactionType() {
        return userReactionType;
    }

    public void setUserReactionType(String userReactionType) {
        this.userReactionType = userReactionType;
    }

    public boolean isHasVoted() {
        return hasVoted;
    }

    public void setHasVoted(boolean hasVoted) {
        this.hasVoted = hasVoted;
    }

    public UUID getUserVotedOptionId() {
        return userVotedOptionId;
    }

    public void setUserVotedOptionId(UUID userVotedOptionId) {
        this.userVotedOptionId = userVotedOptionId;
    }

    public List<ReactorInfo> getRecentReactors() {
        return recentReactors;
    }

    public void setRecentReactors(List<ReactorInfo> recentReactors) {
        this.recentReactors = recentReactors;
    }

    public int getTotalReactorCount() {
        return totalReactorCount;
    }

    public void setTotalReactorCount(int totalReactorCount) {
        this.totalReactorCount = totalReactorCount;
    }

    public String getCelebrationType() {
        return celebrationType;
    }

    public void setCelebrationType(String celebrationType) {
        this.celebrationType = celebrationType;
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
}
