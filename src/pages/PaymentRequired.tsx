import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, Copy, LogOut } from "lucide-react";
import { useApp } from "../context/AppContext";
import { PLATFORM_FEE, formatMoney } from "../data/dummyData";
import { Button, Field, TextInput, SelectInput, Card } from "../components/ui";
import styles from "./PaymentStatus.module.css";

export function PaymentRequired() {
  const { currentUser, submitPayment, logout, notify } = useApp();
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("M-Pesa");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  const rejectionNote =
    currentUser.paymentStatus === "REJECTED"
      ? currentUser.paymentRejectionReason
      : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (reference.trim().length < 6) {
      setErr(
        "Enter the payment reference shown in your M-Pesa or bank message.",
      );
      return;
    }
    setErr("");
    setLoading(true);
    window.setTimeout(() => {
      submitPayment(currentUser.id, reference.trim(), method);
      setLoading(false);
      navigate("/payment-pending");
    }, 500);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied.`, "success");
    } catch {
      notify("Copy failed. Please copy manually.", "error");
    }
  };

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
            <Lock size={22} />
          </div>
          <div>
            <h1 className={styles.title}>Unlock your earnings dashboard</h1>
            <p className={styles.subtitle}>
              {rejectionNote
                ? "Your previous payment was rejected. Review the reason below, then resubmit your evidence."
                : "Submit your one-time activation payment to unlock referrals, video earnings, and your full dashboard."}
            </p>
          </div>
        </div>

        {rejectionNote && (
          <div className={styles.rejectBanner}>
            <strong>Rejection reason:</strong> {rejectionNote}
          </div>
        )}

        <div className={styles.grid}>
          <Card className={styles.infoCard}>
            <h2 className={styles.sectionTitle}>Payment instructions</h2>
            <ol className={styles.steps}>
              <li>
                Send <strong>{formatMoney(PLATFORM_FEE)}</strong> via M-Pesa or
                bank transfer.
              </li>
              <li>Use your full name as the payment account name.</li>
              <li>
                Pay to: <br />
                <strong>M-Pesa Paybill 247247</strong> · Account{" "}
                <strong>EARNHUB</strong>
                <button
                  className={styles.copyBtn}
                  type="button"
                  onClick={() => copy("247247", "Paybill")}
                  aria-label="Copy paybill"
                >
                  <Copy size={14} />
                </button>
              </li>
              <li>
                Copy the confirmation code (e.g. <code>QAB1XYZ23</code>) from
                your SMS.
              </li>
              <li>Paste it in the form and submit for review.</li>
            </ol>
            <div className={styles.note}>
              <ShieldCheck size={16} />
              <span>
                This is a frontend demonstration. No real payment is processed.
              </span>
            </div>
          </Card>

          <Card className={styles.formCard}>
            <h2 className={styles.sectionTitle}>Submit payment evidence</h2>
            <form onSubmit={handleSubmit} noValidate>
              <Field label="Payment method">
                <SelectInput
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Airtel Money">Airtel Money</option>
                </SelectInput>
              </Field>
              <Field
                label="Payment reference"
                error={err}
                hint="Found in your confirmation SMS or bank receipt."
              >
                <TextInput
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. QAB1XYZ23"
                />
              </Field>
              <Button type="submit" full size="lg" loading={loading}>
                Submit for review
              </Button>
            </form>
            <p className={styles.smallNote}>
              Your account status:{" "}
              <strong>{currentUser.paymentStatus.replace("_", " ")}</strong>
            </p>
          </Card>
        </div>

        <p className={styles.help}>
          Need help? <Link to="/login">Return to sign in</Link>
        </p>
      </div>
    </div>
  );
}
