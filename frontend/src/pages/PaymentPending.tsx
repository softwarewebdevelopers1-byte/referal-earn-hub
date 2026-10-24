import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { ApiError, paymentApi } from "../api/client";
import { useApp } from "../context/AppContext";
import { Button, Card, Field, TextInput } from "../components/ui";
import { formatMoney } from "../data/format";
import styles from "./PaymentStatus.module.css";

export function PaymentPending() {
  const { currentUser, payments, logout, notify, refreshUser, platformConfig } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Your payment is being processed. Please wait while we confirm your payment.",
  );
  const [polling, setPolling] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);

  useEffect(() => {
    if (currentUser?.phone) setPhone(currentUser.phone);
  }, [currentUser?.phone]);

  const reference = (location.state as { reference?: string } | null)?.reference ?? payments[0]?.reference;

  useEffect(() => {
    if (!currentUser || !reference) {
      setPolling(false);
      return;
    }

    let stopped = false;
    let timer: number | undefined;
    const startedAt = Date.now();
    const poll = async () => {
      try {
        const result = await paymentApi.status(reference);
        if (stopped) return;
        setStatusMessage(result.message);

        if (result.paymentStatus === "SUCCESS") {
          setPolling(false);
          if (result.canAccessDashboard) {
            await refreshUser();
            if (!stopped) navigate("/dashboard", { replace: true });
          }
          return;
        }
        if (result.paymentStatus === "FAILED" || result.paymentStatus === "CANCELLED") {
          setPolling(false);
          await refreshUser().catch(() => undefined);
          if (!stopped) navigate("/payment-rejected", { replace: true });
          return;
        }
        if (result.paymentStatus === "REVIEW_REQUIRED") {
          setPolling(false);
          return;
        }
        if (Date.now() - startedAt >= 120000) {
          setPolling(false);
          setTimedOut(true);
          return;
        }
        timer = window.setTimeout(() => void poll(), 4000);
      } catch (error) {
        if (stopped) return;
        setStatusMessage(error instanceof ApiError ? error.message : "We could not check the payment status yet.");
        if (Date.now() - startedAt >= 120000) {
          setPolling(false);
          setTimedOut(true);
          return;
        }
        timer = window.setTimeout(() => void poll(), 5000);
      }
    };

    void poll();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [currentUser?.id, navigate, pollNonce, reference, refreshUser]);
  if (!currentUser) return null;
  const payment = payments[0];

  const sendPromptAgain = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 9) {
      setRetryError("Enter a valid M-Pesa phone number.");
      return;
    }

    setRetryError("");
    setRetrying(true);
    try {
      const retriedPayment = await paymentApi.initiate(normalizedPhone);
      notify(
        `A new M-Pesa prompt was sent. Reference: ${retriedPayment.internalReference}.`,
        "success",
      );
      try {
        await refreshUser();
      } catch {
        notify("The prompt was sent, but status could not be refreshed. Use Refresh status to check again.", "info");
      }
      navigate("/payment-pending", { replace: true, state: { reference: retriedPayment.internalReference } });
    } catch (error) {
      setRetryError(error instanceof ApiError ? error.message : "Could not send another payment prompt.");
    } finally {
      setRetrying(false);
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
            <Clock size={22} />
          </div>
          <div>
            <h1 className={styles.title}>Payment processing</h1>
            <p className={styles.subtitle}>
              {statusMessage}
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
                <code>{reference ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>Amount submitted</dt>
              <dd>{payment ? formatMoney(payment.amount) : platformConfig ? formatMoney(platformConfig.activationAmount) : "—"}</dd>
            </div>
            <div>
              <dt>Submitted on</dt>
              <dd>
                {payment?.submittedAt
                  ? new Date(payment.submittedAt).toLocaleString()
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

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Did not receive the prompt?</h2>
          <p className={styles.subtitle}>
            You can send the payment prompt again while this payment is still pending. A successful payment cannot be submitted again.
          </p>
          <form onSubmit={sendPromptAgain} noValidate>
            <Field label="M-Pesa phone number" error={retryError} hint="Use the number that should receive the prompt.">
              <TextInput
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                placeholder="+254 712 345 678"
              />
            </Field>
            <Button type="submit" loading={retrying} full>
              {retrying ? "Sending prompt…" : "Send prompt again"}
            </Button>
          </form>
        </Card>

        <div className={styles.actions}>
          {timedOut && (
            <p className={styles.subtitle}>
              We have not received final confirmation yet. Your payment may still be processing. Please check your payment status again shortly.
            </p>
          )}
          <button
            className={styles.refreshBtn}
            disabled={refreshing || polling}
            onClick={async () => {
              setRefreshing(true);
              setTimedOut(false);
              setPolling(true);
              setPollNonce((value) => value + 1);
              try {
                await refreshUser();
                notify("Payment status re-checked.", "info");
              } catch (error) {
                notify(error instanceof Error ? error.message : "Could not refresh payment status.", "error");
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw size={16} /> {refreshing ? "Checking…" : "Refresh status"}
          </button>
          <Link to="/login" className={styles.linkBtn}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
