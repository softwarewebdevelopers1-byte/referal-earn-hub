import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  adminApi,
  ApiError,
  authApi,
  clearToken,
  configApi,
  earningsApi,
  getToken,
  getRefreshToken,
  paymentApi,
  profileApi,
  referralApi,
  setToken,
  setAuthTokens,
  videoApi,
  withdrawalApi,
} from "../api/client";
import type {
  AdminPaymentRow,
  AdminTransactionRow,
  AdminUserRow,
  AdminDashboard,
  AppConfig,
  AuthResponse,
  EarningsSummary,
  LedgerEntry,
  Paginated,
  ReferralStats,
} from "../api/types";
import type {
  Notification,
  PaymentRecord,
  PaymentStatus,
  Referral,
  Transaction,
  TransactionStatus,
  TransactionType,
  User,
  Video,
  VideoCompletion,
} from "../types";

const THEME_KEY = "earnhub_theme";

interface AppContextValue {
  users: User[];
  payments: PaymentRecord[];
  referrals: Referral[];
  transactions: Transaction[];
  completions: Record<string, VideoCompletion[]>;
  videos: Video[];
  currentUser: User | null;
  loading: boolean;
  dataError: string | null;
  platformConfig: AppConfig | null;
  adminDashboard: AdminDashboard | null;
  theme: "light" | "dark";
  notifications: Notification[];
  login: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  logout: () => void;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    referralCode?: string;
  }) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  refreshUser: () => Promise<void>;
  retryLoad: () => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  notify: (message: string, kind?: Notification["kind"]) => void;
  dismissNotification: (id: string) => void;
  approvePayment: (paymentId: string) => Promise<void>;
  rejectPayment: (paymentId: string, reason: string) => Promise<void>;
  completeVideo: (videoId: string, reward: number, title: string) => Promise<void>;
  requestWithdrawal: (amount: number) => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, "name" | "phone">>) => Promise<void>;
  toggleUserSuspension: (userId: string) => Promise<void>;
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

function displayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function paymentStatus(status: string): PaymentStatus {
  switch (status) {
    case "SUCCESS": return "PAID";
    case "PENDING": return "UNPAID";
    case "PROCESSING": return "PAYMENT_PENDING";
    case "REVIEW_REQUIRED": return "PAYMENT_REVIEW";
    case "FAILED":
    case "CANCELLED": return "REJECTED";
    default: return "UNPAID";
  }
}

function paymentRecordStatus(status: string): PaymentStatus {
  return status === "PENDING" ? "PAYMENT_PENDING" : paymentStatus(status);
}

function mapUser(source: Partial<AuthResponse> & Record<string, unknown>): User {
  const name = displayName(String(source.firstName ?? ""), String(source.lastName ?? ""));
  return {
    id: String(source.userId ?? source.id ?? ""),
    name,
    email: String(source.email ?? ""),
    phone: String(source.phone ?? ""),
    password: "",
    role: String(source.role ?? "USER") as User["role"],
    paymentStatus: paymentStatus(String(source.paymentStatus ?? "")),
    accountStatus: String(source.accountStatus ?? "ACTIVE") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    accountActivated: Boolean(source.accountActivated ?? String(source.paymentStatus ?? "") === "SUCCESS"),
    canAccessDashboard: Boolean(source.canAccessDashboard ?? String(source.paymentStatus ?? "") === "SUCCESS"),
    referralCode: String(source.referralCode ?? ""),
    referredByCode: null,
    createdAt: String(source.createdAt ?? new Date().toISOString()),
    avatarSeed: initials(name),
    paymentRejectionReason: source.rejectionReason ? String(source.rejectionReason) : undefined,
  };
}

function mapAdminUser(row: AdminUserRow): User {
  const name = displayName(row.firstName, row.lastName);
  return {
    id: String(row.id), name, email: row.email, phone: row.phone, password: "",
    role: row.role as User["role"], paymentStatus: paymentStatus(row.paymentStatus),
    accountStatus: row.accountStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    accountActivated: row.paymentStatus === "SUCCESS",
    canAccessDashboard: row.paymentStatus === "SUCCESS" && row.accountStatus === "ACTIVE",
    referralCode: "", referredByCode: null, createdAt: row.createdAt, avatarSeed: initials(name),
  };
}

function mapTransaction(row: LedgerEntry | AdminTransactionRow, fallbackUser?: User | null): Transaction {
  const adminRow = row as AdminTransactionRow;
  return {
    id: String(row.id), ref: row.reference,
    userId: String(adminRow.userId ?? fallbackUser?.id ?? ""),
    userName: adminRow.userName ?? fallbackUser?.name ?? "User",
    type: row.type as TransactionType, description: row.description,
    amount: Number(row.amount), status: row.status as TransactionStatus, createdAt: row.createdAt,
  };
}

function mapPayment(row: AdminPaymentRow, fallbackUser?: User | null): PaymentRecord {
  return {
    id: String(row.id), userId: String(row.userId), userName: row.userName ?? fallbackUser?.name ?? "User",
    userEmail: row.userEmail ?? fallbackUser?.email ?? "",
    reference: row.mpesaReference ?? row.externalReference ?? row.internalReference,
    amount: Number(row.amount), method: row.method === "M_PESA" ? "M-Pesa" : row.method,
    submittedAt: row.createdAt, status: paymentRecordStatus(row.status), reviewNote: row.rejectionReason ?? undefined,
  };
}

function mapMinePayment(row: Awaited<ReturnType<typeof paymentApi.mine>>[number], user: User): PaymentRecord {
  return mapPayment({ ...row, userId: Number(user.id), userName: user.name, userEmail: user.email }, user);
}

function mapReferral(
  row: Awaited<ReturnType<typeof referralApi.successful>>["content"][number],
  referrerId: string,
): Referral {
  return {
    id: String(row.refereeId), referrerId, refereeId: String(row.refereeId), refereeName: row.refereeName,
    refereeEmail: row.maskedEmail, createdAt: row.creditedAt, status: "SUCCESSFUL",
    rewardAmount: Number(row.rewardAmount), rewardCredited: true,
  };
}

function mapVideo(row: Awaited<ReturnType<typeof videoApi.list>>[number]): Video {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    category: row.category as Video["category"],
    durationSec: row.durationSec,
    reward: Number(row.reward),
    gradient: [row.gradientFrom, row.gradientTo],
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const pageSize = 100;
  const first = await fetchPage(0, pageSize);
  if (first.totalPages <= 1) return first.content;
  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) => fetchPage(index + 1, pageSize)),
  );
  return [first, ...remaining].flatMap((page) => page.content);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [completions, setCompletions] = useState<Record<string, VideoCompletion[]>>({});
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [platformConfig, setPlatformConfig] = useState<AppConfig | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">((localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const loadInProgress = useRef(false);

  const notify = useCallback((message: string, kind: Notification["kind"] = "info") => {
    const id = `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setNotifications((existing) => [...existing, { id, message, kind }]);
    window.setTimeout(() => setNotifications((existing) => existing.filter((item) => item.id !== id)), 4000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((existing) => existing.filter((item) => item.id !== id));
  }, []);

  const loadCurrentUser = useCallback(async (token: string) => {
    const me = await authApi.me();
    setCurrentUser(mapUser({ ...me, token }));
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    if (loadInProgress.current) return;
    loadInProgress.current = true;
    setLoading(true);
    setDataError(null);
    try {
      if (currentUser.role === "ADMIN") {
        const [dashboard, adminUsers, adminPayments, adminTransactions] = await Promise.all([
          adminApi.dashboard(),
          fetchAllPages((page, size) => adminApi.users(page, size)),
          fetchAllPages((page, size) => adminApi.payments(page, size)),
          fetchAllPages((page, size) => adminApi.transactions(page, size)),
        ]);
        setAdminDashboard(dashboard);
        setUsers(adminUsers.map(mapAdminUser));
        setPayments(adminPayments.map((row) => mapPayment(row)));
        setTransactions(adminTransactions.map((row) => mapTransaction(row)));
        return;
      }

      const [me, mine] = await Promise.all([
        authApi.me(),
        paymentApi.mine(),
      ]);
      const refreshedUser = mapUser({ ...me, token: getToken() ?? "" });
      const mappedPayments = mine.map((row) => mapMinePayment(row, refreshedUser));
      const userWithPaymentState = {
        ...refreshedUser,
        paymentStatus: refreshedUser.paymentStatus === "PAID"
          ? "PAID" as const
          : mappedPayments[0]?.status ?? refreshedUser.paymentStatus,
        paymentRejectionReason: mappedPayments.find((payment) => payment.status === "REJECTED")?.reviewNote,
      };
      setCurrentUser(userWithPaymentState);
      setUsers([userWithPaymentState]);
      setPayments(mappedPayments);

      if (!userWithPaymentState.canAccessDashboard) {
        setReferrals([]);
        setSummary(null);
        setReferralStats(null);
        setTransactions([]);
        setVideos([]);
        setCompletions({});
        return;
      }

      const [stats, successful, earnings, ledger] = await Promise.all([
        referralApi.stats(),
        fetchAllPages((page, size) => referralApi.successful(page, size)),
        earningsApi.summary(),
        fetchAllPages((page, size) => earningsApi.transactions(page, size)),
      ]);
      setReferralStats(stats);
      setReferrals(successful.map((row) => mapReferral(row, refreshedUser.id)));
      setSummary(earnings);
      setTransactions(ledger.map((row) => mapTransaction(row, refreshedUser)));

      try {
        const catalog = await videoApi.list();
        setVideos(catalog.map(mapVideo));
        const details = await Promise.allSettled(catalog.map((video) => videoApi.detail(video.id)));
        const detailFailures = details.filter((result) => result.status === "rejected").length;
        const mineCompletions = details.flatMap((result, index) => result.status === "fulfilled" && result.value.completed
          ? [{ videoId: String(catalog[index].id), completedAt: new Date().toISOString() }]
          : []);
        setCompletions({ [userWithPaymentState.id]: mineCompletions });
        if (detailFailures > 0) {
          const message = "Some video progress could not be loaded. Retry to check again.";
          setDataError(message);
          notify(message, "error");
        }
      } catch (error) {
        const message = errorMessage(error, "Videos could not be loaded. Retry to load them again.");
        setVideos([]);
        setCompletions({});
        setDataError(message);
        notify(message, "error");
      }
    } catch (error) {
      const message = errorMessage(error, "Could not load account data. Retry to load it again.");
      if (!(error instanceof ApiError && error.code === "UNAUTHORIZED")) {
        if (currentUser.role === "ADMIN") {
          setAdminDashboard(null);
          setUsers([]);
          setPayments([]);
          setTransactions([]);
        } else {
          setReferrals([]);
          setSummary(null);
          setReferralStats(null);
          setTransactions([]);
          setPayments([]);
        }
        setDataError(message);
        notify(message, "error");
      }
    } finally {
      setLoading(false);
      loadInProgress.current = false;
    }
  }, [currentUser?.id, currentUser?.role, notify]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearToken();
      setCurrentUser(null);
      setUsers([]);
      setPayments([]);
      setReferrals([]);
      setTransactions([]);
      setSummary(null);
      setReferralStats(null);
      setAdminDashboard(null);
      setCompletions({});
      setVideos([]);
      setLoading(false);
      setDataError(null);
      notify("Your session has expired. Please sign in again.", "error");
    };
    window.addEventListener("earnhub:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("earnhub:unauthorized", handleUnauthorized);
  }, [notify]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    configApi.get()
      .then(setPlatformConfig)
      .catch((error) => notify(errorMessage(error, "Platform settings could not be loaded."), "error"));
  }, [notify]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    loadCurrentUser(token).catch((error) => {
      clearToken();
      setCurrentUser(null);
      setLoading(false);
      if (!(error instanceof ApiError && error.code === "UNAUTHORIZED")) {
        notify(errorMessage(error, "Could not restore your session. Please sign in again."), "error");
      }
    });
  }, [loadCurrentUser, notify]);

  useEffect(() => { void loadData(); }, [loadData]);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    try {
      const result = await authApi.login(email, password);
      if (result.refreshToken) {
        setAuthTokens(result.accessToken ?? result.token, result.refreshToken, remember);
      } else {
        setToken(result.token, remember);
      }
      setCurrentUser(mapUser({ ...result }));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "Login failed."),
        fieldErrors: error instanceof ApiError ? error.details : undefined,
      };
    }
  }, []);

  const register = useCallback(async (data: {
    firstName: string; lastName: string; email: string; phone: string; password: string; referralCode?: string;
  }) => {
    try {
      const result = await authApi.register(data);
      if (result.refreshToken) {
        setAuthTokens(result.accessToken ?? result.token, result.refreshToken, true);
      } else {
        setToken(result.token);
      }
      setCurrentUser(mapUser({ ...result, phone: data.phone }));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "Registration failed."),
        fieldErrors: error instanceof ApiError ? error.details : undefined,
      };
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      void authApi.revokeRefreshToken(refreshToken).catch(() => undefined);
    }
    clearToken(); setCurrentUser(null); setUsers([]); setPayments([]); setReferrals([]);
    setTransactions([]); setSummary(null); setReferralStats(null); setAdminDashboard(null); setCompletions({}); setVideos([]);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (token) {
      await loadCurrentUser(token);
      await loadData();
    }
  }, [loadCurrentUser, loadData]);

  const retryLoad = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const approvePayment = useCallback(async (paymentId: string) => {
    await adminApi.approvePayment(Number(paymentId));
    notify("Payment approved and account activation processed.", "success");
    await loadData();
  }, [loadData, notify]);

  const rejectPayment = useCallback(async (paymentId: string, reason: string) => {
    await adminApi.rejectPayment(Number(paymentId), reason);
    notify("Payment rejected.", "success");
    await loadData();
  }, [loadData, notify]);

  const completeVideo = useCallback(async (videoId: string, _reward: number, title: string) => {
    await videoApi.complete(videoId);
    const userId = currentUser?.id;
    if (userId) setCompletions((existing) => ({
      ...existing,
      [userId]: [...(existing[userId] ?? []), { videoId, completedAt: new Date().toISOString() }],
    }));
    notify(`Reward credited: ${title}`, "success");
    await loadData();
  }, [currentUser?.id, loadData, notify]);

  const requestWithdrawal = useCallback(async (amount: number) => {
    const result = await withdrawalApi.request(amount);
    notify(result.message, result.withdrawalEnabled ? "success" : "info");
    await loadData();
  }, [loadData, notify]);

  const updateProfile = useCallback(async (patch: Partial<Pick<User, "name" | "phone">>) => {
    if (!currentUser) return;
    const parts = (patch.name ?? currentUser.name).trim().split(/\s+/);
    const firstName = parts[0] ?? currentUser.name;
    const lastName = parts.slice(1).join(" ") || firstName;
    const updated = await profileApi.update({
      firstName,
      lastName,
      phone: (patch.phone ?? currentUser.phone).replace(/\D/g, ""),
    });
    const mapped = mapUser({ ...updated, id: currentUser.id });
    setCurrentUser(mapped);
    setUsers((existing) => existing.map((user) => user.id === currentUser.id ? mapped : user));
    notify("Profile updated.", "success");
  }, [currentUser, notify]);

  const toggleUserSuspension = useCallback(async (userId: string) => {
    const target = users.find((user) => user.id === userId);
    if (!target) throw new Error("This user is no longer available. Reload the user list and try again.");
    if (target.accountStatus === "ACTIVE") await adminApi.suspendUser(Number(userId));
    else await adminApi.reactivateUser(Number(userId));
    notify("User account status changed.", "success");
    await loadData();
  }, [loadData, notify, users]);

  const toggleTheme = useCallback(() => setThemeState((value) => value === "light" ? "dark" : "light"), []);
  const setTheme = useCallback((value: "light" | "dark") => setThemeState(value), []);
  const isVideoCompleted = useCallback(
    (userId: string, videoId: string) => (completions[userId] ?? []).some((item) => item.videoId === videoId),
    [completions],
  );

  const totalsForUser = useCallback((userId: string) => {
    if (currentUser?.id === userId && summary) {
      return {
        referralEarnings: Number(summary.referralEarnings), videoEarnings: Number(summary.videoEarnings),
        totalEarnings: Number(summary.totalEarnings), successfulReferrals: Number(referralStats?.successfulReferrals ?? summary.successfulReferrals),
        pendingReferrals: Number(referralStats?.pendingReferrals ?? summary.pendingReferrals), videosWatched: Number(summary.videosWatched),
        withdrawn: Number(summary.totalWithdrawn), pendingEarnings: Number(summary.pendingEarnings), availableBalance: Number(summary.availableBalance),
      };
    }
    const mine = transactions.filter((item) => item.userId === userId);
    const referralEarnings = mine.filter((item) => item.type === "REFERRAL_REWARD" && item.status === "COMPLETED").reduce((sum, item) => sum + item.amount, 0);
    const videoEarnings = mine.filter((item) => item.type === "VIDEO_REWARD" && item.status === "COMPLETED").reduce((sum, item) => sum + item.amount, 0);
    const withdrawn = mine.filter((item) => item.type === "WITHDRAWAL" && item.status === "COMPLETED").reduce((sum, item) => sum + Math.abs(item.amount), 0);
    return {
      referralEarnings, videoEarnings, totalEarnings: referralEarnings + videoEarnings,
      successfulReferrals: referrals.filter((item) => item.referrerId === userId && item.status === "SUCCESSFUL").length,
      pendingReferrals: referrals.filter((item) => item.referrerId === userId && item.status === "PENDING").length,
      videosWatched: (completions[userId] ?? []).length, withdrawn,
      pendingEarnings: mine.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.amount, 0),
      availableBalance: referralEarnings + videoEarnings - withdrawn,
    };
  }, [completions, currentUser?.id, referralStats, referrals, summary, transactions]);

  const value = useMemo<AppContextValue>(() => ({
    users, payments, referrals, transactions, completions, videos, currentUser, loading, dataError, platformConfig, adminDashboard, theme, notifications,
    login, logout, register, refreshUser, retryLoad, toggleTheme, setTheme, notify, dismissNotification,
    approvePayment, rejectPayment, completeVideo, requestWithdrawal, updateProfile, toggleUserSuspension,
    isVideoCompleted, totalsForUser,
  }), [
    users, payments, referrals, transactions, completions, videos, currentUser, loading, dataError, platformConfig, adminDashboard, theme, notifications,
    login, logout, register, refreshUser, retryLoad, toggleTheme, setTheme, notify, dismissNotification,
    approvePayment, rejectPayment, completeVideo, requestWithdrawal, updateProfile, toggleUserSuspension,
    isVideoCompleted, totalsForUser,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
