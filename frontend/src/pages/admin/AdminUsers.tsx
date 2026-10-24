import { useMemo, useState } from "react";
import { Eye, ShieldOff, ShieldCheck, Plus, Pencil, KeyRound } from "lucide-react";
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
import type { User } from "../../types";
import styles from "./Admin.module.css";

const PAGE_SIZE = 8;

export function AdminUsers() {
  const { users, currentUser, toggleUserSuspension, totalsForUser, referrals, notify, createAdminUser, updateAdminUserEmail, resetAdminUserPassword } =
    useApp();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [action, setAction] = useState<"email" | "password" | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "USER" as "USER" | "ADMIN", password: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

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

  const openEmailEditor = (user: User) => {
    setActionUser(user); setAction("email"); setEmail(user.email); setFormError("");
  };

  const openPasswordReset = (user: User) => {
    setActionUser(user); setAction("password"); setPassword(""); setPasswordConfirm(""); setFormError("");
  };

  const submitCreate = async () => {
    if (createForm.firstName.trim().length < 2 || createForm.lastName.trim().length < 2) return setFormError("Enter the user's first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) return setFormError("Enter a valid email address.");
    if (createForm.phone.replace(/\D/g, "").length < 9) return setFormError("Enter a valid phone number.");
    if (createForm.password.length < 8) return setFormError("Use at least 8 characters for the initial password.");
    setSaving(true); setFormError("");
    try {
      await createAdminUser({ ...createForm, email: createForm.email.trim(), phone: createForm.phone.trim() });
      setCreateOpen(false);
      setCreateForm({ firstName: "", lastName: "", email: "", phone: "", role: "USER", password: "" });
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not create the user."); }
    finally { setSaving(false); }
  };

  const submitAction = async () => {
    if (!actionUser || !action) return;
    if (action === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFormError("Enter a valid email address.");
    if (action === "password" && password.length < 8) return setFormError("Use at least 8 characters for the new password.");
    if (action === "password" && password !== passwordConfirm) return setFormError("Passwords do not match.");
    setSaving(true); setFormError("");
    try {
      if (action === "email") await updateAdminUserEmail(actionUser.id, email.trim().toLowerCase());
      else await resetAdminUserPassword(actionUser.id, password);
      setAction(null); setActionUser(null);
    } catch (error) { setFormError(error instanceof Error ? error.message : "The requested user change failed."); }
    finally { setSaving(false); }
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
        <p className={styles.sub}>Search, filter, inspect, and manage user accounts.</p>
        <div style={{ marginTop: "var(--space-3)" }}><Button icon={<Plus size={16} />} onClick={() => { setCreateOpen(true); setFormError(""); }}>Add user</Button></div>
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
                        <Button size="sm" variant="ghost" onClick={() => openEmailEditor(u)} icon={<Pencil size={14} />}>Email</Button>
                        <Button size="sm" variant="secondary" onClick={() => openPasswordReset(u)} icon={<KeyRound size={14} />}>Reset password</Button>
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

      <Modal open={createOpen} title="Add user" onClose={() => { if (!saving) setCreateOpen(false); }} footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button onClick={() => void submitCreate()} loading={saving}>Create user</Button></>}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>New accounts start as unpaid and must follow the normal payment-gating process.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          <Field label="First name"><TextInput value={createForm.firstName} onChange={(event) => setCreateForm((form) => ({ ...form, firstName: event.target.value }))} /></Field>
          <Field label="Last name"><TextInput value={createForm.lastName} onChange={(event) => setCreateForm((form) => ({ ...form, lastName: event.target.value }))} /></Field>
        </div>
        <Field label="Email"><TextInput type="email" value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} /></Field>
        <Field label="Phone"><TextInput type="tel" value={createForm.phone} onChange={(event) => setCreateForm((form) => ({ ...form, phone: event.target.value }))} /></Field>
        <Field label="Role"><SelectInput value={createForm.role} onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value as "USER" | "ADMIN" }))}><option value="USER">User</option><option value="ADMIN">Admin</option></SelectInput></Field>
        <Field label="Initial password" hint="The password is hashed immediately and is never returned."><TextInput type="password" autoComplete="new-password" value={createForm.password} onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))} /></Field>
        {formError && <p className={styles.formError} role="alert">{formError}</p>}
      </Modal>

      <Modal open={!!actionUser && !!action} title={action === "email" ? `Change email for ${actionUser?.name ?? "user"}` : `Reset password for ${actionUser?.name ?? "user"}`} onClose={() => { if (!saving) { setAction(null); setActionUser(null); } }} footer={<><Button variant="ghost" onClick={() => { setAction(null); setActionUser(null); }} disabled={saving}>Cancel</Button><Button variant={action === "password" ? "danger" : "primary"} onClick={() => void submitAction()} loading={saving}>{action === "email" ? "Save email" : "Confirm password reset"}</Button></>}>
        {action === "email" ? <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>The address is normalized for login and must not belong to another account.</p>
          <Field label="New email"><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" /></Field>
        </> : <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>This revokes the user's existing refresh sessions. Confirm the target account before continuing; the password will not be displayed or logged.</p>
          <Field label="New password"><TextInput type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          <Field label="Confirm new password"><TextInput type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></Field>
        </>}
        {formError && <p className={styles.formError} role="alert">{formError}</p>}
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
