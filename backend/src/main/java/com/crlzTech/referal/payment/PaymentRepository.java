package com.crlzTech.referal.payment;

import com.crlzTech.referal.common.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByInternalReference(String internalReference);

    Optional<Payment> findByExternalReference(String externalReference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.internalReference = :reference")
    Optional<Payment> findByInternalReferenceForUpdate(@Param("reference") String reference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.externalReference = :reference")
    Optional<Payment> findByExternalReferenceForUpdate(@Param("reference") String reference);

    Optional<Payment> findByMpesaReference(String mpesaReference);

    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Payment> findFirstByUserIdAndStatusInOrderByCreatedAtDesc(
            Long userId, List<PaymentStatus> statuses);

    Page<Payment> findByStatusIn(List<PaymentStatus> statuses, Pageable pageable);

    boolean existsByUserIdAndStatusIn(Long userId, List<PaymentStatus> statuses);
}
