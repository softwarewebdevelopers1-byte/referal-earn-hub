package com.crlzTech.referal.security;

import com.crlzTech.referal.common.enums.AccountStatus;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Single backend rule for every paid-only endpoint. */
@Component("paidAccessGuard")
public class PaidAccessGuard {

    public boolean check(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return false;
        }
        return user.getAccountStatus() == AccountStatus.ACTIVE
                && user.getPaymentStatus() == PaymentStatus.SUCCESS;
    }
}
