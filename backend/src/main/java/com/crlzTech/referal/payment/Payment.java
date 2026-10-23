package com.crlzTech.referal.payment;

import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "internal_reference", nullable = false, unique = true, length = 64)
    private String internalReference;

    @Column(name = "external_reference", unique = true, length = 120)
    private String externalReference;

    @Column(name = "mpesa_reference", length = 60)
    private String mpesaReference;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "KES";

    @Column(nullable = false, length = 30)
    private String method = "M_PESA";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "activation_processed", nullable = false)
    private boolean activationProcessed = false;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "raw_callback", columnDefinition = "TEXT")
    private String rawCallback;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version;

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User v) {
        this.user = v;
    }

    public String getInternalReference() {
        return internalReference;
    }

    public void setInternalReference(String v) {
        this.internalReference = v;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public void setExternalReference(String v) {
        this.externalReference = v;
    }

    public String getMpesaReference() {
        return mpesaReference;
    }

    public void setMpesaReference(String v) {
        this.mpesaReference = v;
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

    public String getMethod() {
        return method;
    }

    public void setMethod(String v) {
        this.method = v;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus v) {
        this.status = v;
    }

    public boolean isActivationProcessed() {
        return activationProcessed;
    }

    public void setActivationProcessed(boolean v) {
        this.activationProcessed = v;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String v) {
        this.rejectionReason = v;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User v) {
        this.reviewedBy = v;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant v) {
        this.reviewedAt = v;
    }

    public String getRawCallback() {
        return rawCallback;
    }

    public void setRawCallback(String v) {
        this.rawCallback = v;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant v) {
        this.updatedAt = v;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
