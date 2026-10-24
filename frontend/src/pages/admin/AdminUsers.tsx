import { useMemo, useState } from "react";
import { Eye, ShieldOff, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
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
} from "../../components/ui";
import { formatMoney } from "../../data/format";
import type { User } from "../../types";
import styles from "./Admin.module.css";

const PAGE_SIZE = 8;

export function AdminUsers() {
  const { users, currentUser, toggleUserSuspension, totalsForUser, referrals, notify } =
    useApp();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (id: string) => {
    setBusyId(id);
    try {
      await toggleUserSuspension(id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update account status.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "ALL" && u.role !== role) return false;
      if (paymentStatus !== "ALL" && u.paymentStatus !== paymentStatus)
        return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });
  }, [users, role, paymentStatus, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>User management</h1>
        <p className={styles.sub}>
          Search, filter, inspect, and suspend user accounts.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Users"
          subtitle={`${filtered.length} records`}
          action={
            <div className={styles.filters}>
              <TextInput
                placeholder="Search name, email, or phone…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              <SelectInput
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All roles</option>
                <option value="USER">Users</option>
                <option value="ADMIN">Admins</option>
              </SelectInput>
              <SelectInput
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All payment statuses</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
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
                <th>User</th>
                <th>Role</th>
                <th>Payment</th>
                <th>Account</th>
                <th className={styles.right}>Earnings</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const t = totalsForUser(u.id);
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td data-label="User">
                      <div>{u.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {u.email}
                      </div>
                    </td>
                    <td data-label="Role">{humanizeStatus(u.role)}</td>
                    <td data-label="Payment">
                      <Badge tone={statusTone(u.paymentStatus)}>
                        {humanizeStatus(u.paymentStatus)}
                      </Badge>
                    </td>
                    <td data-label="Account">
                      <Badge tone={statusTone(u.accountStatus)}>
                        {humanizeStatus(u.accountStatus)}
                      </Badge>
                    </td>
                    <td data-label="Earnings" className={styles.right}>
                      {formatMoney(t.totalEarnings)}
                    </td>
                    <td className={styles.right}>
                      <div className={styles.actions}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetail(u)}
                          icon={<Eye size={14} />}
                        >
                          View
                        </Button>
                        {!isSelf &&
                          u.role !== "ADMIN" &&
                          (u.accountStatus === "ACTIVE" ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void toggle(u.id)}
                              loading={busyId === u.id}
                              icon={<ShieldOff size={14} />}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => void toggle(u.id)}
                              loading={busyId === u.id}
                              icon={<ShieldCheck size={14} />}
                            >
                              Reactivate
                            </Button>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No users match your filters" />
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
        title="User details"
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detail && (
          <UserDetail
            user={detail}
            totals={totalsForUser(detail.id)}
            referralCount={
              referrals.filter((r) => r.referrerId === detail.id).length
            }
          />
        )}
      </Modal>
    </div>
  );
}

function UserDetail({
  user,
  totals,
  referralCount,
}: {
  user: User;
  totals: ReturnType<ReturnType<typeof useApp>["totalsForUser"]>;
  referralCount: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--orange-500)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {user.avatarSeed}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {user.email} · {user.phone}
          </div>
        </div>
      </div>
      <dl className={styles.dl}>
        <div>
          <dt>Role</dt>
          <dd>{humanizeStatus(user.role)}</dd>
        </div>
        <div>
          <dt>Payment status</dt>
          <dd>
            <Badge tone={statusTone(user.paymentStatus)}>
              {humanizeStatus(user.paymentStatus)}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Account status</dt>
          <dd>
            <Badge tone={statusTone(user.accountStatus)}>
              {humanizeStatus(user.accountStatus)}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Referral code</dt>
          <dd>{user.referralCode}</dd>
        </div>
        <div>
          <dt>Referred by</dt>
          <dd>{user.referredByCode ?? "—"}</dd>
        </div>
        <div>
          <dt>Member since</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
        </div>
        <div>
          <dt>Referrals</dt>
          <dd>
            {referralCount} ({totals.successfulReferrals} successful)
          </dd>
        </div>
        <div>
          <dt>Referral earnings</dt>
          <dd>{formatMoney(totals.referralEarnings)}</dd>
        </div>
        <div>
          <dt>Video earnings</dt>
          <dd>{formatMoney(totals.videoEarnings)}</dd>
        </div>
        <div>
          <dt>Total earnings</dt>
          <dd>{formatMoney(totals.totalEarnings)}</dd>
        </div>
        <div>
          <dt>Videos watched</dt>
          <dd>{totals.videosWatched}</dd>
        </div>
      </dl>
    </div>
  );
}
