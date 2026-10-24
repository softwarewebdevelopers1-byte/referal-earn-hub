package com.crlzTech.referal.video;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
@PreAuthorize("@paidAccessGuard.check(authentication)")
public class VideoController {

    private final VideoService videoService;

    public VideoController(VideoService videoService) {
        this.videoService = videoService;
    }

    @GetMapping
    public List<Video> list() {
        return videoService.listActive();
    }

    @GetMapping("/{id}")
    public Map<String, Object> detail(@PathVariable Long id) {
        Video v = videoService.get(id);
        return Map.of(
                "video", v,
                "completed", videoService.isCompleted(id));
    }

    @PostMapping("/{id}/complete")
    public Map<String, Object> complete(@PathVariable Long id) {
        videoService.complete(id);
        return Map.of("status", true);
    }
}
