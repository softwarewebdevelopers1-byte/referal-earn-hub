package com.crlzTech.referal.auth.dto;

public record AuthResponse(String token, Long userId, String firstName, String lastName,
        String email, String role, String paymentStatus, String referralCode) {
}
