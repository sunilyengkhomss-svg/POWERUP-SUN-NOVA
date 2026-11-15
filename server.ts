import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  INITIAL_BANNERS,
  INITIAL_CATALOG_TITLES,
  INITIAL_COUPONS,
  INITIAL_PAYMENT_CHANNELS,
  INITIAL_SUPPLIERS,
  INITIAL_WEBSITE_SETTINGS,
} from './src/data/catalog.ts';
import type {
  BannerRecord,
  CouponRecord,
  CurrencyCode,
  CustomerProfile,
  GameTitle,
  OrderItemReceipt,
  OrderRecord,
  OrderStatus,
  PaymentChannel,
  PaymentChannelId,
  RefundRequestRecord,
  SupplierConfig,
  SupportTicket,
  WebsiteSettings,
} from './src/types/store.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    if (args[i].startsWith('--port=')) {
      const parsed = Number(args[i].slice(7));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.APP_PORT) {
    const parsed = Number(process.env.APP_PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const parsed = Number(process.env.PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const PORT = resolvePort();
const isProduction = process.env.NODE_ENV === 'production';

// Server-only secrets (NEVER sent to frontend)
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@powerupsunnova.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SunNovaAdmin#2026';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'sandbox_webhook_secret';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';

// Mutable server-side operational stores (mirrored in Cloudflare D1 schema)
const websiteSettings: WebsiteSettings = {
  ...INITIAL_WEBSITE_SETTINGS,
  paymentMode: process.env.PAYMENT_MODE === 'live' ? 'live' : 'sandbox',
  turnstileSiteKey:
    process.env.TURNSTILE_SITE_KEY || INITIAL_WEBSITE_SETTINGS.turnstileSiteKey,
};

const suppliersStore: SupplierConfig[] = structuredClone(INITIAL_SUPPLIERS);
const paymentChannelsStore: PaymentChannel[] = structuredClone(INITIAL_PAYMENT_CHANNELS);
const catalogStore: GameTitle[] = structuredClone(INITIAL_CATALOG_TITLES);
const couponsStore: CouponRecord[] = structuredClone(INITIAL_COUPONS);
const bannersStore: BannerRecord[] = structuredClone(INITIAL_BANNERS);
const supportTicketsStore: SupportTicket[] = [];
const refundsStore: RefundRequestRecord[] = [];

interface CustomerRecordInternal extends CustomerProfile {
  passwordHash: string;
}

function hashPassword(raw: string): string {
  return crypto.createHash('sha256').update(`sunnova:${raw}`).digest('hex');
}

const customerSessions = new Map<string, string>(); // token -> customerId
const adminSessions = new Map<string, string>(); // token -> adminEmail

const customersStore: CustomerRecordInternal[] = [
  {
    id: 'cust-1001',
    name: 'Arjun Mehta',
    email: 'arjun.nova@example.in',
    phone: '+91 98201 44120',
    passwordHash: hashPassword('SunNova2026!'),
    walletBalanceInr: 1250,
    cashbackBalanceInr: 68,
    referralCode: 'SUNARJUN50',
    referredCount: 3,
    referralEarningsInr: 150,
    savedPlayerIds: [
      {
        id: 'spid-1',
        gameSlug: 'bgmi',
        gameName: 'BGMI UC',
        label: 'Main BGMI Account',
        playerId: '5550192834',
        verifiedNickname: 'SunNovaVanguard_91',
      },
      {
        id: 'spid-2',
        gameSlug: 'mobile-legends',
        gameName: 'Mobile Legends Diamonds',
        label: 'MLBB Mythic ID',
        playerId: '184920312',
        secondaryId: '2914',
        verifiedNickname: 'NovaStriker_44',
      },
    ],
    walletTransactions: [
      {
        txnId: 'WTX-8801',
        type: 'Credit',
        amountInr: 1500,
        description: 'UPI Wallet Add Money',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        txnId: 'WTX-8802',
        type: 'Cashback',
        amountInr: 18,
        description: '2% Sun Nova Cashback on SN-2026-1042',
        referenceId: 'SN-2026-1042',
        createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        title: 'Recharge Successful · #SN-2026-1042',
        message: '600 UC (+60 Bonus UC) credited to BGMI Character ID 5550192834.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      },
      {
        id: 'notif-2',
        title: 'Cashback Credited (+₹18)',
        message: 'You earned ₹18 Sun Nova Cashback on your BGMI recharge.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
];

const ordersStore: OrderRecord[] = [
  {
    orderId: 'SN-2026-1042',
    idempotencyKey: 'seed-order-1042',
    customerId: 'cust-1001',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
    status: 'Successful',
    currency: 'INR',
    paymentMethod: 'upi',
    paymentLabel: 'UPI Intent & QR',
    gatewayPaymentId: 'pay_SN_9821042',
    gatewayFeeInr: 0,
    supplierId: 'sup-krafton-in',
    supplierTxnId: 'KRF-TXN-771204',
    supplierLocked: true,
    customerEmail: 'arjun.nova@example.in',
    promoCode: 'NOVA5',
    subtotalInr: 725,
    discountInr: 36,
    totalInr: 689,
    totalCostInr: 660,
    commissionInr: 29,
    netProfitInr: 29,
    cashbackEarnedInr: 18,
    settlementStatus: 'Settled',
    timeline: [
      {
        status: 'Created',
        timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        note: 'Order initialized and locked with idempotency key.',
      },
      {
        status: 'Awaiting Payment',
        timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        note: 'UPI intent dispatched to Razorpay / Cashfree rail.',
      },
      {
        status: 'Payment Successful',
        timestamp: new Date(Date.now() - 1000 * 60 * 41.5).toISOString(),
        note: 'Webhook verified payment pay_SN_9821042.',
      },
      {
        status: 'Processing',
        timestamp: new Date(Date.now() - 1000 * 60 * 41.2).toISOString(),
        note: 'Submitted to KRAFTON India Partner Rail.',
      },
      {
        status: 'Successful',
        timestamp: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
        note: 'Supplier confirmed UC delivery (KRF-TXN-771204).',
      },
    ],
    items: [
      {
        gameSlug: 'bgmi',
        gameName: 'BGMI UC',
        kind: 'direct-topup',
        packId: 'bgmi-660',
        packLabel: '600 UC',
        bonusLabel: '+60 Bonus UC',
        quantity: 1,
        unitPriceInr: 725,
        costPriceInr: 660,
        lineTotalInr: 725,
        lineCostInr: 660,
        cashbackEarnedInr: 18,
        playerId: '5550192834',
        verifiedNickname: 'SunNovaVanguard_91',
      },
    ],
  },
];

const VERIFIED_HANDLE_POOL = [
  'SunNovaVanguard',
  'NovaStriker',
  'AetherPhoenix',
  'VayuBlaze',
  'AstralKestrel',
  'CobaltReaper',
  'IndraEclipse',
  'ZenithPulse',
];

function deterministicNickname(seedText: string): string {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  const base = VERIFIED_HANDLE_POOL[hash % VERIFIED_HANDLE_POOL.length];
  const suffix = (hash % 89) + 10;
  return `${base}_${suffix}`;
}

function generateVoucherCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${block()}-${block()}-${block()}`;
}

function sanitizeCustomer(customer: CustomerRecordInternal): CustomerProfile {
  const { passwordHash: _ignored, ...safeProfile } = customer;
  return safeProfile;
}

function enrichCatalogWithSupplierStatus(): GameTitle[] {
  return catalogStore.map((game) => {
    const supplier = suppliersStore.find((s) => s.id === game.supplierId);
    const supplierConfigured = Boolean(supplier && supplier.configured && supplier.active);
    const hasActivePack = game.packs.some((p) => p.active);
    return {
      ...game,
      supplierConfigured,
      isAvailable: Boolean(game.active && supplierConfigured && hasActivePack),
      packs: game.packs.filter((p) => p.active),
    };
  });
}

function getAuthenticatedCustomer(req: express.Request): CustomerRecordInternal | null {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const customerId = customerSessions.get(token);
  if (!customerId) return null;
  return customersStore.find((c) => c.id === customerId) || null;
}

function requireAdmin(req: express.Request, res: express.Response): string | null {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return null;
  }
  return adminSessions.get(token) || null;
}

function appendOrderTimeline(order: OrderRecord, status: OrderStatus, note: string) {
  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  order.timeline.push({ status, timestamp: now, note });
}

function dispatchOrderToSupplier(
  order: OrderRecord,
  simulateSupplierFailure = false,
): { ok: boolean; message: string } {
  // Prevent duplicate supplier dispatch when already processing or completed
  if (order.supplierLocked && order.status !== 'Failed') {
    return {
      ok: false,
      message: 'Supplier order is already locked or completed. Duplicate dispatch prevented.',
    };
  }

  const supplier = suppliersStore.find((s) => s.id === order.supplierId);
  if (!supplier || !supplier.configured || !supplier.active) {
    appendOrderTimeline(
      order,
      'Failed',
      'Configured supplier rail is unavailable or disabled.',
    );
    order.failureReason = 'Supplier integration is currently unconfigured or disabled.';
    order.supplierLocked = false;
    return { ok: false, message: order.failureReason };
  }

  order.supplierLocked = true;
  appendOrderTimeline(
    order,
    'Processing',
    `Dispatched to ${supplier.name} (${supplier.protocol}).`,
  );

  if (simulateSupplierFailure) {
    order.supplierLocked = false;
    order.failureReason = 'Supplier returned temporary timeout (ERR_SUPPLIER_TIMEOUT).';
    appendOrderTimeline(order, 'Failed', order.failureReason);
    return { ok: false, message: order.failureReason };
  }

  // Generate gift card PINs only after confirmed payment + supplier dispatch
  order.items = order.items.map((item) => {
    if (item.kind === 'gift-card' && !item.voucherCode) {
      const game = catalogStore.find((g) => g.slug === item.gameSlug);
      return {
        ...item,
        voucherCode: generateVoucherCode(game?.voucherTheme?.brandCode || 'SN'),
      };
    }
    return item;
  });

  const supplierTxnId = `${supplier.id.replace('sup-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`;
  order.supplierTxnId = supplierTxnId;
  order.failureReason = undefined;
  order.settlementStatus = 'Settled';
  appendOrderTimeline(
    order,
    'Successful',
    `${supplier.name} confirmed credit delivery (${supplierTxnId}).`,
  );

  // Credit cashback & notification if linked to customer profile
  if (order.customerId) {
    const customer = customersStore.find((c) => c.id === order.customerId);
    if (customer && order.cashbackEarnedInr > 0) {
      customer.cashbackBalanceInr += order.cashbackEarnedInr;
      customer.walletBalanceInr += order.cashbackEarnedInr;
      customer.walletTransactions.unshift({
        txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
        type: 'Cashback',
        amountInr: order.cashbackEarnedInr,
        referenceId: order.orderId,
        description: `Sun Nova Cashback credited for #${order.orderId}`,
        createdAt: new Date().toISOString(),
      });
      customer.notifications.unshift({
        id: `notif-${Date.now()}`,
        title: `Recharge Successful · #${order.orderId}`,
        message: `Your order has been delivered and ₹${order.cashbackEarnedInr} cashback was added to your wallet.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { ok: true, message: 'Delivered' };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      brand: websiteSettings.brandName,
      mode: websiteSettings.paymentMode,
    });
  });

  app.get('/api/catalog', (_req, res) => {
    res.json({
      titles: enrichCatalogWithSupplierStatus(),
      paymentChannels: paymentChannelsStore.filter((c) => c.enabled),
      coupons: couponsStore.filter((c) => c.active),
      banners: bannersStore.filter((b) => b.active),
      settings: {
        brandName: websiteSettings.brandName,
        mainBrand: websiteSettings.mainBrand,
        storeName: websiteSettings.storeName,
        tagline: websiteSettings.tagline,
        paymentMode: websiteSettings.paymentMode,
        defaultCashbackPercent: websiteSettings.defaultCashbackPercent,
        referralBonusInr: websiteSettings.referralBonusInr,
        turnstileEnabled: websiteSettings.turnstileEnabled,
        turnstileSiteKey: websiteSettings.turnstileSiteKey,
        supportEmail: websiteSettings.supportEmail,
      },
    });
  });

  // Cloudflare Turnstile verification helper
  app.post('/api/security/verify-turnstile', async (req, res) => {
    const { token } = req.body as { token?: string };
    if (!TURNSTILE_SECRET) {
      res.json({
        success: true,
        mode: 'sandbox',
        note: 'Turnstile sandbox pass (configure TURNSTILE_SECRET_KEY in production).',
      });
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', TURNSTILE_SECRET);
      formData.append('response', token || '');
      const verifyResp = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: formData },
      );
      const result = (await verifyResp.json()) as { success: boolean };
      res.json({ success: Boolean(result.success), mode: 'live' });
    } catch {
      res.status(502).json({ success: false, error: 'Turnstile verification failed.' });
    }
  });

  app.post('/api/verify-player', (req, res) => {
    const { gameSlug, playerId, secondaryId } = req.body as {
      gameSlug?: string;
      playerId?: string;
      secondaryId?: string;
    };

    const enriched = enrichCatalogWithSupplierStatus();
    const game = enriched.find((t) => t.slug === gameSlug);
    if (!game) {
      res.status(404).json({ valid: false, error: 'Game title not found.' });
      return;
    }
    if (!game.isAvailable) {
      res.status(409).json({
        valid: false,
        error: 'This game is temporarily unavailable pending supplier configuration.',
      });
      return;
    }

    const trimmedPrimary = (playerId || '').trim();
    if (!trimmedPrimary) {
      res.status(400).json({
        valid: false,
        error: `Please enter your ${game.accountConfig.primaryLabel}.`,
      });
      return;
    }

    const regex = new RegExp(game.accountConfig.primaryPattern);
    if (!regex.test(trimmedPrimary)) {
      res.status(400).json({
        valid: false,
        error: game.accountConfig.primaryHelp,
      });
      return;
    }

    if (game.accountConfig.secondaryType === 'zone-input') {
      const zone = (secondaryId || '').trim();
      if (!/^\d{3,6}$/.test(zone)) {
        res.status(400).json({
          valid: false,
          error: 'Please enter a valid 3–6 digit Zone ID.',
        });
        return;
      }
    }

    if (game.accountConfig.secondaryType === 'server-select' && !secondaryId) {
      res.status(400).json({
        valid: false,
        error: `Please select your ${game.accountConfig.secondaryLabel || 'Server'}.`,
      });
      return;
    }

    const nickname =
      game.kind === 'gift-card'
        ? trimmedPrimary
        : game.slug === 'valorant'
          ? trimmedPrimary.split('#')[0]
          : deterministicNickname(`${game.slug}:${trimmedPrimary}:${secondaryId || ''}`);

    res.json({
      valid: true,
      supported: true,
      nickname,
      region: secondaryId || game.regionLabel,
    });
  });

  // Customer Auth & Account Routes
  app.post('/api/auth/register', (req, res) => {
    const { name, email, phone, password, referralCode } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      referralCode?: string;
    };

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (customersStore.some((c) => c.email === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const refCode = `SUN${name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'NOVA'}${Math.floor(10 + Math.random() * 89)}`;
    let startingBonus = 0;

    if (referralCode) {
      const referrer = customersStore.find(
        (c) => c.referralCode.toLowerCase() === referralCode.trim().toLowerCase(),
      );
      if (referrer) {
        referrer.referredCount += 1;
        referrer.referralEarningsInr += websiteSettings.referralBonusInr;
        referrer.walletBalanceInr += websiteSettings.referralBonusInr;
        referrer.walletTransactions.unshift({
          txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
          type: 'Referral',
          amountInr: websiteSettings.referralBonusInr,
          description: `Referral bonus from ${name.trim()}`,
          createdAt: new Date().toISOString(),
        });
        startingBonus = 25;
      }
    }

    const newCustomer: CustomerRecordInternal = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      passwordHash: hashPassword(password),
      walletBalanceInr: startingBonus,
      cashbackBalanceInr: 0,
      referralCode: refCode,
      referredCount: 0,
      referralEarningsInr: 0,
      savedPlayerIds: [],
      walletTransactions:
        startingBonus > 0
          ? [
              {
                txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
                type: 'Referral',
                amountInr: startingBonus,
                description: 'Referral signup welcome credit',
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Welcome to POWERUP SUN NOVA',
          message: 'Your gamer wallet and cashback rewards are active.',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    customersStore.unshift(newCustomer);
    const token = crypto.randomBytes(24).toString('hex');
    customerSessions.set(token, newCustomer.id);

    res.status(201).json({
      token,
      customer: sanitizeCustomer(newCustomer),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const customer = customersStore.find((c) => c.email === cleanEmail);

    if (!customer || customer.passwordHash !== hashPassword(password || '')) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    customerSessions.set(token, customer.id);
    res.json({
      token,
      customer: sanitizeCustomer(customer),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) customerSessions.delete(token);
    res.json({ ok: true });
  });

  app.get('/api/customer/me', (req, res) => {
    const customer = getAuthenticatedCustomer(req);
    if (!customer) {
      res.status(401).json({ error: 'Please sign in to access your account.' });
      return;
    }
    const customerOrders = ordersStore.filter(
      (o) => o.customerId === customer.id || o.customerEmail === customer.email,
    );
    const customerRefunds = refundsStore.filter(
      (r) => r.customerEmail === customer.email,
    );
    res.json({
      customer: sanitizeCustomer(customer),
      orders: customerOrders,
      refunds: customerRefunds,
      coupons: couponsStore.filter((c) => c.active),
    });
  });

  app.post('/api/customer/wallet/topup', (req, res) => {
    const customer = getAuthenticatedCustomer(req);
    if (!customer) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (websiteSettings.paymentMode === 'live') {
      res.status(400).json({
        error: 'Live mode requires gateway webhook confirmation for wallet top-up.',
      });
      return;
    }
    const amount = Math.round(Number((req.body as { amountInr?: number }).amountInr) || 0);
    if (amount < 50 || amount > 25000) {
      res.status(400).json({ error: 'Enter an amount between ₹50 and ₹25,000.' });
      return;
    }

    customer.walletBalanceInr += amount;
    customer.walletTransactions.unshift({
      txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
      type: 'Credit',
      amountInr: amount,
      description: 'Sandbox UPI Wallet Add Money',
      createdAt: new Date().toISOString(),
    });
    customer.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `Wallet Credited (+₹${amount})`,
      message: `₹${amount} added to your POWERUP SUN NOVA wallet.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    res.json({ customer: sanitizeCustomer(customer) });
  });

  app.post('/api/customer/saved-ids', (req, res) => {
    const customer = getAuthenticatedCustomer(req);
    if (!customer) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const { gameSlug, label, playerId, secondaryId, verifiedNickname } = req.body as {
      gameSlug?: string;
      label?: string;
      playerId?: string;
      secondaryId?: string;
      verifiedNickname?: string;
    };
    const game = catalogStore.find((g) => g.slug === gameSlug);
    if (!game || !playerId?.trim()) {
      res.status(400).json({ error: 'Valid game and Player ID are required.' });
      return;
    }
    customer.savedPlayerIds.unshift({
      id: `spid-${Date.now()}`,
      gameSlug: game.slug,
      gameName: game.name,
      label: (label || `${game.name} ID`).trim(),
      playerId: playerId.trim(),
      secondaryId: secondaryId?.trim() || undefined,
      verifiedNickname: verifiedNickname?.trim() || undefined,
    });
    res.status(201).json({ customer: sanitizeCustomer(customer) });
  });

  app.delete('/api/customer/saved-ids/:id', (req, res) => {
    const customer = getAuthenticatedCustomer(req);
    if (!customer) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    customer.savedPlayerIds = customer.savedPlayerIds.filter(
      (item) => item.id !== req.params.id,
    );
    res.json({ customer: sanitizeCustomer(customer) });
  });

  app.post('/api/customer/notifications/read', (req, res) => {
    const customer = getAuthenticatedCustomer(req);
    if (!customer) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    customer.notifications = customer.notifications.map((n) => ({ ...n, read: true }));
    res.json({ customer: sanitizeCustomer(customer) });
  });

  // Order Tracking & Creation
  app.get('/api/orders', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    if (!query) {
      res.json({ orders: ordersStore });
      return;
    }
    const matched = ordersStore.filter(
      (order) =>
        order.orderId.toLowerCase().includes(query) ||
        order.customerEmail.toLowerCase().includes(query) ||
        order.items.some((i) => i.playerId.toLowerCase().includes(query)),
    );
    res.json({ orders: matched });
  });

  app.get('/api/orders/:orderId', (req, res) => {
    const order = ordersStore.find(
      (o) => o.orderId.toLowerCase() === req.params.orderId.toLowerCase(),
    );
    if (!order) {
      res.status(404).json({ error: 'Order reference not found.' });
      return;
    }
    res.json({ order });
  });

  // Step 1-4: Create Order (with Idempotency Guard & Supplier Availability Check)
  app.post('/api/orders', (req, res) => {
    const {
      items,
      currency,
      paymentMethod,
      customerEmail,
      promoCode,
      idempotencyKey,
    } = req.body as {
      items?: Array<{
        gameSlug: string;
        packId: string;
        quantity: number;
        playerId: string;
        secondaryId?: string;
        verifiedNickname?: string;
      }>;
      currency?: CurrencyCode;
      paymentMethod?: PaymentChannelId;
      customerEmail?: string;
      promoCode?: string;
      idempotencyKey?: string;
    };

    const effectiveIdempotencyKey =
      (idempotencyKey || '').trim() || `idem_${crypto.randomUUID()}`;
    const existingByIdempotency = ordersStore.find(
      (o) => o.idempotencyKey === effectiveIdempotencyKey,
    );
    if (existingByIdempotency) {
      res.json({ order: existingByIdempotency, duplicatePrevented: true });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your shopping bag is empty.' });
      return;
    }

    const cleanEmail = (customerEmail || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address for your receipt.' });
      return;
    }

    const channel =
      paymentChannelsStore.find((c) => c.id === paymentMethod && c.enabled) ||
      paymentChannelsStore.find((c) => c.enabled);
    if (!channel) {
      res.status(400).json({ error: 'No payment channel is currently enabled.' });
      return;
    }

    const enrichedCatalog = enrichCatalogWithSupplierStatus();
    const receiptItems: OrderItemReceipt[] = [];
    let subtotalInr = 0;
    let totalCostInr = 0;
    let cashbackEarnedInr = 0;
    let primarySupplierId = '';

    for (const item of items) {
      const game = enrichedCatalog.find((g) => g.slug === item.gameSlug);
      if (!game) {
        res.status(400).json({ error: `Unknown game item: ${item.gameSlug}` });
        return;
      }
      if (!game.isAvailable) {
        res.status(409).json({
          error: `${game.name} is unavailable until its supplier integration is configured.`,
        });
        return;
      }

      if (!primarySupplierId) primarySupplierId = game.supplierId;

      const pack = game.packs.find((p) => p.id === item.packId);
      if (!pack) {
        res.status(400).json({ error: `Invalid package selected for ${game.name}.` });
        return;
      }

      const qty = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      const lineTotalInr = pack.priceInr * qty;
      const lineCostInr = pack.costPriceInr * qty;
      const itemCashback = Math.round((lineTotalInr * pack.cashbackPercent) / 100);

      subtotalInr += lineTotalInr;
      totalCostInr += lineCostInr;
      cashbackEarnedInr += itemCashback;

      receiptItems.push({
        gameSlug: game.slug,
        gameName: game.name,
        kind: game.kind,
        packId: pack.id,
        packLabel: pack.label,
        bonusLabel: pack.bonusLabel,
        quantity: qty,
        unitPriceInr: pack.priceInr,
        costPriceInr: pack.costPriceInr,
        lineTotalInr,
        lineCostInr,
        cashbackEarnedInr: itemCashback,
        playerId: item.playerId.trim(),
        secondaryId: item.secondaryId?.trim() || undefined,
        verifiedNickname:
          item.verifiedNickname ||
          (game.kind === 'direct-topup'
            ? deterministicNickname(`${game.slug}:${item.playerId}`)
            : undefined),
      });
    }

    const normalizedPromo = (promoCode || '').trim().toUpperCase();
    let discountInr = 0;
    let appliedPromo: string | undefined;

    if (normalizedPromo) {
      const coupon = couponsStore.find(
        (c) => c.code.toUpperCase() === normalizedPromo && c.active,
      );
      if (coupon && subtotalInr >= coupon.minOrderInr) {
        discountInr =
          coupon.discountType === 'percent'
            ? Math.round((subtotalInr * coupon.value) / 100)
            : coupon.value;
        appliedPromo = coupon.code;
      }
    }

    const totalInr = Math.max(1, subtotalInr - discountInr);
    const gatewayFeeInr = Math.round((totalInr * channel.feePercent) / 100);
    const supplierCfg = suppliersStore.find((s) => s.id === primarySupplierId);
    const commissionInr = supplierCfg
      ? Math.round((totalInr * supplierCfg.commissionPercent) / 100)
      : 0;
    const netProfitInr = totalInr - totalCostInr - gatewayFeeInr;

    const authCustomer = getAuthenticatedCustomer(req);
    const orderId = `SN-2026-${Math.floor(2000 + Math.random() * 7999)}`;
    const now = new Date().toISOString();

    const newOrder: OrderRecord = {
      orderId,
      idempotencyKey: effectiveIdempotencyKey,
      customerId: authCustomer?.id,
      createdAt: now,
      updatedAt: now,
      status: 'Created',
      currency: currency || 'INR',
      paymentMethod: channel.id,
      paymentLabel: channel.name,
      gatewayFeeInr,
      supplierId: primarySupplierId,
      supplierLocked: false,
      customerEmail: cleanEmail,
      promoCode: appliedPromo,
      subtotalInr,
      discountInr,
      totalInr,
      totalCostInr,
      commissionInr,
      netProfitInr,
      cashbackEarnedInr,
      settlementStatus: 'Pending Settlement',
      timeline: [
        {
          status: 'Created',
          timestamp: now,
          note: `Order created (${receiptItems.length} item(s)).`,
        },
      ],
      items: receiptItems,
    };

    // If paid with Sun Nova Wallet, check balance and debit atomically
    if (channel.id === 'wallet') {
      if (!authCustomer) {
        res.status(401).json({
          error: 'Sign in to your POWERUP SUN NOVA account to pay with Sun Nova Wallet.',
        });
        return;
      }
      if (authCustomer.walletBalanceInr < totalInr) {
        res.status(400).json({
          error: `Insufficient Sun Nova Wallet balance (₹${authCustomer.walletBalanceInr} available, ₹${totalInr} required).`,
        });
        return;
      }

      authCustomer.walletBalanceInr -= totalInr;
      authCustomer.walletTransactions.unshift({
        txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
        type: 'Debit',
        amountInr: totalInr,
        referenceId: orderId,
        description: `Wallet payment for #${orderId}`,
        createdAt: now,
      });

      newOrder.gatewayPaymentId = `WALLET-${Date.now()}`;
      appendOrderTimeline(newOrder, 'Payment Successful', 'Settled via Sun Nova Wallet.');
      ordersStore.unshift(newOrder);
      dispatchOrderToSupplier(newOrder, false);
      res.status(201).json({ order: newOrder });
      return;
    }

    appendOrderTimeline(
      newOrder,
      'Awaiting Payment',
      `Payment session created via ${channel.name} (${channel.provider}).`,
    );
    ordersStore.unshift(newOrder);

    res.status(201).json({
      order: newOrder,
      paymentSession: {
        mode: websiteSettings.paymentMode,
        gatewayOrderRef: `gw_ord_${orderId}`,
        amountInr: totalInr,
        channel: channel.id,
      },
    });
  });

  // Sandbox Payment Confirmation (blocked in live production mode!)
  app.post('/api/payments/sandbox-confirm', (req, res) => {
    if (websiteSettings.paymentMode === 'live') {
      res.status(403).json({
        error:
          'Simulated payment confirmation is disabled in live production mode. Await gateway webhook.',
      });
      return;
    }

    const { orderId, outcome } = req.body as {
      orderId?: string;
      outcome?: 'success' | 'payment_failed' | 'supplier_failed';
    };

    const order = ordersStore.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.status !== 'Awaiting Payment' && order.status !== 'Created') {
      res.json({ order, note: 'Order already processed.' });
      return;
    }

    if (outcome === 'payment_failed') {
      order.failureReason = 'Customer cancelled or UPI mandate expired in sandbox.';
      order.settlementStatus = 'Reversed';
      appendOrderTimeline(order, 'Failed', order.failureReason);
      res.json({ order });
      return;
    }

    order.gatewayPaymentId = `pay_sbx_${Math.floor(1000000 + Math.random() * 8999999)}`;
    appendOrderTimeline(
      order,
      'Payment Successful',
      `Sandbox gateway verified payment (${order.gatewayPaymentId}).`,
    );
    dispatchOrderToSupplier(order, outcome === 'supplier_failed');
    res.json({ order });
  });

  // Production / Sandbox Gateway Webhook Endpoint with HMAC signature check
  app.post('/api/payments/webhook', (req, res) => {
    const signature = (req.headers['x-gateway-signature'] as string) || '';
    const { orderId, paymentId, status } = req.body as {
      orderId?: string;
      paymentId?: string;
      status?: 'captured' | 'failed';
    };

    if (websiteSettings.paymentMode === 'live') {
      const expected = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (!signature || signature !== expected) {
        res.status(401).json({ error: 'Invalid webhook HMAC signature.' });
        return;
      }
    }

    const order = ordersStore.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.status === 'Successful' || order.status === 'Processing') {
      res.json({ ok: true, deduplicated: true, order });
      return;
    }

    if (status === 'failed') {
      order.failureReason = 'Gateway reported payment failure via webhook.';
      order.settlementStatus = 'Reversed';
      appendOrderTimeline(order, 'Failed', order.failureReason);
      res.json({ ok: true, order });
      return;
    }

    order.gatewayPaymentId = paymentId || `pay_wh_${Date.now()}`;
    appendOrderTimeline(
      order,
      'Payment Successful',
      `Webhook verified payment ${order.gatewayPaymentId}.`,
    );
    dispatchOrderToSupplier(order, false);
    res.json({ ok: true, order });
  });

  // Refund Request (Prevents Duplicate Refunds)
  app.post('/api/orders/:orderId/refund', (req, res) => {
    const order = ordersStore.find((o) => o.orderId === req.params.orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.status === 'Refund Pending' || order.status === 'Refunded') {
      res.status(409).json({
        error: 'A refund is already pending or completed for this order.',
      });
      return;
    }
    if (order.status === 'Created' || order.status === 'Awaiting Payment') {
      res.status(400).json({ error: 'Unpaid orders do not require a refund.' });
      return;
    }
    if (refundsStore.some((r) => r.orderId === order.orderId)) {
      res.status(409).json({ error: 'Duplicate refund request blocked.' });
      return;
    }

    const { reason } = req.body as { reason?: string };
    const refund: RefundRequestRecord = {
      refundId: `REF-${Math.floor(10000 + Math.random() * 89999)}`,
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      amountInr: order.totalInr,
      reason: (reason || 'Customer requested recharge refund').trim(),
      status: 'Refund Pending',
      createdAt: new Date().toISOString(),
    };

    refundsStore.unshift(refund);
    appendOrderTimeline(order, 'Refund Pending', `Refund ${refund.refundId} queued.`);
    res.status(201).json({ refund, order });
  });

  // Support Tickets
  app.post('/api/support', (req, res) => {
    const { orderId, email, topic, message } = req.body as {
      orderId?: string;
      email?: string;
      topic?: string;
      message?: string;
    };

    if (!email || !email.includes('@') || !message || message.trim().length < 8) {
      res.status(400).json({
        error: 'Please provide a valid email address and message description.',
      });
      return;
    }

    const ticket: SupportTicket = {
      ticketId: `SUP-${Math.floor(10000 + Math.random() * 89999)}`,
      orderId: orderId?.trim() || undefined,
      email: email.trim(),
      topic: topic || 'Direct Top-Up Inquiry',
      message: message.trim(),
      status: 'Open',
      createdAt: new Date().toISOString(),
    };

    supportTicketsStore.unshift(ticket);
    res.status(201).json({ ticket });
  });

  // Admin Authentication & Operations APIs
  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (
      (email || '').trim().toLowerCase() !== ADMIN_EMAIL ||
      (password || '') !== ADMIN_PASSWORD
    ) {
      res.status(401).json({ error: 'Invalid admin credentials.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    adminSessions.set(token, ADMIN_EMAIL);
    res.json({ token, adminEmail: ADMIN_EMAIL });
  });

  app.get('/api/admin/overview', (req, res) => {
    if (!requireAdmin(req, res)) return;

    const successfulOrders = ordersStore.filter((o) => o.status === 'Successful');
    const totalRevenueInr = successfulOrders.reduce((s, o) => s + o.totalInr, 0);
    const totalCostInr = successfulOrders.reduce((s, o) => s + o.totalCostInr, 0);
    const totalGatewayFeesInr = successfulOrders.reduce((s, o) => s + o.gatewayFeeInr, 0);
    const totalCommissionInr = successfulOrders.reduce((s, o) => s + o.commissionInr, 0);
    const netProfitInr = successfulOrders.reduce((s, o) => s + o.netProfitInr, 0);

    res.json({
      metrics: {
        totalOrders: ordersStore.length,
        successfulOrders: successfulOrders.length,
        failedOrders: ordersStore.filter((o) => o.status === 'Failed').length,
        pendingRefunds: refundsStore.filter((r) => r.status === 'Refund Pending').length,
        totalRevenueInr,
        totalCostInr,
        totalGatewayFeesInr,
        totalCommissionInr,
        netProfitInr,
        totalCustomers: customersStore.length,
      },
      orders: ordersStore,
      refunds: refundsStore,
      customers: customersStore.map(sanitizeCustomer),
      games: catalogStore,
      suppliers: suppliersStore,
      paymentChannels: paymentChannelsStore,
      coupons: couponsStore,
      banners: bannersStore,
      tickets: supportTicketsStore,
      settings: websiteSettings,
    });
  });

  app.patch('/api/admin/games/:slug', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const game = catalogStore.find((g) => g.slug === req.params.slug);
    if (!game) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }
    const { active, supplierId, discountPercent } = req.body as {
      active?: boolean;
      supplierId?: string;
      discountPercent?: number;
    };
    if (typeof active === 'boolean') game.active = active;
    if (supplierId && suppliersStore.some((s) => s.id === supplierId)) {
      game.supplierId = supplierId;
    }
    if (typeof discountPercent === 'number') game.discountPercent = discountPercent;
    res.json({ game });
  });

  app.patch('/api/admin/packages/:gameSlug/:packId', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const game = catalogStore.find((g) => g.slug === req.params.gameSlug);
    const pack = game?.packs.find((p) => p.id === req.params.packId);
    if (!game || !pack) {
      res.status(404).json({ error: 'Package not found.' });
      return;
    }
    const { costPriceInr, priceInr, cashbackPercent, active } = req.body as {
      costPriceInr?: number;
      priceInr?: number;
      cashbackPercent?: number;
      active?: boolean;
    };
    if (typeof costPriceInr === 'number' && costPriceInr > 0) pack.costPriceInr = costPriceInr;
    if (typeof priceInr === 'number' && priceInr > 0) pack.priceInr = priceInr;
    if (typeof cashbackPercent === 'number' && cashbackPercent >= 0) {
      pack.cashbackPercent = cashbackPercent;
    }
    if (typeof active === 'boolean') pack.active = active;
    res.json({ pack });
  });

  app.patch('/api/admin/suppliers/:supplierId', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const supplier = suppliersStore.find((s) => s.id === req.params.supplierId);
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found.' });
      return;
    }
    const { configured, active, apiMode, commissionPercent, endpointUrl } = req.body as {
      configured?: boolean;
      active?: boolean;
      apiMode?: 'sandbox' | 'live';
      commissionPercent?: number;
      endpointUrl?: string;
    };
    if (typeof configured === 'boolean') supplier.configured = configured;
    if (typeof active === 'boolean') supplier.active = active;
    if (apiMode === 'sandbox' || apiMode === 'live') supplier.apiMode = apiMode;
    if (typeof commissionPercent === 'number') supplier.commissionPercent = commissionPercent;
    if (endpointUrl) supplier.endpointUrl = endpointUrl;
    res.json({ supplier });
  });

  app.patch('/api/admin/payments/:channelId', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const channel = paymentChannelsStore.find((c) => c.id === req.params.channelId);
    if (!channel) {
      res.status(404).json({ error: 'Payment channel not found.' });
      return;
    }
    const { enabled, feePercent } = req.body as {
      enabled?: boolean;
      feePercent?: number;
    };
    if (typeof enabled === 'boolean') channel.enabled = enabled;
    if (typeof feePercent === 'number' && feePercent >= 0) {
      channel.feePercent = feePercent;
      channel.feeNote = feePercent === 0 ? '0% gateway fee' : `${feePercent}% gateway fee`;
    }
    res.json({ channel });
  });

  app.post('/api/admin/orders/:orderId/retry-supplier', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const order = ordersStore.find((o) => o.orderId === req.params.orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.status !== 'Failed' || order.supplierLocked) {
      res.status(409).json({
        error:
          'Retry blocked: only Failed orders without an active supplier lock may be retried.',
      });
      return;
    }
    const result = dispatchOrderToSupplier(order, false);
    res.json({ order, result });
  });

  app.post('/api/admin/refunds/:refundId/resolve', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const refund = refundsStore.find((r) => r.refundId === req.params.refundId);
    if (!refund) {
      res.status(404).json({ error: 'Refund request not found.' });
      return;
    }
    if (refund.status !== 'Refund Pending') {
      res.status(409).json({ error: 'Refund already resolved. Duplicate action prevented.' });
      return;
    }

    const { action } = req.body as { action?: 'approve' | 'reject' };
    const order = ordersStore.find((o) => o.orderId === refund.orderId);
    const now = new Date().toISOString();

    if (action === 'reject') {
      refund.status = 'Rejected';
      refund.resolvedAt = now;
      if (order) {
        appendOrderTimeline(order, 'Failed', `Refund ${refund.refundId} rejected by admin.`);
      }
      res.json({ refund, order });
      return;
    }

    refund.status = 'Refunded';
    refund.resolvedAt = now;
    if (order) {
      order.settlementStatus = 'Reversed';
      appendOrderTimeline(
        order,
        'Refunded',
        `Automatic refund ${refund.refundId} completed (₹${refund.amountInr}).`,
      );
      if (order.customerId) {
        const customer = customersStore.find((c) => c.id === order.customerId);
        if (customer) {
          customer.walletBalanceInr += refund.amountInr;
          customer.walletTransactions.unshift({
            txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
            type: 'Refund',
            amountInr: refund.amountInr,
            referenceId: order.orderId,
            description: `Refund credited for #${order.orderId}`,
            createdAt: now,
          });
          customer.notifications.unshift({
            id: `notif-${Date.now()}`,
            title: `Refund Completed · #${order.orderId}`,
            message: `₹${refund.amountInr} has been refunded to your Sun Nova wallet.`,
            read: false,
            createdAt: now,
          });
        }
      }
    }

    res.json({ refund, order });
  });

  app.post('/api/admin/customers/:customerId/wallet', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const customer = customersStore.find((c) => c.id === req.params.customerId);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    const { amountInr, note } = req.body as { amountInr?: number; note?: string };
    const delta = Math.round(Number(amountInr) || 0);
    if (!delta) {
      res.status(400).json({ error: 'Non-zero adjustment amount required.' });
      return;
    }
    customer.walletBalanceInr = Math.max(0, customer.walletBalanceInr + delta);
    customer.walletTransactions.unshift({
      txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
      type: delta > 0 ? 'Credit' : 'Debit',
      amountInr: Math.abs(delta),
      description: note || 'Admin wallet adjustment',
      createdAt: new Date().toISOString(),
    });
    res.json({ customer: sanitizeCustomer(customer) });
  });

  app.patch('/api/admin/banners/:bannerId', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const banner = bannersStore.find((b) => b.id === req.params.bannerId);
    if (!banner) {
      res.status(404).json({ error: 'Banner not found.' });
      return;
    }
    const { title, subtitle, active } = req.body as {
      title?: string;
      subtitle?: string;
      active?: boolean;
    };
    if (title) banner.title = title;
    if (subtitle) banner.subtitle = subtitle;
    if (typeof active === 'boolean') banner.active = active;
    res.json({ banner });
  });

  app.patch('/api/admin/settings', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { tagline, paymentMode, defaultCashbackPercent, referralBonusInr } =
      req.body as Partial<WebsiteSettings>;
    if (tagline) websiteSettings.tagline = tagline;
    if (paymentMode === 'sandbox' || paymentMode === 'live') {
      websiteSettings.paymentMode = paymentMode;
    }
    if (typeof defaultCashbackPercent === 'number') {
      websiteSettings.defaultCashbackPercent = defaultCashbackPercent;
    }
    if (typeof referralBonusInr === 'number') {
      websiteSettings.referralBonusInr = referralBonusInr;
    }
    res.json({ settings: websiteSettings });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`${websiteSettings.brandName} listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
