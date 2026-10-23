package com.crlzTech.referal.payment;

import com.crlzTech.referal.common.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByInternalReference(String internalReference);

    Optional<Payment> findByExternalReference(String externalReference);

    Optional<Payment> findByMpesaReference(String mpesaReference);

    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Payment> findByStatusIn(List<PaymentStatus> statuses, Pageable pageable);

    boolean existsByUserIdAndStatusIn(Long userId, List<PaymentStatus> statuses);
}
