package com.crlzTech.referal.referral;

import com.crlzTech.referal.payment.Payment;
import com.crlzTech.referal.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "referral_earnings")
public class ReferralEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referrer_id", nullable = false)
    private User referrer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referee_id", nullable = false)
    private User referee;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false, unique = true)
    private Payment payment;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "KES";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public User getReferrer() {
        return referrer;
    }

    public void setReferrer(User v) {
        this.referrer = v;
    }

    public User getReferee() {
        return referee;
    }

    public void setReferee(User v) {
        this.referee = v;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment v) {
        this.payment = v;
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

    public Instant getCreatedAt() {
        return createdAt;
    }
}
