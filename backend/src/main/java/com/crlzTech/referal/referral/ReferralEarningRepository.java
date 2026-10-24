package com.crlzTech.referal.referral;

import com.crlzTech.referal.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;

public interface ReferralEarningRepository extends JpaRepository<ReferralEarning, Long> {
    long countByReferrerId(Long referrerId);

    boolean existsByRefereeId(Long refereeId);

    @Query("select coalesce(sum(r.amount), 0) from ReferralEarning r where r.referrer.id = :referrerId")
    BigDecimal sumAmountByReferrerId(@Param("referrerId") Long referrerId);

    Page<ReferralEarning> findByReferrerIdOrderByCreatedAtDesc(Long referrerId, Pageable pageable);
}
