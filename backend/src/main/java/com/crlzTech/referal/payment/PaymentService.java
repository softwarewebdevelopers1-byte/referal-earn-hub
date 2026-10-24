package com.crlzTech.referal.payment;

import com.crlzTech.referal.admin.AuditLog;
import com.crlzTech.referal.admin.AuditLogRepository;
import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.earnings.LedgerEntry;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.payment.dto.InitiatePaymentRequest;
import com.crlzTech.referal.payment.dto.PaymentResponse;
import com.crlzTech.referal.payment.dto.PaymentStatusResponse;
import com.crlzTech.referal.referral.ReferralEarning;
import com.crlzTech.referal.referral.ReferralEarningRepository;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ReferralEarningRepository referralEarningRepository;
    private final LedgerEntryRepository ledgerRepository;
    private final AuditLogRepository auditLogRepository;
    private final PayHeroClient payHeroClient;
    private final BigDecimal activationAmount;
    private final BigDecimal referralCommission;
    private final String currency;

    public PaymentService(PaymentRepository paymentRepository,
            UserRepository userRepository,
            ReferralEarningRepository referralEarningRepository,
            LedgerEntryRepository ledgerRepository,
            AuditLogRepository auditLogRepository,
            PayHeroClient payHeroClient,
            @Value("${app.payment.activation-amount}") BigDecimal activationAmount,
            @Value("${app.referral.commission-amount}") BigDecimal referralCommission,
            @Value("${app.payment.currency:KES}") String currency) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.referralEarningRepository = referralEarningRepository;
        this.ledgerRepository = ledgerRepository;
        this.auditLogRepository = auditLogRepository;
        this.payHeroClient = payHeroClient;
        this.activationAmount = activationAmount;
        this.referralCommission = referralCommission;
        this.currency = currency;
    }

    /**
     * Reserves the payment row before calling PayHero. The noRollbackFor rule is
     * deliberate: a provider outage must leave an observable FAILED attempt in
     * MySQL instead of rolling the pending row away with the exception.
     */
    @Transactional(noRollbackFor = PaymentProviderException.class)
    public PaymentResponse initiatePayment(InitiatePaymentRequest req) {
        User authenticated = CurrentUser.require();
        User user = authenticated;
        if (authenticated.getId() != null) {
            user = userRepository.findByIdForUpdate(authenticated.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found"));
        }

        if (user.getPaymentStatus() == PaymentStatus.SUCCESS
                || paymentRepository.existsByUserIdAndStatusIn(user.getId(), List.of(PaymentStatus.SUCCESS))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A successful payment already exists for this account");
        }

        User paymentUser = user;
        Payment payment = paymentRepository.findFirstByUserIdAndStatusInOrderByCreatedAtDesc(
                user.getId(), List.of(PaymentStatus.PENDING, PaymentStatus.PROCESSING))
                .orElseGet(() -> {
                    Payment newPayment = new Payment();
                    newPayment.setUser(paymentUser);
                    newPayment.setInternalReference("PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 18));
                    newPayment.setAmount(activationAmount);
                    newPayment.setCurrency(currency);
                    newPayment.setMethod("M_PESA");
                    return newPayment;
                });

        payment.setStatus(PaymentStatus.PENDING);
        payment.setInitiatedPhone(normalizePhone(req.phone()));
        payment.setRejectionReason(null);
        paymentRepository.saveAndFlush(payment);
        log.info("Payment initiation reserved paymentId={} reference={} userId={}",
                payment.getId(), payment.getInternalReference(), user.getId());

        try {
            PayHeroClient.InitiationResult result = payHeroClient.initiateStkPushDetails(
                    req.phone(), payment.getAmount(), payment.getInternalReference());
            payment.setProviderReference(result.providerReference());
            payment.setExternalReference(result.providerReference());
            payment.setCheckoutRequestId(result.checkoutRequestId());
            payment.setMerchantRequestId(result.merchantRequestId());
            payment.setStatus(PaymentStatus.PROCESSING);
            paymentRepository.save(payment);
            log.info("PayHero payment queued paymentId={} reference={} providerReference={}",
                    payment.getId(), payment.getInternalReference(), result.providerReference());
        } catch (PaymentProviderException exception) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setRejectionReason("Payment provider could not start the request");
            paymentRepository.save(payment);
            log.error("PayHero initiation failed paymentId={} reference={}",
                    payment.getId(), payment.getInternalReference(), exception);
            throw exception;
        }

        return PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> myPayments() {
        User user = CurrentUser.require();
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(PaymentResponse::from).toList();
    }

    @Transactional
    public PaymentStatusResponse status(String reference) {
        User user = CurrentUser.require();
        Payment payment = findByReference(reference)
                .filter(candidate -> Objects.equals(candidate.getUser().getId(), user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        // A prior process may have persisted SUCCESS before a crash in an older
        // deployment. Repair that state transactionally before reporting access;
        // the frontend never treats SUCCESS alone as sufficient.
        if (payment.getStatus() == PaymentStatus.SUCCESS && !payment.isActivationProcessed()) {
            log.warn("Reconciling verified payment without activation paymentId={}", payment.getId());
            activatePayment(payment, payment.getMpesaReference(), null);
        }

        User owner = payment.getUser();
        boolean accountActivated = payment.isActivationProcessed()
                && payment.getStatus() == PaymentStatus.SUCCESS;
        boolean canAccessDashboard = accountActivated
                && owner.getPaymentStatus() == PaymentStatus.SUCCESS
                && owner.getAccountStatus().name().equals("ACTIVE");
        String message = switch (payment.getStatus()) {
            case SUCCESS -> canAccessDashboard
                    ? "Payment verified successfully."
                    : "Payment verified; account activation is still being reconciled.";
            case FAILED, CANCELLED -> "Payment was not successful. Paid access remains locked.";
            case REVIEW_REQUIRED -> "Payment confirmation needs review. Paid access remains locked.";
            case PENDING, PROCESSING -> "Your payment is being processed. Please wait while we confirm your payment.";
        };
        return PaymentStatusResponse.from(payment, accountActivated, canAccessDashboard, message);
    }

    /**
     * Processes the documented callback shape. PayHero currently documents no
     * callback signature or shared-secret header, so reference/amount/result-code
     * correlation is the strongest verification available from the published
     * contract. This limitation is also documented in README.md.
     */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void handleCallback(String rawBody, String remoteIp) {
        JsonNode root = parseJson(rawBody);
        JsonNode response = root.get("response");
        if (!root.isObject() || response == null || !response.isObject()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid PayHero callback structure");
        }

        boolean outerStatus = booleanOrNull(root.get("status"));
        String reference = firstText(response, "ExternalReference", "external_reference", "User_Reference")
                .or(() -> firstText(root, "ExternalReference", "external_reference", "reference"))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Missing PayHero external reference"));
        BigDecimal amount = firstDecimal(response, "Amount", "amount")
                .or(() -> firstDecimal(root, "amount"))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Missing PayHero amount"));

        Payment payment = findLockedByReference(reference)
                .orElseThrow(() -> {
                    log.warn("PayHero callback referenced unknown payment reference={} remoteIp={}",
                            safeReference(reference), safeRemoteIp(remoteIp));
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown payment reference");
                });

        if (payment.isActivationProcessed() || payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("Duplicate PayHero callback ignored paymentId={} reference={}",
                    payment.getId(), payment.getInternalReference());
            return;
        }

        String callbackPhone = firstText(response, "Phone", "phone").orElse(null);
        String checkoutRequestId = firstText(response, "CheckoutRequestID", "checkout_request_id").orElse(null);
        String merchantRequestId = firstText(response, "MerchantRequestID", "merchant_request_id").orElse(null);
        String receipt = firstText(response, "MpesaReceiptNumber", "MPESA_Reference", "mpesa_reference").orElse(null);
        String providerStatus = firstText(response, "Status", "status").orElse("");
        Integer resultCode = firstInteger(response, "ResultCode", "result_code").orElse(null);
        String resultDescription = firstText(response, "ResultDesc", "result_desc").orElse(null);

        if (!outerStatus) {
            recordReview(payment, rawBody, callbackPhone, checkoutRequestId, merchantRequestId,
                    resultCode, resultDescription, "PayHero callback outer status was not successful");
            log.warn("PayHero callback rejected outer status paymentId={}", payment.getId());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Unconfirmed PayHero callback");
        }

        if (payment.getAmount().compareTo(amount) != 0) {
            recordReview(payment, rawBody, callbackPhone, checkoutRequestId, merchantRequestId,
                    resultCode, resultDescription, "Callback amount does not match the stored amount");
            log.warn("PayHero callback amount mismatch paymentId={} expected={} received={}",
                    payment.getId(), payment.getAmount(), amount);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Payment amount mismatch");
        }

        if (!matchesExpectedIdentifiers(payment, callbackPhone, checkoutRequestId)) {
            recordReview(payment, rawBody, callbackPhone, checkoutRequestId, merchantRequestId,
                    resultCode, resultDescription, "Callback identifiers do not match the initiated payment");
            log.warn("PayHero callback identifier mismatch paymentId={}", payment.getId());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Payment identifiers do not match");
        }

        recordCallback(payment, rawBody, callbackPhone, checkoutRequestId, merchantRequestId,
                resultCode, resultDescription);

        if (isFailure(providerStatus, resultCode)) {
            payment.setStatus("cancelled".equalsIgnoreCase(providerStatus)
                    || "canceled".equalsIgnoreCase(providerStatus) ? PaymentStatus.CANCELLED : PaymentStatus.FAILED);
            payment.getUser().setPaymentStatus(payment.getStatus());
            userRepository.save(payment.getUser());
            paymentRepository.save(payment);
            log.info("Payment status transitioned paymentId={} status={}", payment.getId(), payment.getStatus());
            return;
        }

        if (!isSuccess(providerStatus, resultCode)) {
            if (isPending(providerStatus)) {
                payment.setStatus(PaymentStatus.PROCESSING);
                paymentRepository.save(payment);
                log.info("PayHero callback remains pending paymentId={} providerStatus={}",
                        payment.getId(), providerStatus);
                return;
            }
            payment.setStatus(PaymentStatus.REVIEW_REQUIRED);
            paymentRepository.save(payment);
            log.warn("Ambiguous PayHero callback paymentId={} providerStatus={} resultCode={}",
                    payment.getId(), providerStatus, resultCode);
            return;
        }

        activatePayment(payment, receipt, rawBody);
        log.info("Payment verified and account activated paymentId={} userId={}",
                payment.getId(), payment.getUser().getId());
    }

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
        activatePayment(payment, null, null);
        auditLogRepository.save(AuditLog.of(admin.getId(), "PAYMENT_APPROVED", "PAYMENT", paymentId, reason));
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
        payment.getUser().setPaymentStatus(PaymentStatus.FAILED);
        userRepository.save(payment.getUser());
        auditLogRepository.save(AuditLog.of(admin.getId(), "PAYMENT_REJECTED", "PAYMENT", paymentId, reason));
    }

    private void activatePayment(Payment payment, String receipt, String rawCallback) {
        User user = payment.getUser();
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setActivationProcessed(true);
        payment.setPaymentCompletedAt(Instant.now());
        if (receipt != null) payment.setMpesaReference(receipt);
        if (rawCallback != null) payment.setRawCallback(redactCallback(rawCallback));
        paymentRepository.save(payment);

        user.setPaymentStatus(PaymentStatus.SUCCESS);
        userRepository.save(user);

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

        User referrer = user.getReferredBy();
        if (referrer != null && !referralEarningRepository.existsByRefereeId(user.getId())) {
            ReferralEarning earning = new ReferralEarning();
            earning.setReferrer(referrer);
            earning.setReferee(user);
            earning.setPayment(payment);
            earning.setAmount(referralCommission);
            earning.setCurrency(currency);
            referralEarningRepository.save(earning);

            LedgerEntry rewardEntry = new LedgerEntry();
            rewardEntry.setUser(referrer);
            rewardEntry.setType(LedgerType.REFERRAL_REWARD);
            rewardEntry.setStatus(LedgerStatus.COMPLETED);
            rewardEntry.setAmount(referralCommission);
            rewardEntry.setCurrency(currency);
            rewardEntry.setReference("REF-" + payment.getInternalReference());
            rewardEntry.setDescription("Referral reward for " + user.getFirstName() + " " + user.getLastName());
            rewardEntry.setSourceId(earning.getId());
            ledgerRepository.save(rewardEntry);
            log.info("Referral reward credited paymentId={} referrerId={} amount={}",
                    payment.getId(), referrer.getId(), referralCommission);
        }
    }

    private Optional<Payment> findByReference(String reference) {
        return paymentRepository.findByInternalReference(reference)
                .or(() -> paymentRepository.findByExternalReference(reference));
    }

    private Optional<Payment> findLockedByReference(String reference) {
        Optional<Payment> locked = paymentRepository.findByInternalReferenceForUpdate(reference);
        if (locked.isPresent()) return locked;
        locked = paymentRepository.findByExternalReferenceForUpdate(reference);
        if (locked.isPresent()) return locked;
        // Fallback keeps pure Mockito unit tests compatible; production always
        // resolves through the pessimistic-lock repository queries above.
        return findByReference(reference);
    }

    private void recordCallback(Payment payment, String rawBody, String phone, String checkout,
            String merchant, Integer resultCode, String resultDescription) {
        payment.setCallbackReceivedAt(Instant.now());
        payment.setProviderPhone(phone == null ? null : normalizePhone(phone));
        if (checkout != null) payment.setCheckoutRequestId(checkout);
        if (merchant != null) payment.setMerchantRequestId(merchant);
        payment.setProviderResultCode(resultCode);
        payment.setProviderResultDescription(resultDescription);
        payment.setRawCallback(redactCallback(rawBody));
    }

    private void recordReview(Payment payment, String rawBody, String phone, String checkout,
            String merchant, Integer resultCode, String resultDescription, String reason) {
        recordCallback(payment, rawBody, phone, checkout, merchant, resultCode, resultDescription);
        payment.setStatus(PaymentStatus.REVIEW_REQUIRED);
        payment.setRejectionReason(reason);
        paymentRepository.save(payment);
    }

    private boolean matchesExpectedIdentifiers(Payment payment, String callbackPhone, String checkoutRequestId) {
        if (payment.getInitiatedPhone() != null && callbackPhone != null
                && !normalizePhone(payment.getInitiatedPhone()).equals(normalizePhone(callbackPhone))) {
            return false;
        }
        return payment.getCheckoutRequestId() == null || checkoutRequestId == null
                || payment.getCheckoutRequestId().equals(checkoutRequestId);
    }

    private static JsonNode parseJson(String body) {
        try {
            JsonNode root = JSON.readTree(body);
            if (root == null || !root.isObject()) throw new IllegalArgumentException();
            return root;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON callback");
        }
    }

    private static Optional<String> firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value != null && !value.isNull() && !value.asText().isBlank()) return Optional.of(value.asText());
        }
        return Optional.empty();
    }

    private static Optional<BigDecimal> firstDecimal(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value != null && value.isNumber()) return Optional.of(value.decimalValue());
            if (value != null && value.isTextual()) {
                try { return Optional.of(new BigDecimal(value.asText())); } catch (NumberFormatException ignored) { }
            }
        }
        return Optional.empty();
    }

    private static Optional<Integer> firstInteger(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value != null && value.canConvertToInt()) return Optional.of(value.asInt());
            if (value != null && value.isTextual()) {
                try { return Optional.of(Integer.valueOf(value.asText())); } catch (NumberFormatException ignored) { }
            }
        }
        return Optional.empty();
    }

    private static boolean booleanOrNull(JsonNode value) {
        return value != null && value.isBoolean() && value.asBoolean();
    }

    private static boolean isSuccess(String status, Integer resultCode) {
        return resultCode != null && resultCode == 0
                && ("success".equalsIgnoreCase(status) || "completed".equalsIgnoreCase(status)
                        || "paid".equalsIgnoreCase(status));
    }

    private static boolean isFailure(String status, Integer resultCode) {
        return (!isPending(status) && resultCode != null && resultCode != 0)
                || "failed".equalsIgnoreCase(status) || "cancelled".equalsIgnoreCase(status)
                || "canceled".equalsIgnoreCase(status) || "rejected".equalsIgnoreCase(status)
                || "failure".equalsIgnoreCase(status) || "error".equalsIgnoreCase(status);
    }

    private static boolean isPending(String status) {
        return "pending".equalsIgnoreCase(status) || "processing".equalsIgnoreCase(status)
                || "queued".equalsIgnoreCase(status) || "initiated".equalsIgnoreCase(status);
    }

    private static String normalizePhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        return digits.startsWith("0") ? "254" + digits.substring(1) : digits;
    }

    private static String redactCallback(String rawBody) {
        try {
            JsonNode root = JSON.readTree(rawBody);
            if (root != null && root.isObject() && root.get("response") instanceof com.fasterxml.jackson.databind.node.ObjectNode response) {
                response.remove("Phone");
                response.remove("phone");
            }
            return JSON.writeValueAsString(root);
        } catch (Exception ignored) {
            return "[callback-redaction-failed]";
        }
    }

    private static String safeReference(String reference) {
        return reference == null ? "" : reference.replaceAll("[^A-Za-z0-9_-]", "");
    }

    private static String safeRemoteIp(String remoteIp) {
        return remoteIp == null ? "unknown" : remoteIp.replaceAll("[^0-9a-fA-F:., ]", "");
    }
}
