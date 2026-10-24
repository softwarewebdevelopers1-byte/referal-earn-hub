export interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "ADMIN";
  paymentStatus: string;
  accountStatus: string;
  accountActivated: boolean;
  canAccessDashboard: boolean;
  referralCode: string;
}

export interface AppConfig {
  activationAmount: number;
  referralCommission: number;
  currency: string;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "USER" | "ADMIN";
  paymentStatus: string;
  accountStatus: string;
  accountActivated: boolean;
  canAccessDashboard: boolean;
  referralCode: string;
  createdAt: string;
}

export interface Payment {
  id: number;
  internalReference: string;
  externalReference: string | null;
  providerReference?: string | null;
  checkoutRequestId?: string | null;
  merchantRequestId?: string | null;
  mpesaReference: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  callbackReceivedAt?: string | null;
  paymentCompletedAt?: string | null;
}

export interface PaymentStatusResponse {
  paymentReference: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  accountActivated: boolean;
  canAccessDashboard: boolean;
  message: string;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalRegisteredReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
}

export interface SuccessfulReferral {
  refereeId: number;
  refereeName: string;
  maskedEmail: string;
  rewardAmount: number;
  creditedAt: string;
}

export interface EarningsSummary {
  totalEarnings: number;
  referralEarnings: number;
  videoEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  successfulReferrals: number;
  pendingReferrals: number;
  videosWatched: number;
}

export interface LedgerEntry {
  id: number;
  type: string;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  createdAt: string;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  category: string;
  durationSec: number;
  reward: number;
  gradientFrom: string;
  gradientTo: string;
}

export interface VideoDetail {
  video: Video;
  completed: boolean;
}

export interface WithdrawalResponse {
  code: "MINIMUM_REFERRALS_NOT_MET" | "WITHDRAWAL_TEMPORARILY_UNAVAILABLE";
  message: string;
  successfulReferrals: number;
  requiredReferrals: number;
  remainingReferrals: number;
  withdrawalEnabled: boolean;
  b2cEnabled: boolean;
  contactAdmin: boolean;
}

export interface AdminDashboard {
  totalUsers: number;
  approvedUsers: number;
  pendingPayments: number;
  rejectedPayments: number;
  totalReferralRewards: number;
  totalVideoRewards: number;
  totalTransactions: number;
}

export interface AdminUserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  paymentStatus: string;
  accountStatus: string;
  createdAt: string;
  referralEarnings: number;
  videoEarnings: number;
}

export interface AdminPaymentRow {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  internalReference: string;
  externalReference: string | null;
  mpesaReference: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTransactionRow extends LedgerEntry {
  userId: number;
  userName: string;
}

export interface Paginated<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
