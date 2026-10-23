package com.crlzTech.referal.earnings;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private LedgerType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LedgerStatus status;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "KES";

    @Column(nullable = false, unique = true, length = 64)
    private String reference;

    @Column(nullable = false, length = 300)
    private String description;

    @Column(name = "source_id")
    private Long sourceId;

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

    public LedgerType getType() {
        return type;
    }

    public void setType(LedgerType v) {
        this.type = v;
    }

    public LedgerStatus getStatus() {
        return status;
    }

    public void setStatus(LedgerStatus v) {
        this.status = v;
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

    public String getReference() {
        return reference;
    }

    public void setReference(String v) {
        this.reference = v;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String v) {
        this.description = v;
    }

    public Long getSourceId() {
        return sourceId;
    }

    public void setSourceId(Long v) {
        this.sourceId = v;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
