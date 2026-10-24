import { useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  History,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Moon,
  Sun,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ErrorState } from "../components/ui";
import styles from "./DashboardLayout.module.css";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/payment-history", label: "Payment history", icon: History },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout, theme, toggleTheme, dataError, retryLoad, loading } = useApp();
  const [open, setOpen] = useState(false);
  const isDark = theme === "dark";
  if (!currentUser) return null;

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>E</div>
          <div>
            <div className={styles.brandName}>EarnHub</div>
            <div className={styles.brandTag}>Admin console</div>
          </div>
          <button
            className={styles.mobileClose}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className={styles.nav}>
          {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ""}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <Link to="/dashboard" className={styles.adminLink}>
            <ArrowLeft size={16} /> Back to app
          </Link>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{currentUser.avatarSeed}</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{currentUser.name}</div>
              <div className={styles.userEmail}>{currentUser.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
      )}

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            className={styles.menuBtn}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className={styles.headerTitle}>Admin console</div>
          <div className={styles.headerActions}>
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label={
                isDark ? "Switch to light theme" : "Switch to dark theme"
              }
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className={styles.avatarSm}>{currentUser.avatarSeed}</div>
          </div>
        </header>
        <main className={styles.content}>
          {dataError && <ErrorState message={dataError} onRetry={retryLoad} retrying={loading} />}
          {children}
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="Admin mobile navigation">
        {ADMIN_NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.bottomLink} ${isActive ? styles.bottomActive : ""}`
            }
          >
            <Icon size={20} />
            <span>{label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
