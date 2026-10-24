import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Field, TextInput } from "../components/ui";
import styles from "./Login.module.css";

export function Login() {
  const { login } = useApp();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required.";
    if (!password) next.password = "Password is required.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setLoading(true);
    const result = await login(email, password, remember);
    setLoading(false);
    if (!result.ok) {
      setErrors({ ...result.fieldErrors, form: result.error ?? "Login failed." });
      return;
    }
    // The router's RedirectIfAuthed will handle the redirect based on currentUser.
    // But we can navigate explicitly for a snappier UX:
    // Since currentUser updates asynchronously, use a small delay or rely on RedirectIfAuthed.
  };
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>E</div>
          <div>
            <h1 className={styles.brandName}>EarnHub</h1>
            <p className={styles.tagline}>Referral & Video Earnings Platform</p>
          </div>
        </div>

        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>
          Sign in to your account to continue earning.
        </p>

        {(location.state as { message?: string } | null)?.message && (
          <p className={styles.formError} style={{ color: "var(--success)" }} role="status">
            {(location.state as { message: string }).message}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Email address"
            error={errors.email}
            htmlFor="login-email"
          >
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <TextInput
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </Field>

          <Field label="Password" error={errors.password} htmlFor="login-pw">
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <TextInput
                id="login-pw"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.pwToggle}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <div className={styles.row}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className={styles.link}>
              Forgot password?
            </Link>
          </div>

          {errors.form && (
            <p className={styles.formError} role="alert">
              {errors.form}
            </p>
          )}

          <Button type="submit" full size="lg" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className={styles.footer}>
          New here?{" "}
          <Link to="/register" className={styles.link}>
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
}
