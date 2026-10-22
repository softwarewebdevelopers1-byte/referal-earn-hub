import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Field, TextInput } from "../components/ui";
import { useApp } from "../context/AppContext";
import styles from "./Login.module.css";

export function ForgotPassword() {
  const { notify } = useApp();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSent(true);
    notify(
      "If an account exists, a reset link has been sent (simulated).",
      "info",
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>E</div>
          <div>
            <h1 className={styles.brandName}>Reset password</h1>
          </div>
        </div>
        {sent ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            If an account exists for <strong>{email}</strong>, you will receive
            reset instructions shortly.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginBottom: "var(--space-5)",
              }}
            >
              Enter the email linked to your account and we’ll send you reset
              instructions.
            </p>
            <Field label="Email address">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" full size="lg">
              Send reset link
            </Button>
          </form>
        )}
        <p className={styles.footer}>
          <Link to="/login" className={styles.link}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
