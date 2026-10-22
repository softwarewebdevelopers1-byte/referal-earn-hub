import { useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Home,
  Users,
  PlayCircle,
  Wallet,
  Receipt,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import styles from "./DashboardLayout.module.css";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/videos", label: "Videos", icon: PlayCircle },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout, theme, toggleTheme } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === "dark";

  if (!currentUser) return null;

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brand}>
          <div className={styles.brandMark}>E</div>
          <div>
            <div className={styles.brandName}>EarnHub</div>
            <div className={styles.brandTag}>Referral & Video</div>
          </div>
          <button
            className={styles.mobileClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {currentUser.role === "ADMIN" && (
            <Link to="/admin" className={styles.adminLink}>
              <ShieldCheck size={16} /> Admin panel
            </Link>
          )}
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

      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
      )}

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className={styles.headerTitle}>
            Hello, {currentUser.name.split(" ")[0]}
          </div>
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

        <main className={styles.content}>{children}</main>
      </div>

      <nav className={styles.bottomNav} aria-label="Primary mobile navigation">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.bottomLink} ${isActive ? styles.bottomActive : ""}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
