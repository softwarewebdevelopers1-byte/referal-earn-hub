package com.crlzTech.referal.admin;

import com.crlzTech.referal.admin.dto.AdminDashboardResponse;
import com.crlzTech.referal.admin.dto.AdminPaymentRow;
import com.crlzTech.referal.admin.dto.AdminTransactionRow;
import com.crlzTech.referal.admin.dto.AdminUserRow;
import com.crlzTech.referal.common.enums.*;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.Payment;
import com.crlzTech.referal.payment.PaymentRepository;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public Page<AdminTransactionRow> searchTransactions(int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return ledgerRepository.searchAll(null, null, pageable).map(AdminTransactionRow::from);
    }

    private static BigDecimal nullSafe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
