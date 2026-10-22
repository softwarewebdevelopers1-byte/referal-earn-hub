import { useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowDownCircle,
  PlayCircle,
  Users,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Modal,
  Pagination,
  SelectInput,
  TextInput,
  statusTone,
  humanizeStatus,
} from "../components/ui";
import { StatCard } from "../components/StatCard";
import { formatMoney } from "../data/dummyData";
import type { Transaction } from "../types";
import styles from "./Earnings.module.css";

const PAGE_SIZE = 8;

export function Earnings() {
  const { currentUser, transactions, totalsForUser, requestWithdrawal } =
    useApp();
  const [source, setSource] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  if (!currentUser) return null;

  const t = totalsForUser(currentUser.id);

  const mine = useMemo(
    () => transactions.filter((tx) => tx.userId === currentUser.id),
    [transactions, currentUser.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((tx) => {
      if (source !== "ALL" && tx.type !== source) return false;
      if (status !== "ALL" && tx.status !== status) return false;
      if (!q) return true;
      return (
        tx.ref.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    });
  }, [mine, source, status, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleWithdraw = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > t.availableBalance) return;
    requestWithdrawal(n);
    setWithdrawOpen(false);
    setAmount("");
  };

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Earnings</h1>
        <p className={styles.sub}>
          Track your lifetime earnings, available balance, and history.
        </p>
      </div>

      <div className={styles.statGrid}>
        <StatCard
          icon={<Wallet size={18} />}
          label="Total earnings"
          value={formatMoney(t.totalEarnings)}
          accent
        />
        <StatCard
          icon={<Users size={18} />}
          label="Referral earnings"
          value={formatMoney(t.referralEarnings)}
        />
        <StatCard
          icon={<PlayCircle size={18} />}
          label="Video earnings"
          value={formatMoney(t.videoEarnings)}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Available balance"
          value={formatMoney(t.availableBalance)}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending earnings"
          value={formatMoney(t.pendingEarnings)}
        />
        <StatCard
          icon={<ArrowDownCircle size={18} />}
          label="Total withdrawn"
          value={formatMoney(t.withdrawn)}
        />
      </div>

      <Card>
        <CardHeader
          title="Withdraw funds"
          subtitle="Simulated withdrawal to your linked M-Pesa number"
          action={
            <Button
              onClick={() => setWithdrawOpen(true)}
              disabled={t.availableBalance <= 0}
            >
              Request withdrawal
            </Button>
          }
        />
        <p className={styles.small}>
          Available balance: <strong>{formatMoney(t.availableBalance)}</strong>.
          Withdrawals in this prototype are simulated and do not move real
          money.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Earnings history"
          subtitle={`${filtered.length} records`}
          action={
            <div className={styles.filters}>
              <TextInput
                placeholder="Search reference…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              <SelectInput
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All sources</option>
                <option value="REFERRAL_REWARD">Referral</option>
                <option value="VIDEO_REWARD">Video</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="PAYMENT_SUBMISSION">Payment</option>
              </SelectInput>
              <SelectInput
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </SelectInput>
            </div>
          }
        />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Source</th>
                <th>Description</th>
                <th className={styles.right}>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id}>
                  <td data-label="Reference">
                    <code className={styles.code}>{tx.ref}</code>
                  </td>
                  <td data-label="Date">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td data-label="Source">{humanizeStatus(tx.type)}</td>
                  <td data-label="Description">{tx.description}</td>
                  <td data-label="Amount" className={styles.right}>
                    <span className={tx.amount >= 0 ? styles.pos : styles.neg}>
                      {formatMoney(tx.amount)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <Badge tone={statusTone(tx.status)}>
                      {humanizeStatus(tx.status)}
                    </Badge>
                  </td>
                  <td className={styles.right}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetail(tx)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No transactions match your filters" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onChange={setPage}
        />
      </Card>

      <Modal
        open={!!detail}
        title="Transaction details"
        onClose={() => setDetail(null)}
      >
        {detail && (
          <dl className={styles.dl}>
            <div>
              <dt>Reference</dt>
              <dd>{detail.ref}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{humanizeStatus(detail.type)}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{detail.description}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatMoney(detail.amount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={statusTone(detail.status)}>
                  {humanizeStatus(detail.status)}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal
        open={withdrawOpen}
        title="Request withdrawal"
        onClose={() => setWithdrawOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw}>Submit request</Button>
          </>
        }
      >
        <Field
          label="Amount (KSh)"
          hint={`Available: ${formatMoney(t.availableBalance)}`}
        >
          <TextInput
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
          />
        </Field>
        <p className={styles.small}>
          This is a simulated withdrawal; no real money is transferred.
        </p>
      </Modal>
    </div>
  );
}
