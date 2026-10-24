import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, authApi } from "../api/client";
import { Button, Field, TextInput } from "../components/ui";
import styles from "./Login.module.css";

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      navigate("/login", { replace: true, state: { message: "Password reset. Sign in with your new password." } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset the password.");
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
            <h1 className={styles.brandName}>Set a new password</h1>
            <p className={styles.tagline}>Choose a new password for your EarnHub account</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate>
          <Field label="New password">
            <TextInput type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password" error={error}>
            <TextInput type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" full size="lg" loading={loading}>Reset password</Button>
        </form>
        <p className={styles.footer}><Link to="/login" className={styles.link}>Back to sign in</Link></p>
      </div>
    </div>
  );
}
