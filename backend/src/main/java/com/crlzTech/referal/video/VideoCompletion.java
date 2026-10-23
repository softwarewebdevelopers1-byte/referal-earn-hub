package com.crlzTech.referal.video;

import com.crlzTech.referal.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "video_completions", uniqueConstraints = @UniqueConstraint(columnNames = { "user_id", "video_id" }))
public class VideoCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(name = "reward_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal rewardAmount;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User v) {
        this.user = v;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video v) {
        this.video = v;
    }

    public BigDecimal getRewardAmount() {
        return rewardAmount;
    }

    public void setRewardAmount(BigDecimal v) {
        this.rewardAmount = v;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
