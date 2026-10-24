package com.crlzTech.referal.withdrawal;

import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.referral.ReferralEarningRepository;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.user.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WithdrawalServiceTest {

    private final ReferralEarningRepository referrals = mock(ReferralEarningRepository.class);
    private final WithdrawalRequestRepository requests = mock(WithdrawalRequestRepository.class);
    private final LedgerEntryRepository ledger = mock(LedgerEntryRepository.class);
    private final User user = new User();
    private WithdrawalService service;

    @BeforeEach
    void setUp() {
        service = new WithdrawalService(referrals, requests, ledger, 2, false);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, java.util.List.of()));
        when(referrals.countByReferrerId(any())).thenReturn(2L);
        when(ledger.sumByUserAndStatusAndType(any(), any(), eq(LedgerType.REFERRAL_REWARD)))
                .thenReturn(new BigDecimal("1000.00"));
        when(ledger.sumByUserAndStatusAndType(any(), any(), eq(LedgerType.VIDEO_REWARD)))
                .thenReturn(new BigDecimal("200.00"));
        when(ledger.sumByUserAndStatusAndType(any(), any(), eq(LedgerType.WITHDRAWAL)))
                .thenReturn(BigDecimal.ZERO);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void persistsTheRequestedAmountForEligibleSupportRequest() {
        service.requestWithdrawal(new BigDecimal("250.50"));

        ArgumentCaptor<WithdrawalRequest> captor = ArgumentCaptor.forClass(WithdrawalRequest.class);
        verify(requests).save(captor.capture());
        assertEquals(new BigDecimal("250.50"), captor.getValue().getAmount());
    }

    @Test
    void rejectsAnAmountAboveTheServerCalculatedBalance() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.requestWithdrawal(new BigDecimal("1200.01")));
        verify(requests, never()).save(any());
    }
}
