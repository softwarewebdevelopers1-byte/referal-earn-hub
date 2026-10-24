package com.crlzTech.referal.payment.dto;

import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.payment.Payment;

import java.math.BigDecimal;

public record PaymentStatusResponse(
        String paymentReference,
        PaymentStatus paymentStatus,
        BigDecimal amount,
        String currency,
        boolean accountActivated,
        boolean canAccessDashboard,
        String message) {

    public static PaymentStatusResponse from(Payment payment, boolean accountActivated,
            boolean canAccessDashboard, String message) {
        return new PaymentStatusResponse(
                payment.getInternalReference(), payment.getStatus(), payment.getAmount(), payment.getCurrency(),
                accountActivated, canAccessDashboard, message);
    }
}
