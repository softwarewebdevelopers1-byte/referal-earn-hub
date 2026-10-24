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

    /** Provider-generated reference returned when the STK request is queued. */
    @Column(name = "provider_reference", unique = true, length = 120)
    private String providerReference;

    @Column(name = "checkout_request_id", length = 120)
    private String checkoutRequestId;

    @Column(name = "merchant_request_id", length = 120)
    private String merchantRequestId;

    @Column(name = "initiated_phone", length = 30)
    private String initiatedPhone;

    @Column(name = "provider_phone", length = 30)
    private String providerPhone;

    @Column(name = "provider_result_code")
    private Integer providerResultCode;

    @Column(name = "provider_result_description", length = 500)
    private String providerResultDescription;

    @Column(name = "mpesa_reference", unique = true, length = 60)
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

    @Column(name = "callback_received_at")
    private Instant callbackReceivedAt;

    @Column(name = "payment_completed_at")
    private Instant paymentCompletedAt;

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

    public String getProviderReference() {
        return providerReference;
    }

    public void setProviderReference(String v) {
        this.providerReference = v;
    }

    public String getCheckoutRequestId() {
        return checkoutRequestId;
    }

    public void setCheckoutRequestId(String v) {
        this.checkoutRequestId = v;
    }

    public String getMerchantRequestId() {
        return merchantRequestId;
    }

    public void setMerchantRequestId(String v) {
        this.merchantRequestId = v;
    }

    public String getInitiatedPhone() {
        return initiatedPhone;
    }

    public void setInitiatedPhone(String v) {
        this.initiatedPhone = v;
    }

    public String getProviderPhone() {
        return providerPhone;
    }

    public void setProviderPhone(String v) {
        this.providerPhone = v;
    }

    public Integer getProviderResultCode() {
        return providerResultCode;
    }

    public void setProviderResultCode(Integer v) {
        this.providerResultCode = v;
    }

    public String getProviderResultDescription() {
        return providerResultDescription;
    }

    public void setProviderResultDescription(String v) {
        this.providerResultDescription = v;
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

    public Instant getCallbackReceivedAt() {
        return callbackReceivedAt;
    }

    public void setCallbackReceivedAt(Instant v) {
        this.callbackReceivedAt = v;
    }

    public Instant getPaymentCompletedAt() {
        return paymentCompletedAt;
    }

    public void setPaymentCompletedAt(Instant v) {
        this.paymentCompletedAt = v;
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
