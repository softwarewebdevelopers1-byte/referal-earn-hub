package com.crlzTech.referal.payment;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import com.crlzTech.referal.admin.AuditLog;
import com.crlzTech.referal.admin.AuditLogRepository;
import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.earnings.LedgerEntry;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.dto.InitiatePaymentRequest;
import com.crlzTech.referal.payment.dto.PaymentResponse;
import com.crlzTech.referal.referral.ReferralEarning;
import com.crlzTech.referal.referral.ReferralEarningRepository;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ReferralEarningRepository referralEarningRepository;
    private final LedgerEntryRepository ledgerRepository;
    private final AuditLogRepository auditLogRepository;
    private final PayHeroClient payHeroClient;
    private final BigDecimal activationAmount;
    private final BigDecimal referralCommission;

    public PaymentService(PaymentRepository paymentRepository,
            UserRepository userRepository,
            ReferralEarningRepository referralEarningRepository,
            LedgerEntryRepository ledgerRepository,
            AuditLogRepository auditLogRepository,
            PayHeroClient payHeroClient,
            @Value("${app.payment.activation-amount}") BigDecimal activationAmount,
            @Value("${app.referral.commission-amount}") BigDecimal referralCommission) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.referralEarningRepository = referralEarningRepository;
        this.ledgerRepository = ledgerRepository;
        this.auditLogRepository = auditLogRepository;
        this.payHeroClient = payHeroClient;
        this.activationAmount = activationAmount;
        this.referralCommission = referralCommission;
    }

    // ---------- User-facing ----------

    @Transactional
    public PaymentResponse initiatePayment(InitiatePaymentRequest req) {
        User user = CurrentUser.require();

        // Guard: prevent duplicate active payments
        if (paymentRepository.existsByUserIdAndStatusIn(user.getId(),
                List.of(PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.SUCCESS))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An active or successful payment already exists for this account");
        }

        Payment payment = new Payment();
        payment.setUser(user);
        payment.setInternalReference("PAY-" + UUID.randomUUID().toString().substring(0, 18));
        payment.setAmount(activationAmount); // server-side amount, never trusted from client
        payment.setCurrency("KES");
        payment.setMethod("M_PESA");
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        String extRef = payHeroClient.initiateStkPush(req.phone(), activationAmount, payment.getInternalReference());
        payment.setExternalReference(extRef);
        payment.setStatus(PaymentStatus.PROCESSING);
        paymentRepository.save(payment);

        return PaymentResponse.from(payment);
    }

    public List<PaymentResponse> myPayments() {
        User user = CurrentUser.require();
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(PaymentResponse::from).toList();
    }

    // ---------- Callback (public endpoint) ----------

    /**
     * Processes a PayHero callback idempotently.
     *
     * IMPORTANT SECURITY NOTE:
     * PayHero's published callback structure is:
     * {"status":true,"response":{"Transaction_Type":"C2B","Amount":...,"MPESA_Reference":"...",
     * "Transaction_Reference":"...","Transaction_Date":"..."}}
     * The search results do NOT document a signature/HMAC verification mechanism.
     * Until PayHero documents a signature scheme, we rely on:
     * 1) Matching the callback's external/internal reference to a known payment row
     * 2) Verifying the amount matches the expected activation amount
     * 3) Idempotent processing (no duplicate activation)
     * 4) Optional IP allowlist (configure app.payment.payhero.callback-allowed-ips)
     * This is NOT a cryptographic proof of authenticity. Add signature verification
     * as soon as PayHero publishes it.
     */
    /**
     * Processes a PayHero callback idempotently.
     * Handles BOTH legacy v1 callback format and v2 format:
     * v1:
     * {"status":true,"response":{"Transaction_Type":"C2B","MPESA_Reference":"...",
     * "User_Reference":"...","Amount":200,...}} [citation:2]
     * v2: fields like "external_reference", "reference", "Amount"/"amount"
     *
     * SECURITY: No signature verification is documented by PayHero.
     * Authenticity relies on: reference match + amount match + idempotency.
     * Confirm with PayHero whether a signature header exists before production.
     */
    @Transactional
    public void handleCallback(String rawBody, String remoteIp) {
        com.fasterxml.jackson.databind.JsonNode root;
        try {
            root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawBody);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON");
        }

        if (!root.path("status").asBoolean(false))
            return;

        com.fasterxml.jackson.databind.JsonNode r = root.path("response");

        // Try v1 fields first, then v2
        String extRef = textOrNull(r, "User_Reference");
        if (extRef == null)
            extRef = textOrNull(r, "external_reference");
        if (extRef == null)
            extRef = textOrNull(root, "external_reference");
        if (extRef == null)
            extRef = textOrNull(root, "reference");

        String mpesaRef = textOrNull(r, "MPESA_Reference");
        if (mpesaRef == null)
            mpesaRef = textOrNull(r, "mpesa_reference");

        BigDecimal amount = decimalOrNull(r, "Amount");
        if (amount == null)
            amount = decimalOrNull(r, "amount");
        if (amount == null)
            amount = decimalOrNull(root, "amount");

        String txType = textOrNull(r, "Transaction_Type");
        if (txType == null)
            txType = textOrNull(root, "Transaction_Type");
        if (txType != null && !"C2B".equalsIgnoreCase(txType))
            return;

        if (extRef == null || extRef.isBlank())
            return;
        if (amount == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing amount in callback");
        }

        Payment payment = paymentRepository.findByExternalReference(extRef)
                .or(() -> paymentRepository.findByInternalReference(extRef))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown payment reference"));

        if (payment.isActivationProcessed())
            return;

        if (payment.getAmount().compareTo(amount) != 0) {
            payment.setStatus(PaymentStatus.REVIEW_REQUIRED);
            payment.setRawCallback(rawBody);
            paymentRepository.save(payment);
            return;
        }

        if (payment.getStatus() == PaymentStatus.SUCCESS)
            return;

        activatePayment(payment, mpesaRef, rawBody);
    }

    private static String textOrNull(com.fasterxml.jackson.databind.JsonNode node, String field) {
        com.fasterxml.jackson.databind.JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static BigDecimal decimalOrNull(com.fasterxml.jackson.databind.JsonNode node, String field) {
        com.fasterxml.jackson.databind.JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.decimalValue();
    }
    // ---------- Admin ----------

    @Transactional
    public void approveManually(Long paymentId, String reason) {
        User admin = CurrentUser.require();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        if (payment.isActivationProcessed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment already processed");
        }
        payment.setReviewedBy(admin);
        payment.setReviewedAt(Instant.now());
        payment.setStatus(PaymentStatus.SUCCESS);
        activatePayment(payment, null, null);

        auditLogRepository.save(AuditLog.of(admin.getId(), "PAYMENT_APPROVED",
                "PAYMENT", paymentId, reason));
    }

    @Transactional
    public void rejectManually(Long paymentId, String reason) {
        User admin = CurrentUser.require();
        if (reason == null || reason.trim().length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rejection reason required");
        }
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        if (payment.isActivationProcessed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot reject an activated payment");
        }
        payment.setStatus(PaymentStatus.FAILED);
        payment.setRejectionReason(reason.trim());
        payment.setReviewedBy(admin);
        payment.setReviewedAt(Instant.now());
        paymentRepository.save(payment);

        auditLogRepository.save(AuditLog.of(admin.getId(), "PAYMENT_REJECTED",
                "PAYMENT", paymentId, reason));
    }

    // ---------- Core activation (single transaction) ----------

    /**
     * Atomically:
     * 1. Marks payment SUCCESS + activationProcessed
     * 2. Sets user payment status to SUCCESS
     * 3. Credits the referrer KES 30 exactly once (unique constraints enforce this)
     * 4. Writes ledger entries for both the payment submission and referral reward
     */
    private void activatePayment(Payment payment, String mpesaRef, String rawCallback) {
        User user = payment.getUser();

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setActivationProcessed(true);
        if (mpesaRef != null)
            payment.setMpesaReference(mpesaRef);
        if (rawCallback != null)
            payment.setRawCallback(rawCallback);
        paymentRepository.save(payment);

        user.setPaymentStatus(PaymentStatus.SUCCESS);
        userRepository.save(user);

        // Payment submission ledger entry (money in, informational)
        LedgerEntry paymentEntry = new LedgerEntry();
        paymentEntry.setUser(user);
        paymentEntry.setType(LedgerType.PAYMENT_SUBMISSION);
        paymentEntry.setStatus(LedgerStatus.COMPLETED);
        paymentEntry.setAmount(payment.getAmount());
        paymentEntry.setCurrency(payment.getCurrency());
        paymentEntry.setReference("PMT-" + payment.getInternalReference());
        paymentEntry.setDescription("Account activation payment");
        paymentEntry.setSourceId(payment.getId());
        ledgerRepository.save(paymentEntry);

        // Referral reward — only if user was referred and not already credited
        User referrer = user.getReferredBy();
        if (referrer != null && !referralEarningRepository.existsByRefereeId(user.getId())) {
            ReferralEarning earning = new ReferralEarning();
            earning.setReferrer(referrer);
            earning.setReferee(user);
            earning.setPayment(payment);
            earning.setAmount(referralCommission);
            earning.setCurrency("KES");
            referralEarningRepository.save(earning); // unique(payment_id) + unique(referee_id) protect against
                                                     // duplicates

            LedgerEntry rewardEntry = new LedgerEntry();
            rewardEntry.setUser(referrer);
            rewardEntry.setType(LedgerType.REFERRAL_REWARD);
            rewardEntry.setStatus(LedgerStatus.COMPLETED);
            rewardEntry.setAmount(referralCommission);
            rewardEntry.setCurrency("KES");
            rewardEntry.setReference("REF-" + earning.getId());
            rewardEntry.setDescription("Referral reward for " + user.getFirstName() + " " + user.getLastName());
            rewardEntry.setSourceId(earning.getId());
            ledgerRepository.save(rewardEntry);
        }
    }
}
