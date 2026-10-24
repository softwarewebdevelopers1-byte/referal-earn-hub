import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import styles from "./Notifications.module.css";

export function NotificationHost() {
  const { notifications, dismissNotification } = useApp();
  if (notifications.length === 0) return null;
  return (
    <div className={styles.host} role="status" aria-live="polite">
      {notifications.map((n) => {
        const Icon =
          n.kind === "success"
            ? CheckCircle2
            : n.kind === "error"
              ? XCircle
              : Info;
        return (
          <div key={n.id} className={`${styles.toast} ${styles[n.kind]}`}>
            <Icon size={18} />
            <span className={styles.msg}>{n.message}</span>
            <button
              className={styles.close}
              onClick={() => dismissNotification(n.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
