import type { ReactNode } from "react";
import styles from "./StatCard.module.css";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  change?: string;
  hint?: string;
  accent?: boolean;
}

export function StatCard({
  icon,
  label,
  value,
  change,
  hint,
  accent,
}: StatCardProps) {
  return (
    <div className={`${styles.card} ${accent ? styles.accent : ""}`}>
      <div className={styles.top}>
        <div className={styles.icon}>{icon}</div>
        {change && <span className={styles.change}>{change}</span>}
      </div>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}
