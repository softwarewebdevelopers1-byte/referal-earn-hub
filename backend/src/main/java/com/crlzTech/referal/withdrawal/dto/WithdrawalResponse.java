package com.crlzTech.referal.withdrawal.dto;

public record WithdrawalResponse(
        String code,
        String message,
        long successfulReferrals,
        long requiredReferrals,
        long remainingReferrals,
        boolean withdrawalEnabled,
        boolean b2cEnabled,
        boolean contactAdmin) {
}
