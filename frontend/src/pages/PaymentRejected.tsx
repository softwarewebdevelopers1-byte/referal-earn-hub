import { Link, useNavigate } from "react-router-dom";
import { XCircle, LogOut } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Card } from "../components/ui";
import styles from "./PaymentStatus.module.css";

export function PaymentRejected() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
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
          <div className={`${styles.heroIcon} ${styles.heroDanger}`}>
            <XCircle size={22} />
          </div>
          <div>
            <h1 className={styles.title}>Payment rejected</h1>
            <p className={styles.subtitle}>
              Your payment submission could not be verified. Review the reason
              below and start a new activation payment.
            </p>
          </div>
        </div>

        <Card className={styles.infoCard}>
          <h2 className={styles.sectionTitle}>Reason</h2>
          <p className={styles.reason}>
            {currentUser.paymentRejectionReason ??
              "The payment reference could not be matched to an incoming payment."}
          </p>
          <div className={styles.actions}>
            <Button onClick={() => navigate("/payment-required")}>
              Resubmit payment
            </Button>
            <Link to="/login" className={styles.linkBtn}>
              Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
