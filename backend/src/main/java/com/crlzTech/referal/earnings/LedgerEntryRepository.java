package com.crlzTech.referal.earnings;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    boolean existsByReference(String reference);

    @Query("""
            SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l
            WHERE l.user.id = :userId AND l.status = :status AND l.type = :type
            """)
    BigDecimal sumByUserAndStatusAndType(@Param("userId") Long userId,
            @Param("status") LedgerStatus status,
            @Param("type") LedgerType type);

    @Query("""
            SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l
            WHERE l.user.id = :userId AND l.status = :status
            """)
    BigDecimal sumByUserAndStatus(@Param("userId") Long userId,
            @Param("status") LedgerStatus status);

    @Query("""
            SELECT l FROM LedgerEntry l
            WHERE l.user.id = :userId
              AND (:type IS NULL OR l.type = :type)
              AND (:status IS NULL OR l.status = :status)
            """)
    Page<LedgerEntry> searchByUser(@Param("userId") Long userId,
            @Param("type") LedgerType type,
            @Param("status") LedgerStatus status,
            Pageable pageable);

    @Query("""
            SELECT l FROM LedgerEntry l
            WHERE (:type IS NULL OR l.type = :type)
              AND (:status IS NULL OR l.status = :status)
            """)
    Page<LedgerEntry> searchAll(@Param("type") LedgerType type,
            @Param("status") LedgerStatus status,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.status = :status AND l.type = :type")
    BigDecimal sumGlobalByStatusAndType(@Param("status") LedgerStatus status, @Param("type") LedgerType type);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.status = :status")
    BigDecimal sumGlobalByStatus(@Param("status") LedgerStatus status);
}
