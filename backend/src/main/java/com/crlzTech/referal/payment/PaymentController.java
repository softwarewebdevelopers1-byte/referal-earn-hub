package com.crlzTech.referal.payment;

import com.crlzTech.referal.payment.dto.InitiatePaymentRequest;
import com.crlzTech.referal.payment.dto.PaymentResponse;
import com.crlzTech.referal.payment.dto.PaymentStatusResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponse> initiate(@Valid @RequestBody InitiatePaymentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.initiatePayment(req));
    }

    @GetMapping("/mine")
    public List<PaymentResponse> mine() {
        return paymentService.myPayments();
    }

    @GetMapping("/{paymentReference}/status")
    public PaymentStatusResponse status(@PathVariable String paymentReference) {
        return paymentService.status(paymentReference);
    }

    @PostMapping({"/payhero/callback", "/callback"})
    public Map<String, Object> callback(@RequestBody String rawBody,
            @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor) {
        paymentService.handleCallback(rawBody, forwardedFor);
        return Map.of("status", true, "acknowledged", true);
    }
}
