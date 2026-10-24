export type Role = "USER" | "ADMIN";

export type PaymentStatus =
  "UNPAID" | "PAYMENT_PENDING" | "PAYMENT_REVIEW" | "PAID" | "REJECTED";

export type AccountStatus = "ACTIVE" | "SUSPENDED";

export type ReferralStatus = "SUCCESSFUL" | "PENDING";

export type TransactionType =
  "REFERRAL_REWARD" | "VIDEO_REWARD" | "WITHDRAWAL" | "PAYMENT_SUBMISSION";

export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED";

export type VideoCategory =
  "Education" | "Technology" | "Business" | "Lifestyle" | "Entertainment";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: Role;
  paymentStatus: PaymentStatus;
  accountStatus: AccountStatus;
  accountActivated: boolean;
  canAccessDashboard: boolean;
  referralCode: string;
  referredByCode: string | null;
  createdAt: string;
  avatarSeed: string;
  paymentReference?: string;
  paymentSubmittedAt?: string;
  paymentRejectionReason?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  refereeEmail: string;
  createdAt: string;
  status: ReferralStatus;
  rewardAmount: number;
  rewardCredited: boolean;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  reference: string;
  amount: number;
  method: string;
  submittedAt: string;
  status: PaymentStatus;
  reviewNote?: string;
}

export interface Transaction {
  id: string;
  ref: string;
  userId: string;
  userName: string;
  type: TransactionType;
  description: string;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  durationSec: number;
  reward: number;
  gradient: [string, string];
}

export interface VideoCompletion {
  videoId: string;
  completedAt: string;
}

export interface EarningsPoint {
  label: string;
  referral: number;
  video: number;
}

export interface Notification {
  id: string;
  message: string;
  kind: "success" | "error" | "info";
}

export interface DemoAccount {
  email: string;
  password: string;
  label: string;
}
