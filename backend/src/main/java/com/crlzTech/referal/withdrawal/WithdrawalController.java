package com.crlzTech.referal.withdrawal;

import com.crlzTech.referal.withdrawal.dto.WithdrawalResponse;
import com.crlzTech.referal.withdrawal.dto.WithdrawalRequestPayload;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/withdrawals")
@PreAuthorize("@paidAccessGuard.check(authentication)")
public class WithdrawalController {

    private final WithdrawalService withdrawalService;

    public WithdrawalController(WithdrawalService withdrawalService) {
        this.withdrawalService = withdrawalService;
    }

    @GetMapping("/eligibility")
    public WithdrawalResponse eligibility() {
        return withdrawalService.checkEligibility();
    }

    @PostMapping("/request")
    public WithdrawalResponse request(@Valid @RequestBody WithdrawalRequestPayload request) {
        return withdrawalService.requestWithdrawal(request.amount());
    }
}
