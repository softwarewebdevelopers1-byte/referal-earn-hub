import type {
  DemoAccount,
  PaymentRecord,
  Referral,
  Transaction,
  User,
  Video,
} from "../types";

export const REFERRAL_REWARD = 30;
export const PLATFORM_FEE = 500;
export const CURRENCY = "KSh";

export const formatMoney = (amount: number, decimals = 0): string =>
  `${CURRENCY} ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)}`;

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "member@example.com", password: "Demo123!", label: "Paid user" },
  { email: "unpaid@example.com", password: "Demo123!", label: "Unpaid user" },
  { email: "pending@example.com", password: "Demo123!", label: "Pending user" },
  { email: "admin@example.com", password: "Demo123!", label: "Administrator" },
];

export const seedUsers: User[] = [
  {
    id: "u1",
    name: "Amina Wanjiku",
    email: "member@example.com",
    phone: "+254 712 000 111",
    password: "Demo123!",
    role: "USER",
    paymentStatus: "PAID",
    accountStatus: "ACTIVE",
    referralCode: "LRN12345",
    referredByCode: null,
    createdAt: "2024-09-12T09:00:00.000Z",
    avatarSeed: "AW",
  },
  {
    id: "u2",
    name: "James Kariuki",
    email: "unpaid@example.com",
    phone: "+254 712 000 222",
    password: "Demo123!",
    role: "USER",
    paymentStatus: "UNPAID",
    accountStatus: "ACTIVE",
    referralCode: "LRN22334",
    referredByCode: null,
    createdAt: "2024-10-01T09:00:00.000Z",
    avatarSeed: "JK",
  },
  {
    id: "u3",
    name: "Fatuma Ali",
    email: "pending@example.com",
    phone: "+254 712 000 333",
    password: "Demo123!",
    role: "USER",
    paymentStatus: "PAYMENT_PENDING",
    accountStatus: "ACTIVE",
    referralCode: "LRN33445",
    referredByCode: null,
    createdAt: "2024-10-05T09:00:00.000Z",
    avatarSeed: "FA",
    paymentReference: "PAY-2024-4451",
    paymentSubmittedAt: "2024-10-20T11:30:00.000Z",
  },
  {
    id: "u4",
    name: "System Admin",
    email: "admin@example.com",
    phone: "+254 700 999 888",
    password: "Demo123!",
    role: "ADMIN",
    paymentStatus: "PAID",
    accountStatus: "ACTIVE",
    referralCode: "ADM00001",
    referredByCode: null,
    createdAt: "2024-01-02T09:00:00.000Z",
    avatarSeed: "SA",
  },
  // Additional realistic users for admin views
  ...[
    "Brian Otieno",
    "Mary Achieng",
    "Kevin Mwangi",
    "Grace Njeri",
    "Peter Wekesa",
    "Zainab Hassan",
    "Daniel Ochieng",
    "Lucy Wambui",
    "Samuel Kimani",
    "Ruth Chebet",
  ].map((name, i): User => {
    const idx = i + 5;
    const statuses: User["paymentStatus"][] = [
      "PAID",
      "PAYMENT_PENDING",
      "PAID",
      "PAID",
      "REJECTED",
      "PAID",
      "PAID",
      "PAYMENT_REVIEW",
      "PAID",
      "PAID",
    ];
    return {
      id: `u${idx}`,
      name,
      email: `${name.split(" ")[0].toLowerCase()}${idx}@example.com`,
      phone: `+254 7${String(10000000 + idx * 1111).slice(0, 8)}`,
      password: "Demo123!",
      role: "USER",
      paymentStatus: statuses[i],
      accountStatus: "ACTIVE",
      referralCode: `LRN${10000 + idx * 7}`,
      referredByCode: "LRN12345",
      createdAt: new Date(2024, 8 + (i % 3), 1 + i * 2).toISOString(),
      avatarSeed: name
        .split(" ")
        .map((n) => n[0])
        .join(""),
    };
  }),
];

export const seedPayments: PaymentRecord[] = [
  {
    id: "p1",
    userId: "u3",
    userName: "Fatuma Ali",
    userEmail: "pending@example.com",
    reference: "PAY-2024-4451",
    amount: PLATFORM_FEE,
    method: "M-Pesa",
    submittedAt: "2024-10-20T11:30:00.000Z",
    status: "PAYMENT_PENDING",
  },
  {
    id: "p2",
    userId: "u6",
    userName: "Mary Achieng",
    userEmail: "mary6@example.com",
    reference: "PAY-2024-4452",
    amount: PLATFORM_FEE,
    method: "M-Pesa",
    submittedAt: "2024-10-18T14:10:00.000Z",
    status: "PAYMENT_PENDING",
  },
  {
    id: "p3",
    userId: "u9",
    userName: "Samuel Kimani",
    userEmail: "samuel9@example.com",
    reference: "PAY-2024-4453",
    amount: PLATFORM_FEE,
    method: "Bank Transfer",
    submittedAt: "2024-10-15T09:05:00.000Z",
    status: "PAYMENT_REVIEW",
  },
  {
    id: "p4",
    userId: "u10",
    userName: "Ruth Chebet",
    userEmail: "ruth10@example.com",
    reference: "PAY-2024-4454",
    amount: PLATFORM_FEE,
    method: "M-Pesa",
    submittedAt: "2024-10-12T16:45:00.000Z",
    status: "REJECTED",
    reviewNote: "Payment reference did not match an M-Pesa confirmation code.",
  },
  {
    id: "p5",
    userId: "u5",
    userName: "Brian Otieno",
    userEmail: "brian5@example.com",
    reference: "PAY-2024-4455",
    amount: PLATFORM_FEE,
    method: "M-Pesa",
    submittedAt: "2024-10-10T10:00:00.000Z",
    status: "PAID",
  },
];

const refereeNames = [
  "Brian Otieno",
  "Mary Achieng",
  "Kevin Mwangi",
  "Grace Njeri",
  "Peter Wekesa",
  "Zainab Hassan",
  "Daniel Ochieng",
  "Lucy Wambui",
  "Samuel Kimani",
  "Ruth Chebet",
];

export const seedReferrals: Referral[] = Array.from({ length: 45 }, (_, i) => {
  const successful = i < 40;
  const name =
    refereeNames[i % refereeNames.length] +
    (i >= 10 ? ` ${Math.floor(i / 10) + 1}` : "");
  const created = new Date(
    2024,
    6 + Math.floor(i / 8),
    1 + (i % 27),
  ).toISOString();
  return {
    id: `r${i + 1}`,
    referrerId: "u1",
    refereeId: `ru${i + 1}`,
    refereeName: name,
    refereeEmail: `${name.split(" ")[0].toLowerCase()}${i + 1}@example.com`,
    createdAt: created,
    status: successful ? "SUCCESSFUL" : "PENDING",
    rewardAmount: successful ? REFERRAL_REWARD : 0,
    rewardCredited: successful,
  };
});

export const videos: Video[] = [
  {
    id: "v1",
    title: "Mastering Personal Finance in 10 Minutes",
    description:
      "Learn the fundamentals of budgeting, saving, and investing for long-term wealth.",
    category: "Education",
    durationSec: 600,
    reward: 15,
    gradient: ["#f97316", "#ea580c"],
  },
  {
    id: "v2",
    title: "Intro to Modern Web Development",
    description:
      "A friendly walkthrough of React, TypeScript, and how frontends are built today.",
    category: "Technology",
    durationSec: 900,
    reward: 20,
    gradient: ["#0ea5e9", "#0369a1"],
  },
  {
    id: "v3",
    title: "Starting a Side Business on a Budget",
    description:
      "Practical steps for turning a small idea into a real, profitable side hustle.",
    category: "Business",
    durationSec: 720,
    reward: 18,
    gradient: ["#16a34a", "#15803d"],
  },
  {
    id: "v4",
    title: "Healthy Morning Routines That Stick",
    description:
      "Simple lifestyle habits to build energy and focus throughout the day.",
    category: "Lifestyle",
    durationSec: 480,
    reward: 12,
    gradient: ["#795548", "#5d4037"],
  },
  {
    id: "v5",
    title: "The Science of Fun: Why We Play",
    description:
      "Entertainment meets psychology in this lighthearted look at joy and play.",
    category: "Entertainment",
    durationSec: 540,
    reward: 10,
    gradient: ["#a855f7", "#7e22ce"],
  },
  {
    id: "v6",
    title: "Building Wealth with Compound Interest",
    description:
      "Understand how small, consistent investments grow over decades.",
    category: "Education",
    durationSec: 780,
    reward: 16,
    gradient: ["#f59e0b", "#b45309"],
  },
  {
    id: "v7",
    title: "Cloud Computing Explained Simply",
    description:
      "What is the cloud, really? A clear explanation without the jargon.",
    category: "Technology",
    durationSec: 660,
    reward: 14,
    gradient: ["#6366f1", "#4338ca"],
  },
  {
    id: "v8",
    title: "Negotiating Your First Salary",
    description:
      "Confident, respectful approaches to getting paid what you are worth.",
    category: "Business",
    durationSec: 840,
    reward: 19,
    gradient: ["#0d9488", "#115e59"],
  },
];

const txTypes: Transaction["type"][] = [
  "REFERRAL_REWARD",
  "VIDEO_REWARD",
  "REFERRAL_REWARD",
  "VIDEO_REWARD",
  "REFERRAL_REWARD",
  "WITHDRAWAL",
  "VIDEO_REWARD",
  "PAYMENT_SUBMISSION",
];

export const seedTransactions: Transaction[] = Array.from(
  { length: 32 },
  (_, i) => {
    const type = txTypes[i % txTypes.length];
    const amount =
      type === "REFERRAL_REWARD"
        ? REFERRAL_REWARD
        : type === "VIDEO_REWARD"
          ? 10 + (i % 10)
          : type === "WITHDRAWAL"
            ? -(200 + (i % 3) * 100)
            : PLATFORM_FEE;
    const status: Transaction["status"] =
      i === 30 ? "PENDING" : i === 31 ? "FAILED" : "COMPLETED";
    const created = new Date(
      2024,
      6 + Math.floor(i / 6),
      1 + (i % 26),
    ).toISOString();
    const desc =
      type === "REFERRAL_REWARD"
        ? "Referral reward credited"
        : type === "VIDEO_REWARD"
          ? "Video completion reward"
          : type === "WITHDRAWAL"
            ? "Withdrawal to M-Pesa"
            : "Account payment submission";
    return {
      id: `t${i + 1}`,
      ref: `TXN-${String(100000 + i)}`,
      userId: "u1",
      userName: "Amina Wanjiku",
      type,
      description: desc,
      amount,
      status,
      createdAt: created,
    };
  },
);

export const earningsTrendData = {
  "7d": [
    { label: "Mon", referral: 30, video: 25 },
    { label: "Tue", referral: 60, video: 30 },
    { label: "Wed", referral: 30, video: 40 },
    { label: "Thu", referral: 90, video: 35 },
    { label: "Fri", referral: 60, video: 50 },
    { label: "Sat", referral: 30, video: 45 },
    { label: "Sun", referral: 60, video: 55 },
  ],
  "30d": Array.from({ length: 10 }, (_, i) => ({
    label: `W${i + 1}`,
    referral: 60 + ((i * 30) % 120),
    video: 40 + ((i * 20) % 100),
  })),
  "90d": Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    referral: 60 + ((i * 25) % 180),
    video: 40 + ((i * 18) % 140),
  })),
  "12m": Array.from({ length: 12 }, (_, i) => ({
    label: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][i],
    referral: 200 + ((i * 40) % 300),
    video: 150 + ((i * 30) % 250),
  })),
};

export const adminRegistrationTrend = Array.from({ length: 8 }, (_, i) => ({
  label: `W${i + 1}`,
  users: 4 + ((i * 5) % 14),
}));

export const adminApprovalTrend = Array.from({ length: 8 }, (_, i) => ({
  label: `W${i + 1}`,
  approved: 2 + ((i * 3) % 8),
  pending: 1 + ((i * 2) % 5),
}));

export const userPaymentStatusLabel: Record<string, string> = {
  UNPAID: "Unpaid",
  PAYMENT_PENDING: "Pending",
  PAYMENT_REVIEW: "In review",
  PAID: "Approved",
  REJECTED: "Rejected",
};
