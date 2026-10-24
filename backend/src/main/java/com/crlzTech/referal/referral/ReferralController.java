package com.crlzTech.referal.referral;

import com.crlzTech.referal.referral.dto.ReferralStatsResponse;
import com.crlzTech.referal.referral.dto.SuccessfulReferralDto;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/referrals")
@PreAuthorize("@paidAccessGuard.check(authentication)")
public class ReferralController {

    private final ReferralService referralService;

    public ReferralController(ReferralService referralService) {
        this.referralService = referralService;
    }

    @GetMapping("/stats")
    public ReferralStatsResponse stats() {
        return referralService.myStats();
    }

    @GetMapping("/successful")
    public Page<SuccessfulReferralDto> successful(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return referralService.mySuccessfulReferrals(page, Math.min(size, 100));
    }
}
