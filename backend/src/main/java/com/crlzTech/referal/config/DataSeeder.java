package com.crlzTech.referal.config;

import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.common.enums.Role;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Dev-only bootstrap. Never enable in production.
 * Ensures the configured development admin exists and creates an activated
 * referral fixture only on a completely empty database. Existing accounts are
 * never modified and repeated application starts are idempotent.
 */
@Component
@Profile("dev")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean seedInitialUsers;
    private final String adminEmail;
    private final String adminPassword;
    private final String referralEmail;
    private final String referralPassword;
    private final String referralPhone;

    public DataSeeder(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.dev.seed-initial-users:false}") boolean seedInitialUsers,
            @Value("${app.dev.admin-email:}") String adminEmail,
            @Value("${app.dev.admin-password:}") String adminPassword,
            @Value("${app.dev.referral-email:}") String referralEmail,
            @Value("${app.dev.referral-password:}") String referralPassword,
            @Value("${app.dev.referral-phone:}") String referralPhone) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedInitialUsers = seedInitialUsers;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.referralEmail = referralEmail;
        this.referralPassword = referralPassword;
        this.referralPhone = referralPhone;
    }

    @Override
    public void run(String... args) {
        if (!seedInitialUsers)
            return;

        if (isBlank(adminEmail) || isBlank(adminPassword)) {
            System.out.println("[SEED] Admin not created: admin seed credentials are incomplete.");
            return;
        }

        boolean databaseWasEmpty = userRepository.count() == 0;
        List<User> newUsers = new ArrayList<>();

        if (userRepository.findByEmailIgnoreCase(adminEmail.trim()).isEmpty()) {
            User admin = new User();
            admin.setFirstName("System");
            admin.setLastName("Admin");
            admin.setEmail(adminEmail.trim().toLowerCase());
            admin.setPhone("+254700000000");
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            admin.setPaymentStatus(PaymentStatus.SUCCESS);
            admin.setReferralCode("ADM00001");
            newUsers.add(admin);
        }

        if (databaseWasEmpty && !isBlank(referralEmail) && !isBlank(referralPassword)
                && !isBlank(referralPhone)
                && userRepository.findByEmailIgnoreCase(referralEmail.trim()).isEmpty()) {
            User referralUser = new User();
            referralUser.setFirstName("Referral");
            referralUser.setLastName("User");
            referralUser.setEmail(referralEmail.trim().toLowerCase());
            referralUser.setPhone(referralPhone.trim());
            referralUser.setPasswordHash(passwordEncoder.encode(referralPassword));
            referralUser.setRole(Role.USER);
            referralUser.setPaymentStatus(PaymentStatus.SUCCESS);
            referralUser.setReferralCode("REF00001");
            newUsers.add(referralUser);
        }

        if (!newUsers.isEmpty()) {
            userRepository.saveAll(newUsers);
            System.out.println("[SEED] Development admin ensured; initial referral fixture created when applicable.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
