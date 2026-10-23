package com.crlzTech.referal.video;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findByActiveTrueOrderByIdAsc();
}
