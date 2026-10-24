/**
 * Display formatting helpers. Account, payment, referral, transaction, video,
 * and business-rule values come from the API.
 */
export const formatMoney = (amount: number, decimals = 0): string =>
  `KSh ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)}`;
