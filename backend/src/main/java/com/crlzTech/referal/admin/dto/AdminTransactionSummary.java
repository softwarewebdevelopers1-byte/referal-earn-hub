package com.crlzTech.referal.admin.dto;

import java.math.BigDecimal;

public record AdminTransactionSummary(
        long matchingCount,
        BigDecimal matchingAmount,
        long pendingCount,
        BigDecimal pendingAmount,
        long completedCount,
        BigDecimal completedAmount,
        long failedCount,
        BigDecimal failedAmount,
        String currency) {
}
