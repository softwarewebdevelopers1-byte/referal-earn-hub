import type {
  AuthResponse,
  AppConfig,
  Payment,
  PaymentStatusResponse,
  ReferralStats,
  SuccessfulReferral,
  EarningsSummary,
  LedgerEntry,
  Video,
  VideoDetail,
  WithdrawalResponse,
  AdminDashboard,
  AdminUserRow,
  AdminPaymentRow,
  AdminTransactionRow,
  AdminTransactionSummary,
  Paginated,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
const TOKEN_KEY = "earnhub_token";
const SESSION_TOKEN_KEY = "earnhub_session_token";
const REFRESH_TOKEN_KEY = "earnhub_refresh_token";
const SESSION_REFRESH_TOKEN_KEY = "earnhub_session_refresh_token";

export function getToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(SESSION_TOKEN_KEY)
  );
}
export function setToken(token: string, remember = true) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(
    remember ? TOKEN_KEY : SESSION_TOKEN_KEY,
    token,
  );
}
export function setAuthTokens(
  accessToken: string,
  refreshToken: string,
  remember = true,
) {
  clearToken();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(remember ? TOKEN_KEY : SESSION_TOKEN_KEY, accessToken);
  storage.setItem(
    remember ? REFRESH_TOKEN_KEY : SESSION_REFRESH_TOKEN_KEY,
    refreshToken,
  );
}
export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ??
    sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY)
  );
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
}

class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string>;
  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, string>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export { ApiError };

function defaultErrorMessage(status: number) {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested record could not be found.";
  if (status === 409)
    return "This operation conflicts with the current record state.";
  if (status >= 500)
    return "The server could not complete the request. Please try again.";
  return "Request failed. Please check the information and try again.";
}

function dispatchUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("earnhub:unauthorized"));
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function rotateAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = request<AuthResponse>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      false,
    )
      .then((refreshed) => {
        const accessToken = refreshed.accessToken ?? refreshed.token;
        if (!accessToken || !refreshed.refreshToken) return false;
        const remember = localStorage.getItem(REFRESH_TOKEN_KEY) !== null;
        setAuthTokens(accessToken, refreshed.refreshToken, remember);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "omit",
      signal: init.signal ?? controller.signal,
    });
  } catch (error) {
    if (
      timedOut ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw new ApiError(
        "The server took too long to respond. Please try again.",
        "TIMEOUT",
        408,
      );
    }
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      "NETWORK_ERROR",
      0,
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const refreshablePath = ![
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
  ].includes(path);
  if (
    res.status === 401 &&
    allowRefresh &&
    refreshablePath &&
    getRefreshToken()
  ) {
    if (await rotateAccessToken()) {
      return request<T>(path, init, false);
    }
    // The refresh token is invalid or expired; the original 401 is handled below.
    clearToken();
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let body: unknown = null;
  if (isJson) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    body = await res.text();
  }

  if (res.status === 401) {
    clearToken();
    const isPublicAuthRequest = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/refresh",
      "/api/auth/logout",
    ].includes(path);
    if (token && !isPublicAuthRequest) dispatchUnauthorized();
  }

  if (!res.ok) {
    const objectBody =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : undefined;
    const message =
      typeof objectBody?.message === "string" && objectBody.message.trim()
        ? objectBody.message
        : typeof body === "string" && body.trim()
          ? body
          : defaultErrorMessage(res.status);
    const code =
      res.status === 401
        ? "UNAUTHORIZED"
        : typeof objectBody?.code === "string"
          ? objectBody.code
          : `HTTP_${res.status}`;
    const fieldErrors =
      objectBody?.fieldErrors && typeof objectBody.fieldErrors === "object"
        ? Object.fromEntries(
            Object.entries(
              objectBody.fieldErrors as Record<string, unknown>,
            ).filter(([, value]) => typeof value === "string") as [
              string,
              string,
            ][],
          )
        : undefined;
    throw new ApiError(message, code, res.status, fieldErrors);
  }
  return body as T;
}

/* ---------- Auth ---------- */
export const authApi = {
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    referralCode?: string;
  }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      false,
    ),

  revokeRefreshToken: (refreshToken: string) =>
    request<void>(
      "/api/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      false,
    ),

  me: () => request<Record<string, unknown>>("/api/auth/me"),

  forgotPassword: (email: string) =>
    request<void>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<void>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  logout: () => {
    clearToken();
  },
};

export const configApi = {
  get: () => request<AppConfig>("/api/config"),
};

/* ---------- Payments ---------- */
export const paymentApi = {
  initiate: (phone: string) =>
    request<Payment>("/api/payments/initiate", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  mine: () => request<Payment[]>("/api/payments/mine"),
  status: (reference: string) =>
    request<PaymentStatusResponse>(
      `/api/payments/${encodeURIComponent(reference)}/status`,
    ),
};

/* ---------- Referrals ---------- */
export const referralApi = {
  stats: () => request<ReferralStats>("/api/referrals/stats"),
  successful: (page = 0, size = 20) =>
    request<Paginated<SuccessfulReferral>>(
      `/api/referrals/successful?page=${page}&size=${size}`,
    ),
};

/* ---------- Earnings ---------- */
export const earningsApi = {
  summary: () => request<EarningsSummary>("/api/earnings/summary"),
  transactions: (page = 0, size = 20, type?: string, status?: string) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (type) q.set("type", type);
    if (status) q.set("status", status);
    return request<Paginated<LedgerEntry>>(`/api/earnings/transactions?${q}`);
  },
};

/* ---------- Withdrawals ---------- */
export const withdrawalApi = {
  eligibility: () =>
    request<WithdrawalResponse>("/api/withdrawals/eligibility"),
  request: (amount: number) =>
    request<WithdrawalResponse>("/api/withdrawals/request", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
};

/* ---------- Videos ---------- */
export const videoApi = {
  list: () => request<Video[]>("/api/videos"),
  detail: (id: number | string) => request<VideoDetail>(`/api/videos/${id}`),
  complete: (id: number | string) =>
    request<{ status: boolean }>(`/api/videos/${id}/complete`, {
      method: "POST",
    }),
};

/* ---------- Profile ---------- */
export const profileApi = {
  get: () => request<Record<string, unknown>>("/api/profile"),
  update: (data: { firstName: string; lastName: string; phone: string }) =>
    request<Record<string, unknown>>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

/* ---------- Admin ---------- */
export const adminApi = {
  dashboard: () => request<AdminDashboard>("/api/admin/dashboard"),
  users: (page = 0, size = 20, q?: string, role?: string, status?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    return request<Paginated<AdminUserRow>>(`/api/admin/users?${params}`);
  },
  payments: (page = 0, size = 100) =>
    request<Paginated<AdminPaymentRow>>(
      `/api/admin/payments?page=${page}&size=${size}`,
    ),
  transactions: (
    page = 0,
    size = 20,
    filters?: {
      date?: string;
      q?: string;
      type?: string;
      status?: string;
    },
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (filters?.date) params.set("date", filters.date);
    if (filters?.q) params.set("q", filters.q);
    if (filters?.type && filters.type !== "ALL")
      params.set("type", filters.type);
    if (filters?.status && filters.status !== "ALL")
      params.set("status", filters.status);
    return request<Paginated<AdminTransactionRow>>(
      `/api/admin/transactions?${params}`,
    );
  },
  transactionSummary: (filters?: {
    date?: string;
    q?: string;
    type?: string;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.date) params.set("date", filters.date);
    if (filters?.q) params.set("q", filters.q);
    if (filters?.type && filters.type !== "ALL")
      params.set("type", filters.type);
    if (filters?.status && filters.status !== "ALL")
      params.set("status", filters.status);
    const query = params.toString();
    return request<AdminTransactionSummary>(
      `/api/admin/transactions/summary${query ? `?${query}` : ""}`,
    );
  },
  approvePayment: (id: number, reason = "Manual approval") =>
    request<void>(`/api/admin/payments/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  rejectPayment: (id: number, reason: string) =>
    request<void>(`/api/admin/payments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  suspendUser: (id: number, reason = "Admin action") =>
    request<void>(`/api/admin/users/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  reactivateUser: (id: number) =>
    request<void>(`/api/admin/users/${id}/reactivate`, { method: "POST" }),
  createUser: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: "USER" | "ADMIN";
    password: string;
  }) =>
    request<AdminUserRow>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateUserEmail: (id: number, email: string) =>
    request<AdminUserRow>(`/api/admin/users/${id}/email`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    }),
  resetUserPassword: (id: number, newPassword: string) =>
    request<void>(`/api/admin/users/${id}/password-reset`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
};
