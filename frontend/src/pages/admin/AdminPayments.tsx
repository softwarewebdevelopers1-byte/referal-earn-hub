import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { useApp } from "../../context/AppContext";
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
} from "../../components/ui";
import { formatMoney } from "../../data/format";
import type { PaymentRecord } from "../../types";
import styles from "./Admin.module.css";

const PAGE_SIZE = 8;

export function AdminPayments() {
  const { payments, approvePayment, rejectPayment, notify } = useApp();
  const [status, setStatus] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<PaymentRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const doApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approvePayment(id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not approve payment.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 4) {
      setRejectError("Enter at least 4 characters explaining the rejection.");
      return;
    }
    const id = rejectTarget.id;
    setBusyId(id);
    try {
      await rejectPayment(id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason("");
      setRejectError("");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not reject payment.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Payment review</h1>
        <p className={styles.sub}>
          Approve or reject submitted payments. Approvals unlock the user
          dashboard and credit qualifying referrals.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Submissions"
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
                <option value="PAYMENT_PENDING">Pending</option>
                <option value="PAYMENT_REVIEW">In review</option>
                <option value="PAID">Approved</option>
                <option value="REJECTED">Rejected</option>
              </SelectInput>
            </div>
          }
        />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Reference</th>
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
                  <td data-label="User">
                    <div>{p.userName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {p.userEmail}
                    </div>
                  </td>
                  <td data-label="Reference">
                    <code className={styles.code}>{p.reference}</code>
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
                    <div className={styles.actions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetail(p)}
                        icon={<Eye size={14} />}
                      >
                        View
                      </Button>
                      {(p.status === "PAYMENT_PENDING" ||
                        p.status === "PAYMENT_REVIEW") && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => void doApprove(p.id)}
                            loading={busyId === p.id}
                            icon={<CheckCircle2 size={14} />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setRejectTarget(p)}
                            disabled={busyId === p.id}
                            icon={<XCircle size={14} />}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
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

      <Modal
        open={!!rejectTarget}
        title="Reject payment"
        onClose={() => {
          setRejectTarget(null);
          setRejectError("");
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setRejectTarget(null);
              setRejectError("");
            }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void doReject()} loading={busyId === rejectTarget?.id}>
              Confirm rejection
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: "var(--space-3)", fontSize: 14 }}>
          Reject <strong>{rejectTarget?.userName}</strong>'s payment. The user
          will be notified and can resubmit.
        </p>
        <Field label="Rejection reason" error={rejectError}>
          <TextInput
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Reference could not be verified"
          />
        </Field>
      </Modal>
    </div>
  );
}
