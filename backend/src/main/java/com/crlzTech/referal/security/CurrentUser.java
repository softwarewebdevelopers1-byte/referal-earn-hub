package com.crlzTech.referal.security;

import com.crlzTech.referal.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Helper to read the authenticated user without trusting any client-supplied
 * ID.
 */
public final class CurrentUser {
    private CurrentUser() {
    }

    public static User require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("No authenticated user");
        }
        return user;
    }

    public static Long id() {
        return require().getId();
    }
}
