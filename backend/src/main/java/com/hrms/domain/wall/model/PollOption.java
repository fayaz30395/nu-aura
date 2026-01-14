package com.hrms.domain.wall.model;

import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "poll_options")
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private WallPost post;

    @Column(name = "option_text", nullable = false)
    private String optionText;

    @Column(name = "display_order")
    private int displayOrder;

    @OneToMany(mappedBy = "pollOption", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollVote> votes = new ArrayList<>();

    // Constructors
    public PollOption() {}

    public PollOption(String optionText, int displayOrder) {
        this.optionText = optionText;
        this.displayOrder = displayOrder;
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

    public WallPost getPost() {
        return post;
    }

    public void setPost(WallPost post) {
        this.post = post;
    }

    public String getOptionText() {
        return optionText;
    }

    public void setOptionText(String optionText) {
        this.optionText = optionText;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public List<PollVote> getVotes() {
        return votes;
    }

    public void setVotes(List<PollVote> votes) {
        this.votes = votes;
    }

    public int getVoteCount() {
        return votes.size();
    }
}
