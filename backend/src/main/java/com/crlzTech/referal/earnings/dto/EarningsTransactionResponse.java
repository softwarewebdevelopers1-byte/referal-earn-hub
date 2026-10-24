package com.crlzTech.referal.earnings.dto;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.earnings.LedgerEntry;

import java.math.BigDecimal;
import java.time.Instant;

public record EarningsTransactionResponse(
        Long id,
        LedgerType type,
        LedgerStatus status,
        BigDecimal amount,
        String currency,
        String reference,
        String description,
        Instant createdAt) {

    public static EarningsTransactionResponse from(LedgerEntry entry) {
        return new EarningsTransactionResponse(
                entry.getId(), entry.getType(), entry.getStatus(), entry.getAmount(),
                entry.getCurrency(), entry.getReference(), entry.getDescription(), entry.getCreatedAt());
    }
}
