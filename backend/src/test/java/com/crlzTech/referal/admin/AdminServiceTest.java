package com.crlzTech.referal.admin;

import com.crlzTech.referal.admin.dto.AdminTransactionSummary;
import com.crlzTech.referal.auth.RefreshTokenRepository;
import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.PaymentRepository;
import com.crlzTech.referal.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final LedgerEntryRepository ledger = mock(LedgerEntryRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
    private final AuditLogRepository audit = mock(AuditLogRepository.class);
    private final AdminService service = new AdminService(users, payments, ledger, encoder, refreshTokens, audit, "Africa/Nairobi");

    @Test
    void dateFilterUsesStartInclusiveAndNextDayExclusiveBoundaries() {
        when(ledger.searchAdmin(any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(Page.empty());
        service.searchTransactions("2026-10-24", "member@example.com", LedgerType.VIDEO_REWARD, LedgerStatus.PENDING, 0, 10);

        var from = LocalDate.of(2026, 10, 24).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        var to = LocalDate.of(2026, 10, 25).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        verify(ledger).searchAdmin(eq(LedgerType.VIDEO_REWARD), eq(LedgerStatus.PENDING), eq(from), eq(to), eq("member@example.com"), any(Pageable.class));
    }

    @Test
    void invalidDateIsRejectedBeforeTheRepositoryIsCalled() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.searchTransactions("24-10-2026", null, null, null, 0, 10));
        verifyNoInteractions(ledger);
    }

    @Test
    void summaryAggregatesAllMatchingRowsByStatus() {
        when(ledger.aggregateAdmin(any(), any(), any(), any(), any())).thenReturn(
                new Object[] { new Object[] { 12L, new BigDecimal("120.50") } });
        when(ledger.aggregateAdminByStatus(any(), any(), any(), any(), any())).thenReturn(List.of(
                new Object[] { LedgerStatus.PENDING, 3L, new BigDecimal("30.00") },
                new Object[] { LedgerStatus.COMPLETED, 8L, new BigDecimal("90.50") },
                new Object[] { LedgerStatus.FAILED, 1L, new BigDecimal("0.00") }));

        AdminTransactionSummary summary = service.summarizeTransactions("2026-10-24", null, null, null);

        assertEquals(12, summary.matchingCount());
        assertEquals(new BigDecimal("120.50"), summary.matchingAmount());
        assertEquals(3, summary.pendingCount());
        assertEquals(new BigDecimal("30.00"), summary.pendingAmount());
        assertEquals(8, summary.completedCount());
        assertEquals(new BigDecimal("90.50"), summary.completedAmount());
        assertEquals(1, summary.failedCount());
        verify(ledger).aggregateAdminByStatus(isNull(), isNull(), any(Instant.class), any(Instant.class), isNull());
    }
}
