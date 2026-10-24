package com.crlzTech.referal.auth.dto;

public record AuthResponse(String token, String accessToken, String refreshToken,
        Long userId, String firstName, String lastName, String email, String role,
        String paymentStatus, String accountStatus,
        boolean accountActivated, boolean canAccessDashboard, String referralCode) {
}
