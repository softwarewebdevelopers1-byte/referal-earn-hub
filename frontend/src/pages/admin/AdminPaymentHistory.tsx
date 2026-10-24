import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  Pagination,
  SelectInput,
  TextInput,
  statusTone,
  humanizeStatus,
} from "../../components/ui";
import { formatMoney } from "../../data/format";
import type { PaymentRecord } from "../../types";
import styles from "./Admin.module.css";

const PAGE_SIZE = 10;

export function AdminPaymentHistory() {
  const { payments } = useApp();
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<PaymentRecord | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (status !== "ALL" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.userName.toLowerCase().includes(q) ||
        p.userEmail.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q)
      );
    });
  }, [payments, status, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Payment history</h1>
        <p className={styles.sub}>
          Complete record of approved, pending, and rejected payments.
        </p>
      </div>

      <Card>
        <CardHeader
          title="All payments"
          subtitle={`${filtered.length} records`}
          action={
            <div className={styles.filters}>
              <TextInput
                placeholder="Search name, email, or reference…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              <SelectInput
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="PAID">Approved</option>
                <option value="PAYMENT_PENDING">Pending</option>
                <option value="PAYMENT_REVIEW">In review</option>
                <option value="REJECTED">Rejected</option>
              </SelectInput>
            </div>
          }
        />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>User</th>
                <th>Method</th>
                <th>Submitted</th>
                <th className={styles.right}>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td data-label="Reference">
                    <code className={styles.code}>{p.reference}</code>
                  </td>
                  <td data-label="User">
                    <div>{p.userName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {p.userEmail}
                    </div>
                  </td>
                  <td data-label="Method">{p.method}</td>
                  <td data-label="Submitted">
                    {new Date(p.submittedAt).toLocaleDateString()}
                  </td>
                  <td data-label="Amount" className={styles.right}>
                    {formatMoney(p.amount)}
                  </td>
                  <td data-label="Status">
                    <Badge tone={statusTone(p.status)}>
                      {humanizeStatus(p.status)}
                    </Badge>
                  </td>
                  <td className={styles.right}>
                    <button
                      onClick={() => setDetail(p)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--orange-500)",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No payments match your filters" />
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
        title="Payment details"
        onClose={() => setDetail(null)}
      >
        {detail && (
          <dl className={styles.dl}>
            <div>
              <dt>User</dt>
              <dd>{detail.userName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{detail.userEmail}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{detail.reference}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{detail.method}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatMoney(detail.amount)}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{new Date(detail.submittedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={statusTone(detail.status)}>
                  {humanizeStatus(detail.status)}
                </Badge>
              </dd>
            </div>
            {detail.reviewNote && (
              <div>
                <dt>Review note</dt>
                <dd>{detail.reviewNote}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}
