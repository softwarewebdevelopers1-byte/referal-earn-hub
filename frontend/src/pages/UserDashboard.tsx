import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  Users,
  PlayCircle,
  TrendingUp,
  Clock,
  Award,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../context/AppContext";
import { StatCard } from "../components/StatCard";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  statusTone,
  humanizeStatus,
} from "../components/ui";
import {
  formatMoney,
} from "../data/format";
import styles from "./UserDashboard.module.css";

const PERIODS = ["7d", "30d", "90d", "12m"] as const;
type Period = (typeof PERIODS)[number];
const PERIOD_LABEL: Record<Period, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
};

export function UserDashboard() {
  const { currentUser, totalsForUser, transactions, referrals, platformConfig } = useApp();
  const [period, setPeriod] = useState<Period>("30d");
  if (!currentUser) return null;

  const t = totalsForUser(currentUser.id);
  const myRecentTx = useMemo(
    () => transactions.filter((tx) => tx.userId === currentUser.id).slice(0, 6),
    [transactions, currentUser.id],
  );
  const myReferrals = useMemo(
    () =>
      referrals
        .filter(
          (r) => r.referrerId === currentUser.id && r.status === "SUCCESSFUL",
        )
        .slice(0, 5),
    [referrals, currentUser.id],
  );

  const trend = useMemo(() => {
    const bucketCount = period === "7d" ? 7 : period === "30d" ? 6 : period === "90d" ? 6 : 12;
    const bucketDays = period === "7d" ? 1 : period === "30d" ? 5 : period === "90d" ? 15 : 30;
    const now = Date.now();
    return Array.from({ length: bucketCount }, (_, index) => {
      const start = now - (bucketCount - index) * bucketDays * 86400000;
      const end = start + bucketDays * 86400000;
      const bucket = myRecentTx.concat(transactions.filter((tx) => tx.userId === currentUser.id))
        .filter((tx, position, all) => all.findIndex((candidate) => candidate.id === tx.id) === position)
        .filter((tx) => {
          const timestamp = new Date(tx.createdAt).getTime();
          return timestamp >= start && timestamp < end;
        });
      return {
        label: new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        referral: bucket.filter((tx) => tx.type === "REFERRAL_REWARD").reduce((sum, tx) => sum + tx.amount, 0),
        video: bucket.filter((tx) => tx.type === "VIDEO_REWARD").reduce((sum, tx) => sum + tx.amount, 0),
      };
    });
  }, [currentUser.id, myRecentTx, period, transactions]);
  const donut = [
    { name: "Referrals", value: t.referralEarnings, color: "var(--chart-ref)" },
    { name: "Videos", value: t.videoEarnings, color: "var(--chart-vid)" },
  ];
  const total = t.referralEarnings + t.videoEarnings || 1;
  const refPct = Math.round((t.referralEarnings / total) * 100);

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Dashboard</h1>
          <p className={styles.sub}>
            Here’s a snapshot of your earnings and activity.
          </p>
        </div>
        <Badge tone="success">Account approved</Badge>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          icon={<Wallet size={18} />}
          label="Total earnings"
          value={formatMoney(t.totalEarnings)}
          change="+12.4%"
          accent
        />
        <StatCard
          icon={<Users size={18} />}
          label="Referral earnings"
          value={formatMoney(t.referralEarnings)}
          hint={`${t.successfulReferrals} successful referrals`}
        />
        <StatCard
          icon={<PlayCircle size={18} />}
          label="Video earnings"
          value={formatMoney(t.videoEarnings)}
          hint={`${t.videosWatched} videos watched`}
        />
        <StatCard
          icon={<Award size={18} />}
          label="Successful referrals"
          value={String(t.successfulReferrals)}
          hint={platformConfig ? `${formatMoney(platformConfig.referralCommission)} per referral` : "Configured reward per referral"}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending referrals"
          value={String(t.pendingReferrals)}
          hint="Awaiting approval"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Videos watched"
          value={String(t.videosWatched)}
          hint="Rewarded plays"
        />
      </div>

      <div className={styles.twoCol}>
        <Card>
          <CardHeader
            title="Earnings overview"
            subtitle="Referral vs. video earnings over time"
            action={
              <div className={styles.periodTabs} role="tablist">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={period === p}
                    className={`${styles.periodBtn} ${period === p ? styles.periodActive : ""}`}
                    onClick={() => setPeriod(p)}
                  >
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
            }
          />
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={trend}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-ref)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-ref)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient id="gVid" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-vid)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-vid)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="referral"
                  stroke="var(--chart-ref)"
                  fill="url(#gRef)"
                  strokeWidth={2}
                  name="Referral"
                />
                <Area
                  type="monotone"
                  dataKey="video"
                  stroke="var(--chart-vid)"
                  fill="url(#gVid)"
                  strokeWidth={2}
                  name="Video"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Earnings breakdown"
            subtitle="Share of total earnings"
          />
          <div className={styles.donutWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {donut.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutLegend}>
              <div className={styles.legendRow}>
                <span
                  className={styles.dot}
                  style={{ background: "var(--chart-ref)" }}
                />
                <div>
                  <div className={styles.legendLabel}>
                    Referrals · {refPct}%
                  </div>
                  <div className={styles.legendValue}>
                    {formatMoney(t.referralEarnings)}
                  </div>
                </div>
              </div>
              <div className={styles.legendRow}>
                <span
                  className={styles.dot}
                  style={{ background: "var(--chart-vid)" }}
                />
                <div>
                  <div className={styles.legendLabel}>
                    Videos · {100 - refPct}%
                  </div>
                  <div className={styles.legendValue}>
                    {formatMoney(t.videoEarnings)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className={styles.twoCol}>
        <Card>
          <CardHeader
            title="Recent transactions"
            subtitle="Latest activity on your account"
            action={
              <Link to="/transactions" className={styles.seeAll}>
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          <div className={styles.txList}>
            {myRecentTx.length === 0 && (
              <p className={styles.emptyMsg}>No transactions yet.</p>
            )}
            {myRecentTx.map((tx) => (
              <div key={tx.id} className={styles.txRow}>
                <div>
                  <div className={styles.txDesc}>{tx.description}</div>
                  <div className={styles.txMeta}>
                    {tx.ref} · {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.txRight}>
                  <div
                    className={
                      tx.amount >= 0 ? styles.txAmount : styles.txAmountNeg
                    }
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {formatMoney(tx.amount)}
                  </div>
                  <Badge tone={statusTone(tx.status)}>
                    {humanizeStatus(tx.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent referrals"
            subtitle="Successful referrals and rewards"
            action={
              <Link to="/referrals" className={styles.seeAll}>
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          <div className={styles.txList}>
            {myReferrals.length === 0 && (
              <p className={styles.emptyMsg}>No successful referrals yet.</p>
            )}
            {myReferrals.map((r) => (
              <div key={r.id} className={styles.txRow}>
                <div>
                  <div className={styles.txDesc}>{r.refereeName}</div>
                  <div className={styles.txMeta}>
                    {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                    {r.refereeEmail}
                  </div>
                </div>
                <div className={styles.txRight}>
                  <div className={styles.txAmount}>
                    +{formatMoney(r.rewardAmount)}
                  </div>
                  <Badge tone="success">Successful</Badge>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Button
              variant="secondary"
              onClick={() => window.location.assign("/referrals")}
            >
              Manage referrals
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
