package com.crlzTech.referal.config;

import com.crlzTech.referal.common.enums.AccountStatus;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.common.enums.Role;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Creates exactly one regular ADMIN account when the schema has no users. */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class InitialAdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public InitialAdminSeeder(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.initial-admin.email:}") String email,
            @Value("${app.initial-admin.password:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) return;
        validateCredentials();

        User admin = new User();
        admin.setFirstName("System");
        admin.setLastName("Admin");
        admin.setEmail(email.trim().toLowerCase(Locale.ROOT));
        admin.setPhone("+254700000000");
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);
        // The seed account must be able to enter the admin console. This does not
        // activate accounts created later through the admin user-management API.
        admin.setPaymentStatus(PaymentStatus.SUCCESS);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        admin.setReferralCode("ADM00001");
        try {
            userRepository.save(admin);
        } catch (DataIntegrityViolationException ex) {
            // A second application instance may have seeded first. Never overwrite
            // or create another account in that case.
            if (userRepository.count() == 0) throw ex;
        }
    }

    private void validateCredentials() {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "Initial admin seeding requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD when the users table is empty.");
        }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalStateException("INITIAL_ADMIN_EMAIL must be a valid email address.");
        }
        if (password.length() < 8 || isPlaceholder(password)) {
            throw new IllegalStateException(
                    "INITIAL_ADMIN_PASSWORD must be at least 8 characters and must be replaced with a unique secret.");
        }
    }

    private static boolean isPlaceholder(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("replace_me")
                || normalized.startsWith("change-me")
                || normalized.equals("password")
                || normalized.equals("password123");
    }
}
