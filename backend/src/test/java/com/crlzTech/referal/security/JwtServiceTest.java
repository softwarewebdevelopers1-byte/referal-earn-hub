package com.crlzTech.referal.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    @Test
    void accessAndRefreshTokensHaveSeparateTokenTypes() {
        JwtService service = new JwtService(
                "01234567890123456789012345678901-secret-for-tests",
                900_000L,
                2_592_000_000L);

        Claims accessClaims = service.parse(service.generateAccessToken(7L, "user@example.com", "USER"));
        Claims refreshClaims = service.parse(service.generateRefreshToken(7L, "user@example.com", "USER"));

        assertTrue(service.isAccessToken(accessClaims));
        assertFalse(service.isRefreshToken(accessClaims));
        assertTrue(service.isRefreshToken(refreshClaims));
        assertFalse(service.isAccessToken(refreshClaims));
        assertEquals("7", refreshClaims.getSubject());
    }
}
