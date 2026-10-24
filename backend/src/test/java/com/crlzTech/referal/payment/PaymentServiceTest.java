package com.crlzTech.referal.payment;

import com.crlzTech.referal.admin.AuditLogRepository;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.dto.InitiatePaymentRequest;
import com.crlzTech.referal.payment.dto.PaymentResponse;
import com.crlzTech.referal.referral.ReferralEarning;
import com.crlzTech.referal.referral.ReferralEarningRepository;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

class PaymentServiceTest {

    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ReferralEarningRepository referrals = mock(ReferralEarningRepository.class);
    private final LedgerEntryRepository ledger = mock(LedgerEntryRepository.class);
    private final AuditLogRepository audit = mock(AuditLogRepository.class);
    private final PayHeroClient payHero = mock(PayHeroClient.class);
    private PaymentService service;

    @BeforeEach
    void setUp() {
        service = new PaymentService(
                payments, users, referrals, ledger, audit, payHero,
                new BigDecimal("500.00"), new BigDecimal("30.00"), "KES");
        User user = new User();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reusesAnUnsuccessfulPaymentAndSendsAnotherPrompt() {
        Payment existing = new Payment();
        existing.setInternalReference("PAY-existing");
        existing.setAmount(new BigDecimal("500.00"));
        existing.setStatus(PaymentStatus.PROCESSING);

        when(payments.existsByUserIdAndStatusIn(any(), eq(List.of(PaymentStatus.SUCCESS))))
                .thenReturn(false);
        when(payments.findFirstByUserIdAndStatusInOrderByCreatedAtDesc(any(), anyList()))
                .thenReturn(Optional.of(existing));
        when(payHero.initiateStkPushDetails("254700000001", new BigDecimal("500.00"), "PAY-existing"))
                .thenReturn(new PayHeroClient.InitiationResult("PAYHERO-retry", "CO-retry", "MR-retry"));

        PaymentResponse response = service.initiatePayment(
                new InitiatePaymentRequest("254700000001"));

        assertEquals("PAYHERO-retry", response.externalReference());
        assertEquals(PaymentStatus.PROCESSING, response.status());
        verify(payments, atLeastOnce()).save(existing);
    }

    @Test
    void usesTheConfiguredActivationAmountForANewPayment() {
        PaymentService configuredService = new PaymentService(
                payments, users, referrals, ledger, audit, payHero,
                new BigDecimal("725.00"), new BigDecimal("42.00"), "KES");
        when(payments.existsByUserIdAndStatusIn(any(), eq(List.of(PaymentStatus.SUCCESS))))
                .thenReturn(false);
        when(payments.findFirstByUserIdAndStatusInOrderByCreatedAtDesc(any(), anyList()))
                .thenReturn(Optional.empty());
        when(payHero.initiateStkPushDetails(eq("254700000001"), eq(new BigDecimal("725.00")), anyString()))
                .thenReturn(new PayHeroClient.InitiationResult("PAYHERO-configured", null, null));

        PaymentResponse response = configuredService.initiatePayment(
                new InitiatePaymentRequest("254700000001"));

        assertEquals(new BigDecimal("725.00"), response.amount());
        verify(payHero).initiateStkPushDetails(eq("254700000001"), eq(new BigDecimal("725.00")), anyString());
    }

    @Test
    void doesNotSendAnotherPromptAfterSuccessfulPayment() {
        when(payments.existsByUserIdAndStatusIn(any(), eq(List.of(PaymentStatus.SUCCESS))))
                .thenReturn(true);

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.initiatePayment(new InitiatePaymentRequest("254700000001")));
        verifyNoInteractions(payHero);
    }

    @Test
    void processesTheCurrentPayHeroCallbackFieldNames() {
        Payment payment = new Payment();
        payment.setAmount(new BigDecimal("500.00"));
        payment.setStatus(PaymentStatus.PROCESSING);
        payment.setUser((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        when(payments.findByExternalReference("PAY-existing")).thenReturn(Optional.of(payment));

        service.handleCallback("""
                {
                  "status": true,
                  "response": {
                    "Amount": 500,
                    "ExternalReference": "PAY-existing",
                    "MpesaReceiptNumber": "QWE123456",
                    "ResultCode": 0,
                    "Status": "Success"
                  }
                }
                """, null);

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals("QWE123456", payment.getMpesaReference());
        verify(payments, atLeastOnce()).save(payment);
    }

    @Test
    void creditsTheConfiguredReferralCommission() {
        PaymentService configuredService = new PaymentService(
                payments, users, referrals, ledger, audit, payHero,
                new BigDecimal("725.00"), new BigDecimal("42.00"), "KES");
        User referee = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        referee.setReferredBy(new User());

        Payment payment = new Payment();
        payment.setInternalReference("PAY-configured");
        payment.setAmount(new BigDecimal("725.00"));
        payment.setCurrency("KES");
        payment.setStatus(PaymentStatus.PROCESSING);
        payment.setUser(referee);
        when(payments.findByExternalReference("PAY-configured")).thenReturn(Optional.of(payment));
        when(referrals.existsByRefereeId(any())).thenReturn(false);

        configuredService.handleCallback("""
                {
                  "status": true,
                  "response": {
                    "Amount": 725,
                    "ExternalReference": "PAY-configured",
                    "MpesaReceiptNumber": "QWE725",
                    "ResultCode": 0,
                    "Status": "Success"
                  }
                }
                """, null);

        ArgumentCaptor<ReferralEarning> earning = ArgumentCaptor.forClass(ReferralEarning.class);
        verify(referrals).save(earning.capture());
        assertEquals(new BigDecimal("42.00"), earning.getValue().getAmount());
        assertEquals("KES", earning.getValue().getCurrency());
    }

    @Test
    void failedCallbackNeverActivatesTheAccount() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        user.setPaymentStatus(PaymentStatus.PENDING);
        Payment payment = payment("PAY-failed", user, PaymentStatus.PROCESSING);
        when(payments.findByExternalReference("PAY-failed")).thenReturn(Optional.of(payment));

        service.handleCallback("""
                {"status":true,"response":{"Amount":500,"ExternalReference":"PAY-failed",
                "ResultCode":1032,"Status":"Cancelled","ResultDesc":"Request cancelled"}}
                """, null);

        assertEquals(PaymentStatus.CANCELLED, payment.getStatus());
        assertEquals(PaymentStatus.CANCELLED, user.getPaymentStatus());
        assertFalse(payment.isActivationProcessed());
        verify(ledger, never()).save(any());
    }

    @Test
    void pendingCallbackDoesNotActivateTheAccount() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Payment payment = payment("PAY-pending", user, PaymentStatus.PROCESSING);
        when(payments.findByExternalReference("PAY-pending")).thenReturn(Optional.of(payment));

        service.handleCallback("""
                {"status":true,"response":{"Amount":500,"ExternalReference":"PAY-pending",
                "ResultCode":0,"Status":"Pending","ResultDesc":"Still processing"}}
                """, null);

        assertEquals(PaymentStatus.PROCESSING, payment.getStatus());
        assertFalse(payment.isActivationProcessed());
    }

    @Test
    void amountMismatchIsRejectedWithoutActivation() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Payment payment = payment("PAY-mismatch", user, PaymentStatus.PROCESSING);
        when(payments.findByExternalReference("PAY-mismatch")).thenReturn(Optional.of(payment));

        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.handleCallback("""
                {"status":true,"response":{"Amount":499,"ExternalReference":"PAY-mismatch",
                "ResultCode":0,"Status":"Success"}}
                """, null));

        assertEquals(PaymentStatus.REVIEW_REQUIRED, payment.getStatus());
        assertFalse(payment.isActivationProcessed());
    }

    @Test
    void duplicateSuccessfulCallbackCreatesOnlyOneLedgerEntry() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Payment payment = payment("PAY-duplicate", user, PaymentStatus.PROCESSING);
        when(payments.findByExternalReference("PAY-duplicate")).thenReturn(Optional.of(payment));
        String callback = """
                {"status":true,"response":{"Amount":500,"ExternalReference":"PAY-duplicate",
                "MpesaReceiptNumber":"RECEIPT1","ResultCode":0,"Status":"Success"}}
                """;

        service.handleCallback(callback, null);
        service.handleCallback(callback, null);

        assertTrue(payment.isActivationProcessed());
        verify(ledger, times(1)).save(any());
    }

    @Test
    void unknownReferenceCannotActivateAnyAccount() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.handleCallback("""
                {"status":true,"response":{"Amount":500,"ExternalReference":"PAY-unknown",
                "ResultCode":0,"Status":"Success"}}
                """, null));

        verifyNoInteractions(users, ledger, referrals);
    }

    @Test
    void missingProviderResultIsNotAcceptedAsSuccess() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Payment payment = payment("PAY-ambiguous", user, PaymentStatus.PROCESSING);
        when(payments.findByExternalReference("PAY-ambiguous")).thenReturn(Optional.of(payment));

        service.handleCallback("""
                {"status":true,"response":{"Amount":500,"ExternalReference":"PAY-ambiguous"}}
                """, null);

        assertEquals(PaymentStatus.REVIEW_REQUIRED, payment.getStatus());
        assertFalse(payment.isActivationProcessed());
        verify(ledger, never()).save(any());
    }

    private static Payment payment(String reference, User user, PaymentStatus status) {
        Payment payment = new Payment();
        payment.setInternalReference(reference);
        payment.setAmount(new BigDecimal("500.00"));
        payment.setCurrency("KES");
        payment.setStatus(status);
        payment.setUser(user);
        return payment;
    }
}
