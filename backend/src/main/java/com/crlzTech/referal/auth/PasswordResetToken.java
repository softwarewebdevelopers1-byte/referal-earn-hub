package com.crlzTech.referal.auth;

import com.crlzTech.referal.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, unique = true, length = 100)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User v) {
        this.user = v;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String v) {
        this.tokenHash = v;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant v) {
        this.expiresAt = v;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(Instant v) {
        this.usedAt = v;
    }
}
