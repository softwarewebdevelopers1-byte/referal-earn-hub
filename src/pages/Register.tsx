import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Field, TextInput } from "../components/ui";
import styles from "./Login.module.css";

function strength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[score] ?? "Too short" };
}

export function Register() {
  const { register, notify } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefillRef = params.get("ref") ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    referralCode: prefillRef,
    terms: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefillRef) {
      setForm((f) => ({ ...f, referralCode: prefillRef }));
    }
  }, [prefillRef]);

  const pw = useMemo(() => strength(form.password), [form.password]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email.";
    if (form.phone.replace(/\D/g, "").length < 9)
      next.phone = "Enter a valid phone number.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.password !== form.confirm)
      next.confirm = "Passwords do not match.";
    if (!form.terms) next.terms = "You must accept the terms.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      const res = register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        referralCode: form.referralCode || undefined,
      });
      setLoading(false);
      if (!res.ok) {
        setErrors({ form: res.error ?? "Registration failed." });
        return;
      }
      notify(
        "Account created. Please submit your payment to unlock earnings.",
        "success",
      );
      navigate("/payment-required");
    }, 500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>E</div>
          <div>
            <h1 className={styles.brandName}>Create your account</h1>
            <p className={styles.tagline}>
              Join EarnHub and start earning today
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Full name" error={errors.name}>
            <TextInput
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </Field>

          <Field label="Email address" error={errors.email}>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Phone number" error={errors.phone}>
            <TextInput
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+254 712 345 678"
              autoComplete="tel"
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <div className={styles.inputWrap}>
              <TextInput
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
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
            {form.password && (
              <div style={{ marginTop: 6 }}>
                <div
                  style={{
                    height: 6,
                    background: "var(--surface-hover)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(pw.score / 5) * 100}%`,
                      background:
                        pw.score <= 1
                          ? "var(--danger)"
                          : pw.score <= 2
                            ? "var(--warning)"
                            : pw.score <= 3
                              ? "#ca8a04"
                              : "var(--success)",
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Strength: {pw.label}
                </p>
              </div>
            )}
          </Field>

          <Field label="Confirm password" error={errors.confirm}>
            <TextInput
              type="password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </Field>

          <Field
            label="Referral code (optional)"
            hint={
              prefillRef
                ? `You were invited with code ${prefillRef}`
                : "Enter a friend’s code to credit their referral."
            }
          >
            <TextInput
              value={form.referralCode}
              onChange={(e) => set("referralCode", e.target.value)}
              placeholder="LRN12345"
            />
          </Field>

          <label className={styles.check} style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => set("terms", e.target.checked)}
            />
            I agree to the Terms of Service and Privacy Policy
          </label>
          {errors.terms && (
            <p className={styles.formError} role="alert">
              {errors.terms}
            </p>
          )}
          {errors.form && (
            <p className={styles.formError} role="alert">
              {errors.form}
            </p>
          )}

          <Button type="submit" full size="lg" loading={loading}>
            Create account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
