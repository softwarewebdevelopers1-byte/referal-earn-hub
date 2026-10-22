import { useMemo } from "react";
import {
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
  Wallet,
  PlayCircle,
  Receipt,
} from "lucide-react";
import {
  Bar,
  BarChart,
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
import { useApp } from "../../context/AppContext";
import { StatCard } from "../../components/StatCard";
import {
  Badge,
  Card,
  CardHeader,
  statusTone,
  humanizeStatus,
} from "../../components/ui";
import {
  adminApprovalTrend,
  adminRegistrationTrend,
  formatMoney,
} from "../../data/dummyData";
import styles from "./Admin.module.css";

export function AdminDashboard() {
  const { users, payments, transactions } = useApp();

  const stats = useMemo(() => {
    const approved = users.filter((u) => u.paymentStatus === "PAID").length;
    const pending = payments.filter(
      (p) => p.status === "PAYMENT_PENDING" || p.status === "PAYMENT_REVIEW",
    ).length;
    const rejected = payments.filter((p) => p.status === "REJECTED").length;
    const refRewards = transactions
      .filter((t) => t.type === "REFERRAL_REWARD" && t.status === "COMPLETED")
      .reduce((s, t) => s + t.amount, 0);
    const vidRewards = transactions
      .filter((t) => t.type === "VIDEO_REWARD" && t.status === "COMPLETED")
      .reduce((s, t) => s + t.amount, 0);
    return {
      totalUsers: users.length,
      approved,
      pending,
      rejected,
      refRewards,
      vidRewards,
      totalTx: transactions.length,
    };
  }, [users, payments, transactions]);

  const rewardData = [
    { name: "Referrals", value: stats.refRewards, color: "var(--chart-ref)" },
    { name: "Videos", value: stats.vidRewards, color: "var(--chart-vid)" },
  ];

  const recentPayments = payments.slice(0, 5);
  const recentTx = transactions.slice(0, 6);
  const recentUsers = [...users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Admin overview</h1>
        <p className={styles.sub}>Platform activity at a glance.</p>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          icon={<Users size={18} />}
          label="Registered users"
          value={String(stats.totalUsers)}
          accent
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Approved users"
          value={String(stats.approved)}
        />
        <StatCard
          icon={<CreditCard size={18} />}
          label="Pending payments"
          value={String(stats.pending)}
        />
        <StatCard
          icon={<XCircle size={18} />}
          label="Rejected payments"
          value={String(stats.rejected)}
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Referral rewards"
          value={formatMoney(stats.refRewards)}
        />
        <StatCard
          icon={<PlayCircle size={18} />}
          label="Video rewards"
          value={formatMoney(stats.vidRewards)}
        />
        <StatCard
          icon={<Receipt size={18} />}
          label="Transactions"
          value={String(stats.totalTx)}
        />
      </div>

      <div className={styles.twoCol}>
        <Card>
          <CardHeader
            title="User registrations"
            subtitle="New signups over the past 8 weeks"
          />
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart
                data={adminRegistrationTrend}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
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
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="users"
                  fill="var(--orange-500)"
                  radius={[6, 6, 0, 0]}
                  name="Users"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Payment review trend"
            subtitle="Approved vs. pending per week"
          />
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart
                data={adminApprovalTrend}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
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
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="approved"
                  fill="var(--success)"
                  radius={[6, 6, 0, 0]}
                  name="Approved"
                />
                <Bar
                  dataKey="pending"
                  fill="var(--warning)"
                  radius={[6, 6, 0, 0]}
                  name="Pending"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className={styles.twoCol}>
        <Card>
          <CardHeader
            title="Rewards distribution"
            subtitle="Referral vs. video rewards credited"
          />
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={rewardData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={96}
                  paddingAngle={2}
                >
                  {rewardData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent payment submissions" />
          <div className={styles.rowList}>
            {recentPayments.map((p) => (
              <div key={p.id} className={styles.row}>
                <div>
                  <div className={styles.rowTitle}>{p.userName}</div>
                  <div className={styles.rowMeta}>
                    {p.reference} ·{" "}
                    {new Date(p.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge tone={statusTone(p.status)}>
                  {humanizeStatus(p.status)}
                </Badge>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <p className={styles.emptyMsg}>No payments yet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className={styles.twoCol}>
        <Card>
          <CardHeader title="Recent transactions" />
          <div className={styles.rowList}>
            {recentTx.map((t) => (
              <div key={t.id} className={styles.row}>
                <div>
                  <div className={styles.rowTitle}>{t.description}</div>
                  <div className={styles.rowMeta}>
                    {t.userName} · {t.ref}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: t.amount >= 0 ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {formatMoney(t.amount)}
                  </div>
                  <Badge tone={statusTone(t.status)}>
                    {humanizeStatus(t.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent registrations" />
          <div className={styles.rowList}>
            {recentUsers.map((u) => (
              <div key={u.id} className={styles.row}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div className={styles.avatarSm}>{u.avatarSeed}</div>
                  <div>
                    <div className={styles.rowTitle}>{u.name}</div>
                    <div className={styles.rowMeta}>{u.email}</div>
                  </div>
                </div>
                <Badge tone={statusTone(u.paymentStatus)}>
                  {humanizeStatus(u.paymentStatus)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
