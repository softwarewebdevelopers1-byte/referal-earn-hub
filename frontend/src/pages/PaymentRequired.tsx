import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, LogOut } from "lucide-react";
import { ApiError, paymentApi } from "../api/client";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../data/format";
import { Button, Field, TextInput, Card } from "../components/ui";
import styles from "./PaymentStatus.module.css";

export function PaymentRequired() {
  const { currentUser, logout, notify, refreshUser, platformConfig } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.phone) setPhone(currentUser.phone);
  }, [currentUser?.phone]);

  if (!currentUser) return null;

  const rejectionNote =
    currentUser.paymentStatus === "REJECTED"
      ? currentUser.paymentRejectionReason
      : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid M-Pesa phone number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payment = await paymentApi.initiate(phone.replace(/\D/g, ""));
      notify(
        `Payment initiated. Reference: ${payment.internalReference}. Check your phone for the M-Pesa prompt.`,
        "success",
      );
      try {
        await refreshUser();
      } catch {
        notify(
          "The payment request was accepted, but its status could not be refreshed. Use Refresh status on the next page to check again.",
          "info",
        );
      }
      navigate("/payment-pending", { state: { reference: payment.internalReference } });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not initiate payment.",
      );
    } finally {
      setLoading(false);
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
                ? "Your previous payment was rejected. Review the reason below, then start a new activation payment."
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
                Send <strong>{platformConfig ? formatMoney(platformConfig.activationAmount) : "the configured activation fee"}</strong> via M-Pesa or
                bank transfer.
              </li>
              <li>Use your full name as the payment account name.</li>
              <li>
                <strong>M-Pesa STK push</strong> will be sent to the number below.
              </li>
              <li>Enter the phone number registered for M-Pesa.</li>
              <li>Confirm the payment prompt on your phone.</li>
            </ol>
            <div className={styles.note}>
              <ShieldCheck size={16} />
              <span>
                A payment request is sent to the backend and processed by the configured payment provider.
              </span>
            </div>
          </Card>

          <Card className={styles.formCard}>
            <h2 className={styles.sectionTitle}>Start activation payment</h2>
            <form onSubmit={handleSubmit} noValidate>
              <Field label="M-Pesa phone number" error={error} hint="Use the number that should receive the payment prompt.">
                <TextInput
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                />
              </Field>
              <Button type="submit" full size="lg" loading={loading}>
                Send payment prompt
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
