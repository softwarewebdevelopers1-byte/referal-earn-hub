package com.crlzTech.referal.referral;

import com.crlzTech.referal.referral.dto.ReferralStatsResponse;
import com.crlzTech.referal.referral.dto.SuccessfulReferralDto;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ReferralService {

    private final UserRepository userRepository;
    private final ReferralEarningRepository referralEarningRepository;
    private final String frontendBaseUrl;

    public ReferralService(UserRepository userRepository,
            ReferralEarningRepository referralEarningRepository,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.referralEarningRepository = referralEarningRepository;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public ReferralStatsResponse myStats() {
        User user = CurrentUser.require();
        long successful = referralEarningRepository.countByReferrerId(user.getId());
        BigDecimal earnings = referralEarningRepository.sumAmountByReferrerId(user.getId());

        long totalRegistered = userRepository.findAll().stream()
                .filter(u -> u.getReferredBy() != null && u.getReferredBy().getId().equals(user.getId()))
                .count();
        long pending = Math.max(0, totalRegistered - successful);

        return new ReferralStatsResponse(
                user.getReferralCode(),
                frontendBaseUrl + "/register?ref=" + user.getReferralCode(),
                totalRegistered,
                successful,
                pending,
                earnings != null ? earnings : BigDecimal.ZERO);
    }

    public Page<SuccessfulReferralDto> mySuccessfulReferrals(int page, int size) {
        User user = CurrentUser.require();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return referralEarningRepository.findByReferrerIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(e -> new SuccessfulReferralDto(
                        e.getReferee().getId(),
                        e.getReferee().getFirstName() + " " + e.getReferee().getLastName(),
                        maskEmail(e.getReferee().getEmail()),
                        e.getAmount(),
                        e.getCreatedAt()));
    }

    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1)
            return "***" + (at >= 0 ? email.substring(at) : "");
        return email.charAt(0) + "***" + email.substring(at);
    }
}
