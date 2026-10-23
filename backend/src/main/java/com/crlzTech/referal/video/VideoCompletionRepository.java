package com.crlzTech.referal.video;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoCompletionRepository extends JpaRepository<VideoCompletion, Long> {
    boolean existsByUserIdAndVideoId(Long userId, Long videoId);

    Page<VideoCompletion> findByUserIdOrderByCompletedAtDesc(Long userId, Pageable pageable);

    long countByUserId(Long userId);
}
