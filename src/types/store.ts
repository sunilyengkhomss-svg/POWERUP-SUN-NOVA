export type CurrencyCode = 'INR' | 'USD' | 'SGD';

export type GameCategory =
  | 'All'
  | 'Battle Royale'
  | 'Action RPG'
  | 'MOBA & Strategy'
  | 'Tactical FPS'
  | 'Gift Cards';

export type ProductKind = 'direct-topup' | 'gift-card';

export type PaymentChannelId =
  | 'upi'
  | 'phonepe'
  | 'gpay'
  | 'card'
  | 'netbanking'
  | 'wallet';

export type OrderStatus =
  | 'Created'
  | 'Awaiting Payment'
  | 'Payment Successful'
  | 'Processing'
  | 'Successful'
  | 'Failed'
  | 'Refund Pending'
  | 'Refunded';

export type ShowcaseSectionTag =
  | 'featured'
  | 'popular'
  | 'trending'
  | 'bestseller'
  | 'new'
  | 'offer'
  | 'giftcard';

export interface DenominationPack {
  id: string;
  label: string;
  bonusLabel?: string;
  costPriceInr: number;
  priceInr: number;
  originalPriceInr?: number;
  cashbackPercent: number;
  popular?: boolean;
  active: boolean;
}

export interface ServerOption {
  id: string;
  name: string;
}

export interface AccountFieldConfig {
  primaryLabel: string;
  primaryPlaceholder: string;
  primaryPattern: string;
  primaryHelp: string;
  secondaryType: 'none' | 'zone-input' | 'server-select';
  secondaryLabel?: string;
  secondaryPlaceholder?: string;
  servers?: ServerOption[];
}

export interface SupplierConfig {
  id: string;
  name: string;
  protocol: string;
  endpointUrl: string;
  configured: boolean;
  active: boolean;
  apiMode: 'sandbox' | 'live';
  commissionPercent: number;
  avgLatencyMs: number;
}

export interface GameTitle {
  slug: string;
  name: string;
  publisher: string;
  kind: ProductKind;
  category: Exclude<GameCategory, 'All'>;
  regionLabel: string;
  regionRestriction: string;
  platformLabel: string;
  currencyUnitName: string;
  deliveryEstimate: string;
  discountPercent?: number;
  supplierId: string;
  active: boolean;
  supplierConfigured?: boolean;
  isAvailable?: boolean;
  sectionTags: ShowcaseSectionTag[];
  imageUrl?: string;
  voucherTheme?: {
    brandCode: string;
    accentHex: string;
    surfaceHex: string;
  };
  shortDescription: string;
  idGuideSteps: string[];
  accountConfig: AccountFieldConfig;
  packs: DenominationPack[];
}

export interface PaymentChannel {
  id: PaymentChannelId;
  name: string;
  subtitle: string;
  feeNote: string;
  feePercent: number;
  enabled: boolean;
  provider: string;
}

export interface CartItem {
  cartItemId: string;
  gameSlug: string;
  gameName: string;
  kind: ProductKind;
  packId: string;
  packLabel: string;
  bonusLabel?: string;
  unitPriceInr: number;
  costPriceInr: number;
  cashbackPercent: number;
  quantity: number;
  playerId: string;
  secondaryId?: string;
  verifiedNickname?: string;
}

export interface VerifiedPlayer {
  valid: boolean;
  nickname?: string;
  region?: string;
  supported?: boolean;
  error?: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface OrderItemReceipt {
  gameSlug: string;
  gameName: string;
  kind: ProductKind;
  packId: string;
  packLabel: string;
  bonusLabel?: string;
  quantity: number;
  unitPriceInr: number;
  costPriceInr: number;
  lineTotalInr: number;
  lineCostInr: number;
  cashbackEarnedInr: number;
  playerId: string;
  secondaryId?: string;
  verifiedNickname?: string;
  voucherCode?: string;
}

export interface OrderRecord {
  orderId: string;
  idempotencyKey: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  currency: CurrencyCode;
  paymentMethod: PaymentChannelId;
  paymentLabel: string;
  gatewayPaymentId?: string;
  gatewayFeeInr: number;
  supplierId: string;
  supplierTxnId?: string;
  supplierLocked: boolean;
  customerEmail: string;
  promoCode?: string;
  subtotalInr: number;
  discountInr: number;
  totalInr: number;
  totalCostInr: number;
  commissionInr: number;
  netProfitInr: number;
  cashbackEarnedInr: number;
  settlementStatus: 'Settled' | 'Pending Settlement' | 'Reversed';
  failureReason?: string;
  timeline: OrderTimelineEvent[];
  items: OrderItemReceipt[];
}

export interface SavedPlayerId {
  id: string;
  gameSlug: string;
  gameName: string;
  label: string;
  playerId: string;
  secondaryId?: string;
  verifiedNickname?: string;
}

export interface WalletTransaction {
  txnId: string;
  type: 'Credit' | 'Debit' | 'Cashback' | 'Referral' | 'Refund';
  amountInr: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface RefundRequestRecord {
  refundId: string;
  orderId: string;
  customerEmail: string;
  amountInr: number;
  reason: string;
  status: 'Refund Pending' | 'Refunded' | 'Rejected';
  createdAt: string;
  resolvedAt?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  walletBalanceInr: number;
  cashbackBalanceInr: number;
  referralCode: string;
  referredCount: number;
  referralEarningsInr: number;
  savedPlayerIds: SavedPlayerId[];
  walletTransactions: WalletTransaction[];
  notifications: CustomerNotification[];
  createdAt: string;
}

export interface CouponRecord {
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  value: number;
  minOrderInr: number;
  active: boolean;
}

export interface BannerRecord {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  targetSlug: string;
  imageUrl: string;
  active: boolean;
}

export interface WebsiteSettings {
  brandName: string;
  mainBrand: string;
  storeName: string;
  tagline: string;
  paymentMode: 'sandbox' | 'live';
  defaultCashbackPercent: number;
  referralBonusInr: number;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  supportEmail: string;
}

export interface SupportTicket {
  ticketId: string;
  orderId?: string;
  email: string;
  topic: string;
  message: string;
  status: 'Open' | 'Resolved';
  createdAt: string;
}
