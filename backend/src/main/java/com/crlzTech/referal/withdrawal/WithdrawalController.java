package com.crlzTech.referal.withdrawal;

import com.crlzTech.referal.withdrawal.dto.WithdrawalResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/withdrawals")
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
    public WithdrawalResponse request() {
        return withdrawalService.requestWithdrawal();
    }
}
