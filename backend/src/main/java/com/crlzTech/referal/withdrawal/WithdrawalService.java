package com.crlzTech.referal.withdrawal;

import com.crlzTech.referal.common.enums.WithdrawalStatus;
import com.crlzTech.referal.referral.ReferralEarningRepository;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.withdrawal.dto.WithdrawalResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WithdrawalService {

    private final ReferralEarningRepository referralEarningRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final int threshold;
    private final boolean b2cEnabled;

    public WithdrawalService(ReferralEarningRepository referralEarningRepository,
            WithdrawalRequestRepository withdrawalRequestRepository,
            @Value("${app.referral.first-withdrawal-threshold}") int threshold,
            @Value("${app.payment.payhero.b2c-enabled:false}") boolean b2cEnabled) {
        this.referralEarningRepository = referralEarningRepository;
        this.withdrawalRequestRepository = withdrawalRequestRepository;
        this.threshold = threshold;
        this.b2cEnabled = b2cEnabled;
    }

    public WithdrawalResponse checkEligibility() {
        User user = CurrentUser.require();
        long successful = referralEarningRepository.countByReferrerId(user.getId());
        long remaining = Math.max(0, threshold - successful);

        if (successful < threshold) {
            return new WithdrawalResponse(
                    "MINIMUM_REFERRALS_NOT_MET",
                    "You need " + threshold + " successful referrals to make your first withdrawal. "
                            + "You currently have " + successful + " successful referrals, so you need "
                            + remaining + " more.",
                    successful, threshold, remaining, false, false, false);
        }
        return new WithdrawalResponse(
                "WITHDRAWAL_TEMPORARILY_UNAVAILABLE",
                "You have met the " + threshold + "-successful-referral requirement. "
                        + "Withdrawals are temporarily unavailable due to a technical issue. "
                        + "Please contact the administrator for assistance.",
                successful, threshold, 0, false, false, true);
    }

    @Transactional
    public WithdrawalResponse requestWithdrawal() {
        User user = CurrentUser.require();
        long successful = referralEarningRepository.countByReferrerId(user.getId());
        long remaining = Math.max(0, threshold - successful);

        if (successful < threshold) {
            return new WithdrawalResponse(
                    "MINIMUM_REFERRALS_NOT_MET",
                    "You need " + threshold + " successful referrals to make your first withdrawal. "
                            + "You currently have " + successful + " successful referrals, so you need "
                            + remaining + " more.",
                    successful, threshold, remaining, false, false, false);
        }

        // Persist an administrative support request (NOT a paid withdrawal, NOT a
        // financial transaction)
        WithdrawalRequest request = new WithdrawalRequest();
        request.setUser(user);
        request.setAmount(java.math.BigDecimal.ZERO); // no payable amount is created
        request.setCurrency("KES");
        request.setStatus(WithdrawalStatus.ADMIN_CONTACT_REQUIRED);
        request.setSuccessfulReferralsAtRequest((int) successful);
        request.setNote("B2C disabled; user requested withdrawal assistance.");
        withdrawalRequestRepository.save(request);

        return new WithdrawalResponse(
                "WITHDRAWAL_TEMPORARILY_UNAVAILABLE",
                "You have met the " + threshold + "-successful-referral requirement. "
                        + "Withdrawals are temporarily unavailable due to a technical issue. "
                        + "Please contact the administrator for assistance.",
                successful, threshold, 0, false, false, true);
    }

    public boolean isB2cEnabled() {
        return b2cEnabled;
    }
}
