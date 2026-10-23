package com.crlzTech.referal.referral.dto;

import java.math.BigDecimal;

public record ReferralStatsResponse(
        String referralCode,
        String referralLink,
        long totalRegisteredReferrals,
        long successfulReferrals,
        long pendingReferrals,
        BigDecimal totalEarnings) {
}
