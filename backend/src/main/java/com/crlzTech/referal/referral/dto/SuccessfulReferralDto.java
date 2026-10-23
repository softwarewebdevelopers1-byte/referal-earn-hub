package com.crlzTech.referal.referral.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record SuccessfulReferralDto(
        Long refereeId,
        String refereeName,
        String maskedEmail,
        BigDecimal rewardAmount,
        Instant creditedAt) {
}
