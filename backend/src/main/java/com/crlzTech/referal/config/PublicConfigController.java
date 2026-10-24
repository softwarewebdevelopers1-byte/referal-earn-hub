package com.crlzTech.referal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class PublicConfigController {

    private final BigDecimal activationAmount;
    private final BigDecimal referralCommission;
    private final String currency;

    public PublicConfigController(
            @Value("${app.payment.activation-amount}") BigDecimal activationAmount,
            @Value("${app.referral.commission-amount}") BigDecimal referralCommission,
            @Value("${app.payment.currency:KES}") String currency) {
        this.activationAmount = activationAmount;
        this.referralCommission = referralCommission;
        this.currency = currency;
    }

    @GetMapping
    public Map<String, Object> get() {
        return Map.of(
                "activationAmount", activationAmount,
                "referralCommission", referralCommission,
                "currency", currency);
    }
}
