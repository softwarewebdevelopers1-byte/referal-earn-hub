package com.crlzTech.referal.video;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.earnings.LedgerEntry;
import com.crlzTech.referal.earnings.LedgerEntryRepository;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class VideoService {

    private final VideoRepository videoRepository;
    private final VideoCompletionRepository completionRepository;
    private final LedgerEntryRepository ledgerRepository;

    public VideoService(VideoRepository videoRepository,
            VideoCompletionRepository completionRepository,
            LedgerEntryRepository ledgerRepository) {
        this.videoRepository = videoRepository;
        this.completionRepository = completionRepository;
        this.ledgerRepository = ledgerRepository;
    }

    public List<Video> listActive() {
        return videoRepository.findByActiveTrueOrderByIdAsc();
    }

    public Video get(Long id) {
        return videoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));
    }

    public boolean isCompleted(Long videoId) {
        return completionRepository.existsByUserIdAndVideoId(CurrentUser.id(), videoId);
    }

    @Transactional
    public void complete(Long videoId) {
        User user = CurrentUser.require();
        Video video = get(videoId);

        // Duplicate guard (also enforced by DB unique constraint)
        if (completionRepository.existsByUserIdAndVideoId(user.getId(), videoId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Video already completed");
        }

        VideoCompletion completion = new VideoCompletion();
        completion.setUser(user);
        completion.setVideo(video);
        completion.setRewardAmount(video.getReward());
        completionRepository.save(completion);

        // Ledger entry — reference uses completion id so it is naturally idempotent
        LedgerEntry entry = new LedgerEntry();
        entry.setUser(user);
        entry.setType(LedgerType.VIDEO_REWARD);
        entry.setStatus(LedgerStatus.COMPLETED);
        entry.setAmount(video.getReward());
        entry.setCurrency("KES");
        entry.setReference("VID-" + completion.getId());
        entry.setDescription("Video reward: " + video.getTitle());
        entry.setSourceId(completion.getId());
        ledgerRepository.save(entry);
    }
}
