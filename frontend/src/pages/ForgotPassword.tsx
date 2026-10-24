import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, authApi } from "../api/client";
import { Button, Field, TextInput } from "../components/ui";
import { useApp } from "../context/AppContext";
import styles from "./Login.module.css";

export function ForgotPassword() {
  const { notify } = useApp();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      notify("If an account exists, reset instructions have been sent.", "info");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not request a reset link.");
    } finally {
      setLoading(false);
    }
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
            {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>}
            <Button type="submit" full size="lg" loading={loading}>
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
