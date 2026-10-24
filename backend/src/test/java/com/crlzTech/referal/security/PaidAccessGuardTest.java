package com.crlzTech.referal.security;

import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaidAccessGuardTest {

    private final PaidAccessGuard guard = new PaidAccessGuard();

    @Test
    void pendingAccountCannotUsePaidEndpoints() {
        User user = new User();
        user.setPaymentStatus(PaymentStatus.PENDING);
        assertFalse(guard.check(new UsernamePasswordAuthenticationToken(user, null)));
    }

    @Test
    void successfulPaymentCanUsePaidEndpoints() {
        User user = new User();
        user.setPaymentStatus(PaymentStatus.SUCCESS);
        assertTrue(guard.check(new UsernamePasswordAuthenticationToken(user, null)));
    }
}
