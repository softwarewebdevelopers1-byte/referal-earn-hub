import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  Pagination,
  SelectInput,
  TextInput,
  statusTone,
  humanizeStatus,
} from "../components/ui";
import { formatMoney } from "../data/dummyData";
import type { Transaction } from "../types";
import styles from "./Earnings.module.css";

const PAGE_SIZE = 10;

export function Transactions() {
  const { currentUser, transactions } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Transaction | null>(null);
  if (!currentUser) return null;

  const mine = useMemo(
    () => transactions.filter((tx) => tx.userId === currentUser.id),
    [transactions, currentUser.id],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((tx) => {
      if (status !== "ALL" && tx.status !== status) return false;
      if (!q) return true;
      return (
        tx.ref.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    });
  }, [mine, status, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Transactions</h1>
        <p className={styles.sub}>All activity on your account.</p>
      </div>

      <Card>
        <CardHeader
          title="History"
          subtitle={`${filtered.length} records`}
          action={
            <div className={styles.filters}>
              <TextInput
                placeholder="Search reference or description…"
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
                  <td colSpan={6}>
                    <EmptyState title="No transactions yet" />
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
    </div>
  );
}
