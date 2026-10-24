package com.crlzTech.referal.admin.dto;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.earnings.LedgerEntry;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminTransactionRow(
        Long id,
        Long userId,
        String userName,
        LedgerType type,
        LedgerStatus status,
        BigDecimal amount,
        String currency,
        String reference,
        String description,
        Instant createdAt) {

    public static AdminTransactionRow from(LedgerEntry entry) {
        return new AdminTransactionRow(
                entry.getId(),
                entry.getUser().getId(),
                entry.getUser().getFirstName() + " " + entry.getUser().getLastName(),
                entry.getType(),
                entry.getStatus(),
                entry.getAmount(),
                entry.getCurrency(),
                entry.getReference(),
                entry.getDescription(),
                entry.getCreatedAt());
    }
}
