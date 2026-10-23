package com.crlzTech.referal.earnings;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.earnings.dto.EarningsSummaryResponse;
import com.crlzTech.referal.referral.ReferralEarningRepository;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.video.VideoCompletionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class EarningsService {

    private final LedgerEntryRepository ledgerRepository;
    private final ReferralEarningRepository referralEarningRepository;
    private final VideoCompletionRepository videoCompletionRepository;

    public EarningsService(LedgerEntryRepository ledgerRepository,
            ReferralEarningRepository referralEarningRepository,
            VideoCompletionRepository videoCompletionRepository) {
        this.ledgerRepository = ledgerRepository;
        this.referralEarningRepository = referralEarningRepository;
        this.videoCompletionRepository = videoCompletionRepository;
    }

    public EarningsSummaryResponse summary() {
        User user = CurrentUser.require();
        Long uid = user.getId();

        BigDecimal referral = nullSafe(
                ledgerRepository.sumByUserAndStatusAndType(uid, LedgerStatus.COMPLETED, LedgerType.REFERRAL_REWARD));
        BigDecimal video = nullSafe(
                ledgerRepository.sumByUserAndStatusAndType(uid, LedgerStatus.COMPLETED, LedgerType.VIDEO_REWARD));
        BigDecimal pending = nullSafe(ledgerRepository.sumByUserAndStatus(uid, LedgerStatus.PENDING));
        BigDecimal withdrawn = nullSafe(
                ledgerRepository.sumByUserAndStatusAndType(uid, LedgerStatus.COMPLETED, LedgerType.WITHDRAWAL));

        BigDecimal total = referral.add(video);
        BigDecimal available = total.subtract(withdrawn);

        long successfulRefs = referralEarningRepository.countByReferrerId(uid);
        long pendingRefs = 0; // pending = registered referred users whose payment is not yet SUCCESS
        long videos = videoCompletionRepository.countByUserId(uid);

        return new EarningsSummaryResponse(
                total, referral, video, available, pending, withdrawn,
                successfulRefs, pendingRefs, videos);
    }

    private static BigDecimal nullSafe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
