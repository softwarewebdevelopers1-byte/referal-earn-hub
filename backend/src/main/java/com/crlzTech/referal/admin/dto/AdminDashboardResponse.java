package com.crlzTech.referal.admin.dto;

import java.math.BigDecimal;

public record AdminDashboardResponse(
        long totalUsers,
        long approvedUsers,
        long pendingPayments,
        long rejectedPayments,
        BigDecimal totalReferralRewards,
        BigDecimal totalVideoRewards,
        long totalTransactions) {
}
