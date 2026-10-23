package com.crlzTech.referal.payment.dto;

import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.payment.Payment;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        Long id,
        String internalReference,
        String externalReference,
        String mpesaReference,
        BigDecimal amount,
        String currency,
        String method,
        PaymentStatus status,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(
                p.getId(), p.getInternalReference(), p.getExternalReference(), p.getMpesaReference(),
                p.getAmount(), p.getCurrency(), p.getMethod(), p.getStatus(), p.getRejectionReason(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}
