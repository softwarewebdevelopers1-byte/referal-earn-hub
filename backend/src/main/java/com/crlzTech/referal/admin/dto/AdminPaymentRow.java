package com.crlzTech.referal.admin.dto;

import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.payment.Payment;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminPaymentRow(
        Long id,
        Long userId,
        String userName,
        String userEmail,
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

    public static AdminPaymentRow from(Payment payment) {
        return new AdminPaymentRow(
                payment.getId(),
                payment.getUser().getId(),
                payment.getUser().getFirstName() + " " + payment.getUser().getLastName(),
                payment.getUser().getEmail(),
                payment.getInternalReference(),
                payment.getExternalReference(),
                payment.getMpesaReference(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getRejectionReason(),
                payment.getCreatedAt(),
                payment.getUpdatedAt());
    }
}
