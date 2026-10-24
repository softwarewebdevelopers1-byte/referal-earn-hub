package com.crlzTech.referal.admin;

import com.crlzTech.referal.admin.dto.AdminDashboardResponse;
import com.crlzTech.referal.admin.dto.AdminCreateUserRequest;
import com.crlzTech.referal.admin.dto.AdminPaymentRow;
import com.crlzTech.referal.admin.dto.AdminResetPasswordRequest;
import com.crlzTech.referal.admin.dto.AdminTransactionRow;
import com.crlzTech.referal.admin.dto.AdminTransactionSummary;
import com.crlzTech.referal.admin.dto.AdminUpdateEmailRequest;
import com.crlzTech.referal.admin.dto.AdminUserRow;
import com.crlzTech.referal.auth.RefreshTokenRepository;
import com.crlzTech.referal.common.enums.*;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.Payment;
import com.crlzTech.referal.payment.PaymentRepository;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final LedgerEntryRepository ledgerRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final ZoneId applicationZone;
    private final SecureRandom random = new SecureRandom();

    public AdminService(UserRepository userRepository,
            PaymentRepository paymentRepository,
            LedgerEntryRepository ledgerRepository,
            PasswordEncoder passwordEncoder,
            RefreshTokenRepository refreshTokenRepository,
            AuditLogRepository auditLogRepository,
            @Value("${app.timezone:Africa/Nairobi}") String timezone) {
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.ledgerRepository = ledgerRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.applicationZone = ZoneId.of(timezone);
    }

    public AdminDashboardResponse dashboard() {
        long totalUsers = userRepository.count();
        long approved = userRepository.findAll().stream()
                .filter(u -> u.getPaymentStatus() == PaymentStatus.SUCCESS).count();
        long pending = paymentRepository.count(); // refine below
        long rejected = 0;

        // Use repository counts instead of loading all
        List<Payment> allPayments = paymentRepository.findAll();
        pending = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.PROCESSING)
                .count();
        rejected = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.FAILED).count();

        BigDecimal refSum = nullSafe(
                ledgerRepository.sumGlobalByStatusAndType(LedgerStatus.COMPLETED, LedgerType.REFERRAL_REWARD));
        BigDecimal vidSum = nullSafe(
                ledgerRepository.sumGlobalByStatusAndType(LedgerStatus.COMPLETED, LedgerType.VIDEO_REWARD));

        return new AdminDashboardResponse(totalUsers, approved, pending, rejected,
                refSum, vidSum, ledgerRepository.count());
    }

    public Page<AdminUserRow> searchUsers(String q, Role role, PaymentStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.search(q == null || q.isBlank() ? null : q.trim(), role, status, pageable)
                .map(u -> new AdminUserRow(
                        u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                        u.getRole(), u.getPaymentStatus(), u.getAccountStatus(), u.getCreatedAt(),
                        nullSafe(ledgerRepository.sumByUserAndStatusAndType(
                                u.getId(), LedgerStatus.COMPLETED, LedgerType.REFERRAL_REWARD)),
                        nullSafe(ledgerRepository.sumByUserAndStatusAndType(
                                u.getId(), LedgerStatus.COMPLETED, LedgerType.VIDEO_REWARD))
                ));
    }

    @Transactional(readOnly = true)
    public Page<AdminPaymentRow> searchPayments(int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return paymentRepository.findAll(pageable).map(AdminPaymentRow::from);
    }

    @Transactional(readOnly = true)
    public Page<AdminTransactionRow> searchTransactions(String date, String q, LedgerType type, LedgerStatus status,
            int page, int size) {
        DateBounds bounds = dateBounds(date);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return ledgerRepository.searchAdmin(type, status, bounds.fromInclusive(), bounds.toExclusive(), normalize(q), pageable)
                .map(AdminTransactionRow::from);
    }

    @Transactional(readOnly = true)
    public AdminTransactionSummary summarizeTransactions(String date, String q, LedgerType type, LedgerStatus status) {
        DateBounds bounds = dateBounds(date);
        String normalizedQuery = normalize(q);
        Object[] aggregate = ledgerRepository.aggregateAdmin(type, status, bounds.fromInclusive(), bounds.toExclusive(), normalizedQuery);
        Map<LedgerStatus, BigDecimal> amounts = new EnumMap<>(LedgerStatus.class);
        Map<LedgerStatus, Long> counts = new EnumMap<>(LedgerStatus.class);
        for (Object[] row : ledgerRepository.aggregateAdminByStatus(type, status, bounds.fromInclusive(), bounds.toExclusive(), normalizedQuery)) {
            LedgerStatus rowStatus = (LedgerStatus) row[0];
            counts.put(rowStatus, ((Number) row[1]).longValue());
            amounts.put(rowStatus, nullSafe((BigDecimal) row[2]));
        }
        return new AdminTransactionSummary(
                ((Number) aggregate[0]).longValue(), nullSafe((BigDecimal) aggregate[1]),
                counts.getOrDefault(LedgerStatus.PENDING, 0L), amounts.getOrDefault(LedgerStatus.PENDING, BigDecimal.ZERO),
                counts.getOrDefault(LedgerStatus.COMPLETED, 0L), amounts.getOrDefault(LedgerStatus.COMPLETED, BigDecimal.ZERO),
                counts.getOrDefault(LedgerStatus.FAILED, 0L), amounts.getOrDefault(LedgerStatus.FAILED, BigDecimal.ZERO),
                "KES");
    }

    @Transactional
    public AdminUserRow createUser(AdminCreateUserRequest request) {
        String email = normalizeEmail(request.email());
        String phone = request.phone().trim();
        ensureUniqueEmail(email, null);
        if (userRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone already registered");
        }
        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setPaymentStatus(PaymentStatus.PENDING);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setReferralCode(generateUniqueReferralCode());
        User saved = userRepository.save(user);
        auditLogRepository.save(AuditLog.of(CurrentUser.id(), "CREATE_USER", "USER", saved.getId(), "Admin-created account"));
        return toUserRow(saved);
    }

    @Transactional
    public AdminUserRow updateEmail(Long id, AdminUpdateEmailRequest request) {
        User user = findUser(id);
        String email = normalizeEmail(request.email());
        ensureUniqueEmail(email, id);
        user.setEmail(email);
        User saved = userRepository.save(user);
        auditLogRepository.save(AuditLog.of(CurrentUser.id(), "UPDATE_USER_EMAIL", "USER", id, "Administrator changed email"));
        return toUserRow(saved);
    }

    @Transactional
    public void resetPassword(Long id, AdminResetPasswordRequest request) {
        User user = findUser(id);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllForUser(id, Instant.now());
        auditLogRepository.save(AuditLog.of(CurrentUser.id(), "RESET_USER_PASSWORD", "USER", id, "Administrator reset password"));
    }

    private AdminUserRow toUserRow(User user) {
        return new AdminUserRow(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(), user.getPhone(),
                user.getRole(), user.getPaymentStatus(), user.getAccountStatus(), user.getCreatedAt(),
                nullSafe(ledgerRepository.sumByUserAndStatusAndType(user.getId(), LedgerStatus.COMPLETED, LedgerType.REFERRAL_REWARD)),
                nullSafe(ledgerRepository.sumByUserAndStatusAndType(user.getId(), LedgerStatus.COMPLETED, LedgerType.VIDEO_REWARD)));
    }

    private User findUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void ensureUniqueEmail(String email, Long currentId) {
        userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
            if (currentId == null || !existing.getId().equals(currentId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
            }
        });
    }

    private String generateUniqueReferralCode() {
        String code;
        do {
            code = "LRN" + (10000 + random.nextInt(90000));
        } while (userRepository.findByReferralCode(code).isPresent());
        return code;
    }

    private DateBounds dateBounds(String date) {
        if (date == null || date.isBlank()) return new DateBounds(null, null);
        try {
            LocalDate selected = LocalDate.parse(date);
            return new DateBounds(selected.atStartOfDay(applicationZone).toInstant(),
                    selected.plusDays(1).atStartOfDay(applicationZone).toInstant());
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date must use YYYY-MM-DD format");
        }
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private record DateBounds(Instant fromInclusive, Instant toExclusive) {}

    private static BigDecimal nullSafe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
