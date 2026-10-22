import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { X, Inbox } from "lucide-react";
import styles from "./ui.module.css";

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  full,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        styles.btn,
        styles[`btn_${variant}`],
        styles[`btn_${size}`],
        full ? styles.btnFull : "",
        className ?? "",
      ].join(" ")}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.card} ${className ?? ""}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.cardHeader}>
      <div>
        <h3 className={styles.cardTitle}>{title}</h3>
        {subtitle && <p className={styles.cardSub}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (["PAID", "SUCCESSFUL", "COMPLETED", "ACTIVE"].includes(s))
    return "success";
  if (["PAYMENT_PENDING", "PAYMENT_REVIEW", "PENDING"].includes(s))
    return "warning";
  if (["REJECTED", "FAILED", "SUSPENDED"].includes(s)) return "danger";
  if (["UNPAID"].includes(s)) return "info";
  return "neutral";
}

export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ---------- Inputs ---------- */
interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}
export function Field({ label, error, hint, children, htmlFor }: FieldProps) {
  return (
    <label className={styles.field} htmlFor={htmlFor}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && !error && <span className={styles.fieldHint}>{hint}</span>}
      {error && (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`${styles.input} ${className ?? ""}`}
      {...rest}
    />
  );
});

export const SelectInput = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function SelectInput({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={`${styles.input} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </select>
  );
});

/* ---------- Modal ---------- */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles[`modal_${size}`]}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        ref={ref}
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className={styles.empty}>
      <Inbox size={36} />
      <p className={styles.emptyTitle}>{title}</p>
      {message && <p className={styles.emptyMsg}>{message}</p>}
    </div>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className={styles.pagination}>
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className={styles.pageLabel}>
        Page {page} of {pageCount}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
