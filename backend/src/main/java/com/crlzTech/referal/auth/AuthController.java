package com.crlzTech.referal.auth;

import com.crlzTech.referal.auth.dto.*;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(201).body(authService.register(req));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return authService.refresh(req);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshTokenRequest req) {
        if (req != null && req.refreshToken() != null && !req.refreshToken().isBlank()) {
            authService.logout(req.refreshToken());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        User u = CurrentUser.require();
        return Map.ofEntries(
                Map.entry("id", u.getId()),
                Map.entry("firstName", u.getFirstName()),
                Map.entry("lastName", u.getLastName()),
                Map.entry("email", u.getEmail()),
                Map.entry("phone", u.getPhone()),
                Map.entry("role", u.getRole().name()),
                Map.entry("paymentStatus", u.getPaymentStatus().name()),
                Map.entry("accountStatus", u.getAccountStatus().name()),
                Map.entry("accountActivated", u.getPaymentStatus() == com.crlzTech.referal.common.enums.PaymentStatus.SUCCESS),
                Map.entry("canAccessDashboard", u.getPaymentStatus() == com.crlzTech.referal.common.enums.PaymentStatus.SUCCESS
                        && u.getAccountStatus() == com.crlzTech.referal.common.enums.AccountStatus.ACTIVE),
                Map.entry("referralCode", u.getReferralCode()),
                Map.entry("createdAt", u.getCreatedAt()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgot(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.requestPasswordReset(req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> reset(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok().build();
    }
}
