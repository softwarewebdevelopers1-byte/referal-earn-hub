package com.crlzTech.referal.admin;

import com.crlzTech.referal.admin.dto.AdminDashboardResponse;
import com.crlzTech.referal.admin.dto.AdminUserRow;
import com.crlzTech.referal.common.enums.*;
import com.crlzTech.referal.earnings.LedgerEntry;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.Payment;
import com.crlzTech.referal.payment.PaymentRepository;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final LedgerEntryRepository ledgerRepository;

    public AdminService(UserRepository userRepository,
            PaymentRepository paymentRepository,
            LedgerEntryRepository ledgerRepository) {
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.ledgerRepository = ledgerRepository;
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

        BigDecimal refRewards = nullSafe(
                ledgerRepository.sumByUserAndStatusAndType(null, LedgerStatus.COMPLETED, LedgerType.REFERRAL_REWARD));
        // Note: sumByUserAndStatusAndType requires userId; add a global aggregate query
        // in LedgerEntryRepository:
        // @Query("SELECT COALESCE(SUM(l.amount),0) FROM LedgerEntry l WHERE
        // l.status=:status AND l.type=:type")
        // BigDecimal sumGlobalByStatusAndType(...)
        // For now, use a simple findAll-based fallback:
        BigDecimal refSum = ledgerRepository.findAll().stream()
                .filter(l -> l.getStatus() == LedgerStatus.COMPLETED && l.getType() == LedgerType.REFERRAL_REWARD)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal vidSum = ledgerRepository.findAll().stream()
                .filter(l -> l.getStatus() == LedgerStatus.COMPLETED && l.getType() == LedgerType.VIDEO_REWARD)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AdminDashboardResponse(totalUsers, approved, pending, rejected,
                refSum, vidSum, ledgerRepository.count());
    }

    public Page<AdminUserRow> searchUsers(String q, Role role, PaymentStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.search(q == null || q.isBlank() ? null : q.trim(), role, status, pageable)
                .map(u -> new AdminUserRow(
                        u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                        u.getRole(), u.getPaymentStatus(), u.getAccountStatus(), u.getCreatedAt(),
                        BigDecimal.ZERO, BigDecimal.ZERO // refine: compute per user if needed
                ));
    }

    private static BigDecimal nullSafe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
