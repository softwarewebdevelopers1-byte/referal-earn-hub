package com.crlzTech.referal.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * PayHero client.
 *
 * PRIMARY: v2 API (backend.payhero.co.ke/api/v2) using HTTP Basic Auth + JSON,
 * as shown in PayHero's 2026 tutorial and official PHP SDK.
 * Payload fields: phone_number, amount, channel_id, external_reference,
 * provider, callback_url.
 *
 * The published callback contract does not document a signed webhook or shared
 * secret. Callback verification is therefore performed against the stored
 * payment reference, amount, and provider identifiers in PaymentService.
 *
 * If app.payment.payhero.enabled=false, calls are skipped and a mock reference
 * is generated for local dev only. NEVER run with enabled=false in production.
 */
@Component
public class PayHeroClient {

    public record InitiationResult(String providerReference, String checkoutRequestId,
            String merchantRequestId) {
    }

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();
    private final boolean enabled;
    private final String apiBaseUrl;
    private final String stkPath;
    private final String username;
    private final String password;
    private final String channelId;
    private final String callbackUrl;
    private final String legacyApiKey;

    public PayHeroClient(RestTemplate restTemplate,
            @Value("${app.payment.payhero.enabled}") boolean enabled,
            @Value("${app.payment.payhero.api-base-url}") String apiBaseUrl,
            @Value("${app.payment.payhero.stk-push-path}") String stkPath,
            @Value("${app.payment.payhero.username:}") String username,
            @Value("${app.payment.payhero.password:}") String password,
            @Value("${app.payment.payhero.channel-id:}") String channelId,
            @Value("${app.payment.payhero.callback-url}") String callbackUrl,
            @Value("${app.payment.payhero.legacy-api-key:}") String legacyApiKey) {
        this.restTemplate = restTemplate;
        this.enabled = enabled;
        this.apiBaseUrl = apiBaseUrl;
        this.stkPath = stkPath;
        this.username = username;
        this.password = password;
        this.channelId = channelId;
        this.callbackUrl = callbackUrl;
        this.legacyApiKey = legacyApiKey;
    }

    /**
     * Returns an external reference returned by PayHero, or a mock ref if disabled.
     */
    public String initiateStkPush(String phone, BigDecimal amount, String externalReference) {
        return initiateStkPushDetails(phone, amount, externalReference).providerReference();
    }

    /**
     * Initiates the documented v2 request and retains the identifiers returned by
     * PayHero so a callback can be correlated to the exact STK request.
     */
    public InitiationResult initiateStkPushDetails(String phone, BigDecimal amount, String externalReference) {
        if (!enabled) {
            return new InitiationResult("MOCK-" + externalReference, null, null);
        }

        if (username == null || username.isBlank() || password == null || password.isBlank()
                || apiBaseUrl == null || !apiBaseUrl.contains("/v2")) {
            throw new PaymentProviderException("PayHero v2 credentials or API base URL are not configured");
        }
        return initiateV2(phone, amount, externalReference);
    }

    private InitiationResult initiateV2(String phone, BigDecimal amount, String externalReference) {
        try {
            String normalizedPhone = phone.replaceAll("[^0-9]", "");
            if (normalizedPhone.startsWith("0"))
                normalizedPhone = "254" + normalizedPhone.substring(1);

            int requestAmount;
            try {
                requestAmount = amount.intValueExact();
            } catch (ArithmeticException exception) {
                throw new PaymentProviderException("PayHero requires a whole-number KES amount", exception);
            }

            Map<String, Object> body = Map.of(
                    "phone_number", normalizedPhone,
                    "amount", requestAmount,
                    "channel_id", requiredChannelId(),
                    "external_reference", externalReference,
                    "provider", "m-pesa",
                    "callback_url", callbackUrl);

            String auth = Base64.getEncoder().encodeToString(
                    (username + ":" + password).getBytes(StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + auth);

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<String> res = restTemplate.exchange(
                    apiBaseUrl + effectiveStkPath(), HttpMethod.POST, req, String.class);

            JsonNode node = mapper.readTree(res.getBody());
            if (node != null && node.has("success") && !node.path("success").asBoolean()) {
                throw new PaymentProviderException("PayHero rejected the STK request");
            }
            // PayHero v2 typically returns { "success": true, "reference": "...", ... } or
            // similar
            JsonNode ref = node.get("reference");
            if (ref == null)
                ref = node.path("data").get("reference");
            if (ref == null)
                ref = node.get("external_reference");
            if (ref == null || ref.asText().isBlank()) {
                throw new PaymentProviderException("PayHero did not return a payment reference");
            }
            return new InitiationResult(
                    ref.asText(),
                    firstText(node, "CheckoutRequestID", "checkout_request_id"),
                    firstText(node, "MerchantRequestID", "merchant_request_id"));
        } catch (PaymentProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new PaymentProviderException("PayHero STK initiation failed", e);
        }
    }

    private int requiredChannelId() {
        try {
            return Integer.parseInt(channelId == null ? "" : channelId.trim());
        } catch (NumberFormatException exception) {
            throw new PaymentProviderException("PayHero channel ID is not configured correctly", exception);
        }
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node == null ? null : node.get(field);
            if (value != null && !value.isNull() && !value.asText().isBlank()) {
                return value.asText();
            }
        }
        return null;
    }

    private String effectiveStkPath() {
        // Older configuration used /payments/initiate-stk-push. PayHero's current
        // v2 endpoint is /payments; normalize the old default automatically.
        return stkPath == null || stkPath.isBlank() || "/payments/initiate-stk-push".equals(stkPath)
                ? "/payments"
                : stkPath;
    }

}
