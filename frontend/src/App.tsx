import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useApp } from "./context/AppContext";
import { NotificationHost } from "./components/Notifications";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { UserDashboard } from "./pages/UserDashboard";
import { Referrals } from "./pages/Referrals";
import { Videos } from "./pages/Videos";
import { VideoDetail } from "./pages/VideoDetail";
import { Earnings } from "./pages/Earnings";
import { Transactions } from "./pages/Transactions";
import { Profile } from "./pages/Profile";
import { PaymentRequired } from "./pages/PaymentRequired";
import { PaymentPending } from "./pages/PaymentPending";
import { PaymentRejected } from "./pages/PaymentRejected";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminPayments } from "./pages/admin/AdminPayments";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminTransactions } from "./pages/admin/AdminTransactions";
import { AdminPaymentHistory } from "./pages/admin/AdminPaymentHistory";

function RequireAuth() {
  const { currentUser, loading } = useApp();
  if (loading && !currentUser) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequirePaid() {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.canAccessDashboard) return <Outlet />;
  if (currentUser.paymentStatus === "REJECTED") {
    return <Navigate to="/payment-rejected" replace />;
  }
  if (currentUser.paymentStatus === "UNPAID") {
    return <Navigate to="/payment-required" replace />;
  }
  if (
    currentUser.paymentStatus === "PAYMENT_PENDING" ||
    currentUser.paymentStatus === "PAYMENT_REVIEW"
  ) {
    return <Navigate to="/payment-pending" replace />;
  }
  return <Navigate to="/payment-pending" replace />;
}

function authenticatedDestination(user: ReturnType<typeof useApp>["currentUser"]) {
  if (!user) return "/login";
  if (user.role === "ADMIN") return "/admin";
  if (user.canAccessDashboard) return "/dashboard";
  if (user.paymentStatus === "REJECTED") return "/payment-rejected";
  if (user.paymentStatus === "UNPAID") return "/payment-required";
  return "/payment-pending";
}

function RequireAdmin() {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RedirectIfAuthed() {
  const { currentUser, loading } = useApp();
  if (loading && !currentUser) return null;
  if (currentUser) {
    return <Navigate to={authenticatedDestination(currentUser)} replace />;
  }
  return <Outlet />;
}

function UserShell() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

function AdminShell() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export default function App() {
  return (
    <>
      <NotificationHost />
      <Routes>
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<RequirePaid />}>
            <Route element={<UserShell />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/videos/:videoId" element={<VideoDetail />} />
              <Route path="/earnings" element={<Earnings />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="/payment-required" element={<PaymentRequired />} />
          <Route path="/payment-pending" element={<PaymentPending />} />
          <Route path="/payment-rejected" element={<PaymentRejected />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<RequireAdmin />}>
            <Route element={<AdminShell />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route
                path="/admin/transactions"
                element={<AdminTransactions />}
              />
              <Route
                path="/admin/payment-history"
                element={<AdminPaymentHistory />}
              />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
