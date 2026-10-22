import { useMemo, useState } from "react";
import {
  Copy,
  Share2,
  MessageCircle,
  Users,
  Award,
  Clock,
  Wallet,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Pagination,
  SelectInput,
  TextInput,
  statusTone,
  humanizeStatus,
} from "../components/ui";
import { REFERRAL_REWARD, formatMoney } from "../data/dummyData";
import styles from "./Referrals.module.css";

const PAGE_SIZE = 8;

export function Referrals() {
  const { currentUser, referrals, totalsForUser, notify } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "SUCCESSFUL" | "PENDING">("ALL");
  const [page, setPage] = useState(1);
  if (!currentUser) return null;

  const t = totalsForUser(currentUser.id);

  const url = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://example.com";
    return `${origin}/register?ref=${currentUser.referralCode}`;
  }, [currentUser.referralCode]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied to clipboard.`, "success");
    } catch {
      notify("Copy failed — please copy manually.", "error");
    }
  };

  const share = async () => {
    const data = {
      title: "Join EarnHub",
      text: "Earn money watching videos and inviting friends on EarnHub.",
      url,
    };
    const nav = navigator as Navigator & {
      share?: (d: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share(data);
        notify("Shared successfully.", "success");
      } catch {
        /* user cancelled */
      }
    } else {
      void copy(url, "Referral link");
    }
  };

  const whatsapp = () => {
    const msg = encodeURIComponent(
      `Join me on EarnHub and earn money watching videos! ${url}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const mine = useMemo(
    () => referrals.filter((r) => r.referrerId === currentUser.id),
    [referrals, currentUser.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.refereeName.toLowerCase().includes(q) ||
        r.refereeEmail.toLowerCase().includes(q)
      );
    });
  }, [mine, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.h1}>Referrals</h1>
          <p className={styles.sub}>
            Invite friends and earn {formatMoney(REFERRAL_REWARD)} per
            successful referral.
          </p>
        </div>
      </div>

      <div className={styles.statRow}>
        <div className={styles.miniStat}>
          <Award size={16} />
          <div>
            <div className={styles.miniLabel}>Reward per referral</div>
            <div className={styles.miniValue}>
              {formatMoney(REFERRAL_REWARD)}
            </div>
          </div>
        </div>
        <div className={styles.miniStat}>
          <Users size={16} />
          <div>
            <div className={styles.miniLabel}>Successful</div>
            <div className={styles.miniValue}>{t.successfulReferrals}</div>
          </div>
        </div>
        <div className={styles.miniStat}>
          <Clock size={16} />
          <div>
            <div className={styles.miniLabel}>Pending</div>
            <div className={styles.miniValue}>{t.pendingReferrals}</div>
          </div>
        </div>
        <div className={styles.miniStat}>
          <Wallet size={16} />
          <div>
            <div className={styles.miniLabel}>Referral earnings</div>
            <div className={styles.miniValue}>
              {formatMoney(t.referralEarnings)}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Your referral link"
          subtitle="Share this link to invite new members"
        />
        <div className={styles.linkBlock}>
          <div className={styles.codeRow}>
            <span className={styles.codeLabel}>Code</span>
            <code className={styles.code}>{currentUser.referralCode}</code>
            <button
              className={styles.iconBtn}
              onClick={() => copy(currentUser.referralCode, "Referral code")}
              aria-label="Copy referral code"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className={styles.urlRow}>
            <TextInput
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copy(url, "Referral link")}
                icon={<Copy size={14} />}
              >
                Copy
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={share}
                icon={<Share2 size={14} />}
              >
                Share
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={whatsapp}
                icon={<MessageCircle size={14} />}
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Referral records"
          subtitle={`${filtered.length} referrals`}
          action={
            <div className={styles.filters}>
              <TextInput
                placeholder="Search name or email…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              <SelectInput
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as typeof status);
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="SUCCESSFUL">Successful</option>
                <option value="PENDING">Pending</option>
              </SelectInput>
            </div>
          }
        />

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Date</th>
                <th>Status</th>
                <th className={styles.right}>Reward</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Name">{r.refereeName}</td>
                  <td data-label="Email">{r.refereeEmail}</td>
                  <td data-label="Date">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td data-label="Status">
                    <Badge tone={statusTone(r.status)}>
                      {humanizeStatus(r.status)}
                    </Badge>
                  </td>
                  <td data-label="Reward" className={styles.right}>
                    {r.status === "SUCCESSFUL"
                      ? formatMoney(r.rewardAmount)
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="No referrals match your filters"
                      message="Try adjusting the search or status filter."
                    />
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
    </div>
  );
}
