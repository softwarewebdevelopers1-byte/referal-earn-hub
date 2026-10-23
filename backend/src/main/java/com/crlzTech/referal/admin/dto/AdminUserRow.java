package com.crlzTech.referal.admin.dto;

import com.crlzTech.referal.common.enums.AccountStatus;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.common.enums.Role;
import java.math.BigDecimal;
import java.time.Instant;

public record AdminUserRow(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        Role role,
        PaymentStatus paymentStatus,
        AccountStatus accountStatus,
        Instant createdAt,
        BigDecimal referralEarnings,
        BigDecimal videoEarnings) {
}
