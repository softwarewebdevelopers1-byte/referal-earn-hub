package com.crlzTech.referal.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record InitiatePaymentRequest(
        @NotBlank @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Invalid phone") String phone) {
}
