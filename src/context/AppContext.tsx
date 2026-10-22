import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  REFERRAL_REWARD,
  seedPayments,
  seedReferrals,
  seedTransactions,
  seedUsers,
} from "../data/dummyData";
import type {
  Notification,
  PaymentRecord,
  PaymentStatus,
  Referral,
  Transaction,
  User,
  VideoCompletion,
} from "../types";

const STORAGE_KEY = "earnhub_demo_state_v1";

interface PersistShape {
  users: User[];
  payments: PaymentRecord[];
  referrals: Referral[];
  transactions: Transaction[];
  completions: Record<string, VideoCompletion[]>;
  currentUserId: string | null;
  theme: "light" | "dark";
}

interface AppState extends PersistShape {
  notifications: Notification[];
}

interface AppContextValue extends AppState {
  currentUser: User | null;
  login: (
    email: string,
    password: string,
  ) => { ok: boolean; user?: User; error?: string };
  logout: () => void;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    referralCode?: string;
  }) => { ok: boolean; error?: string };
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
  notify: (message: string, kind?: Notification["kind"]) => void;
  dismissNotification: (id: string) => void;
  submitPayment: (userId: string, reference: string, method: string) => void;
  approvePayment: (paymentId: string) => void;
  rejectPayment: (paymentId: string, reason: string) => void;
  completeVideo: (videoId: string, reward: number, title: string) => void;
  requestWithdrawal: (amount: number) => void;
  updateProfile: (patch: Partial<Pick<User, "name" | "phone">>) => void;
  toggleUserSuspension: (userId: string) => void;
  isVideoCompleted: (userId: string, videoId: string) => boolean;
  totalsForUser: (userId: string) => {
    referralEarnings: number;
    videoEarnings: number;
    totalEarnings: number;
    successfulReferrals: number;
    pendingReferrals: number;
    videosWatched: number;
    withdrawn: number;
    pendingEarnings: number;
    availableBalance: number;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

function loadState(): AppState {
  const fallback: AppState = {
    users: seedUsers,
    payments: seedPayments,
    referrals: seedReferrals,
    transactions: seedTransactions,
    completions: {
      u1: [
        { videoId: "v1", completedAt: new Date(2024, 8, 15).toISOString() },
        { videoId: "v3", completedAt: new Date(2024, 8, 22).toISOString() },
      ],
    },
    currentUserId: null,
    theme: "light",
    notifications: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.payments))
      return fallback;
    return {
      users: parsed.users,
      payments: parsed.payments,
      referrals: Array.isArray(parsed.referrals)
        ? parsed.referrals
        : seedReferrals,
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : seedTransactions,
      completions: parsed.completions ?? {},
      currentUserId: parsed.currentUserId ?? null,
      theme: parsed.theme === "dark" ? "dark" : "light",
      notifications: [],
    };
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  // Persist demo state
  useEffect(() => {
    const persist: PersistShape = {
      users: state.users,
      payments: state.payments,
      referrals: state.referrals,
      transactions: state.transactions,
      completions: state.completions,
      currentUserId: state.currentUserId,
      theme: state.theme,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    } catch {
      /* ignore quota */
    }
  }, [state]);

  // Apply theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  const notify = useCallback(
    (message: string, kind: Notification["kind"] = "info") => {
      const id = `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      setState((s) => ({
        ...s,
        notifications: [...s.notifications, { id, message, kind }],
      }));
      window.setTimeout(() => {
        setState((s) => ({
          ...s,
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
      }, 4000);
    },
    [],
  );

  const dismissNotification = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      const user = state.users.find(
        (u) => u.email.toLowerCase() === normalized,
      );
      if (!user)
        return { ok: false, error: "No account found with that email." };
      if (user.password !== password)
        return { ok: false, error: "Incorrect password." };
      if (user.accountStatus === "SUSPENDED")
        return { ok: false, error: "This account has been suspended." };
      setState((s) => ({ ...s, currentUserId: user.id }));
      return { ok: true, user };
    },
    [state.users],
  );
  const logout = useCallback(() => {
    setState((s) => ({ ...s, currentUserId: null }));
  }, []);

  const register: AppContextValue["register"] = useCallback(
    (data) => {
      if (data.password.length < 8)
        return { ok: false, error: "Password must be at least 8 characters." };
      const exists = state.users.some(
        (u) => u.email.toLowerCase() === data.email.toLowerCase(),
      );
      if (exists)
        return {
          ok: false,
          error: "An account with that email already exists.",
        };

      const newUser: User = {
        id: `u${Date.now()}`,
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
        role: "USER",
        paymentStatus: "UNPAID",
        accountStatus: "ACTIVE",
        referralCode: `LRN${Math.floor(10000 + Math.random() * 89999)}`,
        referredByCode: data.referralCode?.trim() || null,
        createdAt: new Date().toISOString(),
        avatarSeed: data.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
      };

      setState((s) => {
        const users = [...s.users, newUser];
        let referrals = s.referrals;
        if (data.referralCode) {
          const referrer = s.users.find(
            (u) => u.referralCode === data.referralCode,
          );
          if (referrer) {
            referrals = [
              ...referrals,
              {
                id: `r${Date.now()}`,
                referrerId: referrer.id,
                refereeId: newUser.id,
                refereeName: newUser.name,
                refereeEmail: newUser.email,
                createdAt: new Date().toISOString(),
                status: "PENDING",
                rewardAmount: 0,
                rewardCredited: false,
              },
            ];
          }
        }
        return { ...s, users, referrals, currentUserId: newUser.id };
      });
      return { ok: true };
    },
    [state.users],
  );

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === "light" ? "dark" : "light" }));
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setState((s) => ({ ...s, theme: t }));
  }, []);

  const submitPayment = useCallback(
    (userId: string, reference: string, method: string) => {
      setState((s) => {
        const user = s.users.find((u) => u.id === userId);
        if (!user) return s;
        const payment: PaymentRecord = {
          id: `p${Date.now()}`,
          userId,
          userName: user.name,
          userEmail: user.email,
          reference,
          amount: 500,
          method,
          submittedAt: new Date().toISOString(),
          status: "PAYMENT_PENDING",
        };
        const users = s.users.map((u) =>
          u.id === userId
            ? {
                ...u,
                paymentStatus: "PAYMENT_PENDING" as PaymentStatus,
                paymentReference: reference,
                paymentSubmittedAt: payment.submittedAt,
              }
            : u,
        );
        const tx: Transaction = {
          id: `t${Date.now()}`,
          ref: `TXN-${Date.now().toString().slice(-6)}`,
          userId,
          userName: user.name,
          type: "PAYMENT_SUBMISSION",
          description: `Payment submitted via ${method}`,
          amount: 500,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        };
        return {
          ...s,
          users,
          payments: [payment, ...s.payments],
          transactions: [tx, ...s.transactions],
        };
      });
      notify("Payment submitted for review.", "success");
    },
    [notify],
  );

  const approvePayment = useCallback(
    (paymentId: string) => {
      setState((s) => {
        const payment = s.payments.find((p) => p.id === paymentId);
        if (!payment || payment.status === "PAID") return s;

        const users = s.users.map((u) =>
          u.id === payment.userId
            ? {
                ...u,
                paymentStatus: "PAID" as PaymentStatus,
                paymentRejectionReason: undefined,
              }
            : u,
        );
        const payments = s.payments.map((p) =>
          p.id === paymentId ? { ...p, status: "PAID" as PaymentStatus } : p,
        );

        // Credit referral if this user was referred and not yet credited
        let referrals = s.referrals;
        let transactions = s.transactions;
        const referral = s.referrals.find(
          (r) => r.refereeId === payment.userId && !r.rewardCredited,
        );
        if (referral) {
          referrals = s.referrals.map((r) =>
            r.id === referral.id
              ? {
                  ...r,
                  status: "SUCCESSFUL" as const,
                  rewardAmount: REFERRAL_REWARD,
                  rewardCredited: true,
                }
              : r,
          );
          const referrer = s.users.find((u) => u.id === referral.referrerId);
          transactions = [
            {
              id: `t${Date.now()}`,
              ref: `TXN-${Date.now().toString().slice(-6)}`,
              userId: referral.referrerId,
              userName: referrer?.name ?? "Referrer",
              type: "REFERRAL_REWARD" as const,
              description: `Referral reward for ${referral.refereeName}`,
              amount: REFERRAL_REWARD,
              status: "COMPLETED" as const,
              createdAt: new Date().toISOString(),
            },
            ...transactions,
          ];
        }

        return { ...s, users, payments, referrals, transactions };
      });
      notify("Payment approved and referral reward processed.", "success");
    },
    [notify],
  );

  const rejectPayment = useCallback(
    (paymentId: string, reason: string) => {
      setState((s) => {
        const payment = s.payments.find((p) => p.id === paymentId);
        if (!payment) return s;
        const users = s.users.map((u) =>
          u.id === payment.userId
            ? {
                ...u,
                paymentStatus: "REJECTED" as PaymentStatus,
                paymentRejectionReason: reason,
              }
            : u,
        );
        const payments = s.payments.map((p) =>
          p.id === paymentId
            ? { ...p, status: "REJECTED" as PaymentStatus, reviewNote: reason }
            : p,
        );
        return { ...s, users, payments };
      });
      notify("Payment rejected.", "error");
    },
    [notify],
  );

  const completeVideo = useCallback(
    (videoId: string, reward: number, title: string) => {
      setState((s) => {
        const uid = s.currentUserId;
        if (!uid) return s;
        const existing = s.completions[uid] ?? [];
        if (existing.some((c) => c.videoId === videoId)) return s;
        const completions = {
          ...s.completions,
          [uid]: [
            ...existing,
            { videoId, completedAt: new Date().toISOString() },
          ],
        };
        const user = s.users.find((u) => u.id === uid);
        const tx: Transaction = {
          id: `t${Date.now()}`,
          ref: `TXN-${Date.now().toString().slice(-6)}`,
          userId: uid,
          userName: user?.name ?? "User",
          type: "VIDEO_REWARD",
          description: `Video reward: ${title}`,
          amount: reward,
          status: "COMPLETED",
          createdAt: new Date().toISOString(),
        };
        return { ...s, completions, transactions: [tx, ...s.transactions] };
      });
      notify(`Reward credited: ${title}`, "success");
    },
    [notify],
  );

  const requestWithdrawal = useCallback(
    (amount: number) => {
      setState((s) => {
        const uid = s.currentUserId;
        if (!uid) return s;
        const user = s.users.find((u) => u.id === uid);
        const tx: Transaction = {
          id: `t${Date.now()}`,
          ref: `TXN-${Date.now().toString().slice(-6)}`,
          userId: uid,
          userName: user?.name ?? "User",
          type: "WITHDRAWAL",
          description: "Withdrawal to M-Pesa",
          amount: -Math.abs(amount),
          status: "PENDING",
          createdAt: new Date().toISOString(),
        };
        return { ...s, transactions: [tx, ...s.transactions] };
      });
      notify("Withdrawal request submitted (simulated).", "success");
    },
    [notify],
  );

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "phone">>) => {
      setState((s) => {
        const uid = s.currentUserId;
        if (!uid) return s;
        return {
          ...s,
          users: s.users.map((u) => (u.id === uid ? { ...u, ...patch } : u)),
        };
      });
      notify("Profile updated.", "success");
    },
    [notify],
  );

  const toggleUserSuspension = useCallback(
    (userId: string) => {
      setState((s) => {
        if (userId === s.currentUserId) {
          return s;
        }
        return {
          ...s,
          users: s.users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  accountStatus:
                    u.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                }
              : u,
          ),
        };
      });
      notify("User account status changed.", "info");
    },
    [notify],
  );

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId],
  );

  const isVideoCompleted = useCallback(
    (userId: string, videoId: string) =>
      (state.completions[userId] ?? []).some((c) => c.videoId === videoId),
    [state.completions],
  );

  const totalsForUser = useCallback(
    (userId: string) => {
      const referrals = state.referrals.filter((r) => r.referrerId === userId);
      const successful = referrals.filter((r) => r.status === "SUCCESSFUL");
      const pending = referrals.filter((r) => r.status === "PENDING");
      const referralEarnings = successful.reduce(
        (sum, r) => sum + r.rewardAmount,
        0,
      );

      const videoTxs = state.transactions.filter(
        (t) =>
          t.userId === userId &&
          t.type === "VIDEO_REWARD" &&
          t.status === "COMPLETED",
      );
      const videoEarnings = videoTxs.reduce((sum, t) => sum + t.amount, 0);
      const videosWatched = (state.completions[userId] ?? []).length;

      const withdrawn = state.transactions
        .filter(
          (t) =>
            t.userId === userId &&
            t.type === "WITHDRAWAL" &&
            t.status === "COMPLETED",
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const pendingEarnings = state.transactions
        .filter(
          (t) =>
            t.userId === userId &&
            t.status === "PENDING" &&
            t.type !== "WITHDRAWAL",
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const totalEarnings = referralEarnings + videoEarnings;
      const availableBalance = totalEarnings - withdrawn;

      return {
        referralEarnings,
        videoEarnings,
        totalEarnings,
        successfulReferrals: successful.length,
        pendingReferrals: pending.length,
        videosWatched,
        withdrawn,
        pendingEarnings,
        availableBalance,
      };
    },
    [state.referrals, state.transactions, state.completions],
  );

  const value: AppContextValue = {
    ...state,
    currentUser,
    login,
    logout,
    register,
    toggleTheme,
    setTheme,
    notify,
    dismissNotification,
    submitPayment,
    approvePayment,
    rejectPayment,
    completeVideo,
    requestWithdrawal,
    updateProfile,
    toggleUserSuspension,
    isVideoCompleted,
    totalsForUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
