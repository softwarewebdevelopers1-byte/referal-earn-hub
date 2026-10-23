package com.crlzTech.referal.earnings.dto;

import java.math.BigDecimal;

public record EarningsSummaryResponse(
        BigDecimal totalEarnings,
        BigDecimal referralEarnings,
        BigDecimal videoEarnings,
        BigDecimal availableBalance,
        BigDecimal pendingEarnings,
        BigDecimal totalWithdrawn,
        long successfulReferrals,
        long pendingReferrals,
        long videosWatched) {
}
