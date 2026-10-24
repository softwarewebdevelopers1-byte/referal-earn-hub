package com.crlzTech.referal.auth;

import com.crlzTech.referal.auth.dto.*;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.security.JwtService;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository resetRepo;
    private final String frontendBaseUrl;

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PasswordResetTokenRepository resetRepo,
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.resetRepo = resetRepo;
        this.refreshTokenRepository = refreshTokenRepository;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (userRepository.existsByPhone(req.phone())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone already registered");
        }

        User referrer = null;
        if (req.referralCode() != null && !req.referralCode().isBlank()) {
            referrer = userRepository.findByReferralCode(req.referralCode().trim().toUpperCase())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid referral code"));
        }

        User user = new User();
        user.setFirstName(req.firstName().trim());
        user.setLastName(req.lastName().trim());
        user.setEmail(req.email().trim().toLowerCase());
        user.setPhone(req.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setReferralCode(generateUniqueReferralCode());
        user.setPaymentStatus(PaymentStatus.PENDING);
        user.setReferredBy(referrer);

        user = userRepository.save(user);

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (user.getAccountStatus() != com.crlzTech.referal.common.enums.AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account suspended");
        }
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest req) {
        Claims claims;
        try {
            claims = jwtService.parse(req.refreshToken());
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
        }
        if (!jwtService.isRefreshToken(claims)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        RefreshToken stored = refreshTokenRepository.findByTokenHashForUpdate(sha256(req.refreshToken()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Invalid or expired refresh token"));
        Instant now = Instant.now();
        if (stored.getRevokedAt() != null || !stored.getExpiresAt().isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
        }

        User user = stored.getUser();
        if (user.getAccountStatus() != com.crlzTech.referal.common.enums.AccountStatus.ACTIVE) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account suspended");
        }

        AuthResponse response = issueTokens(user);
        stored.setRevokedAt(now);
        stored.setReplacedByHash(sha256(response.refreshToken()));
        refreshTokenRepository.save(stored);
        return response;
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByTokenHashForUpdate(sha256(refreshToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest req) {
        // Always respond success to avoid account enumeration
        userRepository.findByEmailIgnoreCase(req.email().trim()).ifPresent(user -> {
            String raw = randomToken();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setUser(user);
            prt.setTokenHash(sha256(raw));
            prt.setExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));
            resetRepo.save(prt);
            // In production send email. In dev, log the reset URL (no secrets exposed in
            // API response).
            System.out.println("[PASSWORD RESET] " + frontendBaseUrl + "/reset-password?token=" + raw);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        String hash = sha256(req.token());
        PasswordResetToken prt = resetRepo.findByTokenHash(hash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired token"));
        if (prt.getUsedAt() != null || prt.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired token");
        }
        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        prt.setUsedAt(Instant.now());
        resetRepo.save(prt);
    }

    private String generateUniqueReferralCode() {
        String code;
        do {
            code = "LRN" + (10000 + new SecureRandom().nextInt(89999));
        } while (userRepository.findByReferralCode(code).isPresent());
        return code;
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail(), user.getRole().name());
        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        stored.setTokenHash(sha256(refreshToken));
        Claims claims = jwtService.parse(refreshToken);
        stored.setExpiresAt(claims.getExpiration().toInstant());
        refreshTokenRepository.save(stored);
        return toResponse(accessToken, refreshToken, user);
    }

    private AuthResponse toResponse(String accessToken, String refreshToken, User u) {
        return new AuthResponse(accessToken, accessToken, refreshToken, u.getId(), u.getFirstName(), u.getLastName(),
                u.getEmail(), u.getRole().name(), u.getPaymentStatus().name(), u.getAccountStatus().name(),
                u.getPaymentStatus() == PaymentStatus.SUCCESS,
                u.getPaymentStatus() == PaymentStatus.SUCCESS
                        && u.getAccountStatus() == com.crlzTech.referal.common.enums.AccountStatus.ACTIVE,
                u.getReferralCode());
    }
}
