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
 * FALLBACK: Legacy STK endpoint (payherokenya.com/sps/portal/app/stk.php)
 * using api_key + username form fields (official GitBook docs).
 *
 * Configure which endpoint to use via app.payment.payhero.api-base-url.
 * If app.payment.payhero.enabled=false, calls are skipped and a mock reference
 * is generated for local dev only. NEVER run with enabled=false in production.
 */
@Component
public class PayHeroClient {

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
        if (!enabled) {
            return "MOCK-" + externalReference;
        }

        if (username != null && !username.isBlank() && apiBaseUrl != null && apiBaseUrl.contains("/v2")) {
            return initiateV2(phone, amount, externalReference);
        }
        return initiateLegacy(phone, amount, externalReference);
    }

    private String initiateV2(String phone, BigDecimal amount, String externalReference) {
        try {
            String normalizedPhone = phone.replaceAll("[^0-9]", "");
            if (normalizedPhone.startsWith("0"))
                normalizedPhone = "254" + normalizedPhone.substring(1);

            Map<String, Object> body = Map.of(
                    "phone_number", normalizedPhone,
                    "amount", amount,
                    "channel_id", channelId,
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
                    apiBaseUrl + stkPath, HttpMethod.POST, req, String.class);

            JsonNode node = mapper.readTree(res.getBody());
            // PayHero v2 typically returns { "success": true, "reference": "...", ... } or
            // similar
            JsonNode ref = node.get("reference");
            if (ref == null)
                ref = node.path("data").get("reference");
            if (ref == null)
                ref = node.get("external_reference");
            return ref != null ? ref.asText() : externalReference;
        } catch (Exception e) {
            throw new RuntimeException("PayHero STK initiation failed: " + e.getMessage(), e);
        }
    }

    private String initiateLegacy(String phone, BigDecimal amount, String externalReference) {
        try {
            String url = "https://payherokenya.com/sps/portal/app/stk.php";
            String form = "api_key=" + enc(legacyApiKey)
                    + "&username=" + enc(username)
                    + "&amount=" + amount
                    + "&phone=" + enc(phone)
                    + "&user_reference=" + enc(externalReference);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<String> req = new HttpEntity<>(form, headers);

            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, req, String.class);
            // Legacy returns
            // {"status":true,"response":{"Status":"Success","Message":"..."}}
            // No transaction reference is returned by this endpoint in the documented
            // response,
            // so we return the internal reference. Match callbacks by user_reference.
            return externalReference;
        } catch (Exception e) {
            throw new RuntimeException("PayHero legacy STK initiation failed: " + e.getMessage(), e);
        }
    }

    private static String enc(String v) {
        return java.net.URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8);
    }

    public String checkStatus(String externalReference) {
        if (!enabled)
            return "MOCK";
        try {
            String auth = Base64.getEncoder().encodeToString(
                    (username + ":" + password).getBytes(StandardCharsets.UTF_8));
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Basic " + auth);
            HttpEntity<Void> req = new HttpEntity<>(headers);
            ResponseEntity<String> res = restTemplate.exchange(
                    apiBaseUrl + "/payments/status?external_reference=" + externalReference,
                    HttpMethod.GET, req, String.class);
            return res.getBody();
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }
}
