package com.crlzTech.referal.video;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "videos")
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 600)
    private String description;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(name = "duration_sec", nullable = false)
    private int durationSec;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal reward;

    @Column(name = "gradient_from", nullable = false, length = 20)
    private String gradientFrom = "#f97316";

    @Column(name = "gradient_to", nullable = false, length = 20)
    private String gradientTo = "#ea580c";

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public int getDurationSec() {
        return durationSec;
    }

    public BigDecimal getReward() {
        return reward;
    }

    public String getGradientFrom() {
        return gradientFrom;
    }

    public String getGradientTo() {
        return gradientTo;
    }

    public boolean isActive() {
        return active;
    }
}
