import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { videos, formatMoney } from "../data/dummyData";
import { Badge, Button, Card, EmptyState } from "../components/ui";
import styles from "./Videos.module.css";

export function VideoDetail() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { currentUser, completeVideo, isVideoCompleted } = useApp();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;
  const video = videos.find((v) => v.id === videoId);
  if (!video) {
    return (
      <Card>
        <EmptyState
          title="Video not found"
          message="This video may have been removed."
        />
        <div style={{ textAlign: "center", marginTop: "var(--space-3)" }}>
          <Button onClick={() => navigate("/videos")}>Back to videos</Button>
        </div>
      </Card>
    );
  }

  const completed = isVideoCompleted(currentUser.id, video.id);

  const startPlay = () => {
    if (completed) {
      setPlaying(true);
      setProgress(100);
      return;
    }
    setPlaying(true);
    setProgress(0);
    let p = 0;
    const interval = window.setInterval(() => {
      p += 20;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        window.clearInterval(interval);
      }
    }, 300);
  };

  const claimReward = () => {
    setLoading(true);
    window.setTimeout(() => {
      completeVideo(video.id, video.reward, video.title);
      setLoading(false);
    }, 400);
  };

  return (
    <div className={styles.wrap}>
      <Link to="/videos" className={styles.back}>
        <ArrowLeft size={16} /> Back to videos
      </Link>

      <Card>
        <div
          className={styles.player}
          style={{
            background: `linear-gradient(135deg, ${video.gradient[0]}, ${video.gradient[1]})`,
          }}
        >
          {!playing && (
            <button
              className={styles.playBig}
              onClick={startPlay}
              aria-label="Play video"
            >
              <PlayCircle size={72} />
            </button>
          )}
          {playing && (
            <div className={styles.playerDemo}>
              <span>Demonstration player</span>
              <span className={styles.playerHint}>
                No real video stream is loaded in this prototype.
              </span>
            </div>
          )}
          <div className={styles.playerBar}>
            <div
              className={styles.playerBarFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Badge tone="info">{video.category}</Badge>
            <Badge tone={completed ? "success" : "warning"}>
              {completed ? "Completed" : "Reward available"}
            </Badge>
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              <Clock size={14} /> {Math.round(video.durationSec / 60)} min
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{video.title}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {video.description}
          </p>
        </div>

        <div className={styles.rewardBox}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Reward
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--orange-600)",
              }}
            >
              {formatMoney(video.reward)}
            </div>
          </div>
          {completed ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--success)",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={20} /> Reward already credited
            </div>
          ) : progress >= 100 ? (
            <Button variant="primary" loading={loading} onClick={claimReward}>
              Claim reward
            </Button>
          ) : (
            <Button variant="secondary" onClick={startPlay}>
              Start watching
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
