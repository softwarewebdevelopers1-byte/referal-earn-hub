package com.crlzTech.referal.withdrawal;

import com.crlzTech.referal.common.enums.WithdrawalStatus;
import com.crlzTech.referal.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "withdrawal_requests")
public class WithdrawalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "KES";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private WithdrawalStatus status;

    @Column(name = "successful_referrals_at_request", nullable = false)
    private int successfulReferralsAtRequest;

    @Column(length = 500)
    private String note;

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

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal v) {
        this.amount = v;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String v) {
        this.currency = v;
    }

    public WithdrawalStatus getStatus() {
        return status;
    }

    public void setStatus(WithdrawalStatus v) {
        this.status = v;
    }

    public int getSuccessfulReferralsAtRequest() {
        return successfulReferralsAtRequest;
    }

    public void setSuccessfulReferralsAtRequest(int v) {
        this.successfulReferralsAtRequest = v;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String v) {
        this.note = v;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
