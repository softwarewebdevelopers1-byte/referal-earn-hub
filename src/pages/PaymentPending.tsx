import { Link } from "react-router-dom";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "../components/ui";
import { formatMoney, PLATFORM_FEE } from "../data/dummyData";
import styles from "./PaymentStatus.module.css";

export function PaymentPending() {
  const { currentUser, logout, notify } = useApp();
  if (!currentUser) return null;

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div className={styles.brandMini}>
          <div className={styles.brandMark}>E</div>
          <span>EarnHub</span>
        </div>
        <button className={styles.logoutLink} onClick={logout}>
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.heroIcon}>
            <Clock size={22} />
          </div>
          <div>
            <h1 className={styles.title}>Payment under review</h1>
            <p className={styles.subtitle}>
              We've received your payment submission. An admin will review it
              shortly and unlock your dashboard automatically.
            </p>
          </div>
        </div>

        <Card className={styles.infoCard}>
          <h2 className={styles.sectionTitle}>Submission details</h2>
          <dl className={styles.dl}>
            <div>
              <dt>Account holder</dt>
              <dd>{currentUser.name}</dd>
            </div>
            <div>
              <dt>Reference number</dt>
              <dd>
                <code>{currentUser.paymentReference ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>Amount submitted</dt>
              <dd>{formatMoney(PLATFORM_FEE)}</dd>
            </div>
            <div>
              <dt>Submitted on</dt>
              <dd>
                {currentUser.paymentSubmittedAt
                  ? new Date(currentUser.paymentSubmittedAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Current status</dt>
              <dd>
                <span className={styles.statusPill}>
                  {currentUser.paymentStatus.replace("_", " ")}
                </span>
              </dd>
            </div>
          </dl>
        </Card>

        <div className={styles.actions}>
          <button
            className={styles.refreshBtn}
            onClick={() => {
              notify("Status re-checked. Still pending.", "info");
            }}
          >
            <RefreshCw size={16} /> Refresh status
          </button>
          <Link to="/login" className={styles.linkBtn}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
