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

/**
 * Dev-only bootstrap. Never enable in production.
 * Set DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD via env or application-dev.yml.
 * If unset, no admin is created.
 */
@Component
@Profile("dev")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public DataSeeder(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.dev.admin-email:}") String adminEmail,
            @Value("${app.dev.admin-password:}") String adminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank())
            return;
        if (userRepository.existsByEmailIgnoreCase(adminEmail))
            return;
        User admin = new User();
        admin.setFirstName("System");
        admin.setLastName("Admin");
        admin.setEmail(adminEmail.toLowerCase());
        admin.setPhone("+254700000000");
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setRole(Role.ADMIN);
        admin.setPaymentStatus(PaymentStatus.SUCCESS);
        admin.setReferralCode("ADM00001");
        userRepository.save(admin);
        System.out.println("[SEED] Dev admin created: " + adminEmail);
    }
}
