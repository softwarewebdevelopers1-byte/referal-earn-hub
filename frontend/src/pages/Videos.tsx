import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../data/format";
import {
  Badge,
  Card,
  SelectInput,
  TextInput,
  EmptyState,
  ErrorState,
} from "../components/ui";
import styles from "./Videos.module.css";

const CATEGORIES = [
  "All",
  "Education",
  "Technology",
  "Business",
  "Lifestyle",
  "Entertainment",
] as const;

export function Videos() {
  const { currentUser, isVideoCompleted, videos, loading, dataError, retryLoad } = useApp();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");
  if (!currentUser) return null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (cat !== "All" && v.category !== cat) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Videos</h1>
        <p className={styles.sub}>
          Watch eligible videos once and earn rewards instantly.
        </p>
      </div>

      <div className={styles.filters}>
        <TextInput
          placeholder="Search videos…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search videos"
        />
        <SelectInput
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectInput>
      </div>

      {dataError && videos.length === 0 ? (
        <ErrorState message={dataError} onRetry={retryLoad} retrying={loading} />
      ) : loading && videos.length === 0 ? (
        <Card><EmptyState title="Loading videos…" /></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No videos found"
            message="Try a different search or category."
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {filtered.map((v) => {
            const done = isVideoCompleted(currentUser.id, v.id);
            return (
              <Link to={`/videos/${v.id}`} key={v.id} className={styles.card}>
                <div
                  className={styles.thumb}
                  style={{
                    background: `linear-gradient(135deg, ${v.gradient[0]}, ${v.gradient[1]})`,
                  }}
                >
                  <PlayCircle size={34} className={styles.playIcon} />
                  <span className={styles.duration}>
                    {Math.round(v.durationSec / 60)} min
                  </span>
                  {done && (
                    <span className={styles.doneBadge}>
                      <CheckCircle2 size={12} /> Watched
                    </span>
                  )}
                </div>
                <div className={styles.body}>
                  <div className={styles.meta}>
                    <Badge tone="info">{v.category}</Badge>
                    <span className={styles.reward}>
                      {formatMoney(v.reward)}
                    </span>
                  </div>
                  <h3 className={styles.title}>{v.title}</h3>
                  <p className={styles.desc}>{v.description}</p>
                  <div className={styles.cta}>
                    {done ? "Watch again (no reward)" : "Watch & earn"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
