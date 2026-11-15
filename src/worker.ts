import {
  INITIAL_BANNERS,
  INITIAL_CATALOG_TITLES,
  INITIAL_COUPONS,
  INITIAL_PAYMENT_CHANNELS,
  INITIAL_SUPPLIERS,
  INITIAL_WEBSITE_SETTINGS,
} from './data/catalog.ts';
import {
  generateSunNovaAiReply,
  type AiChatHistoryTurn,
} from './server/aiSupport.ts';
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
} from './types/store.ts';

interface AssetsBinding {
  fetch(input: Request | string): Promise<Response>;
}

interface WorkerEnv {
  ASSETS: AssetsBinding;
  BRAND_NAME?: string;
  PAYMENT_MODE?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  GEMINI_API_KEY?: string;
}

interface CustomerInternal extends CustomerProfile {
  passwordHash: string;
}

const websiteSettings: WebsiteSettings = { ...INITIAL_WEBSITE_SETTINGS };
const suppliersStore: SupplierConfig[] = structuredClone(INITIAL_SUPPLIERS);
const paymentChannelsStore: PaymentChannel[] = structuredClone(INITIAL_PAYMENT_CHANNELS);
const catalogStore: GameTitle[] = structuredClone(INITIAL_CATALOG_TITLES);
const couponsStore: CouponRecord[] = structuredClone(INITIAL_COUPONS);
const bannersStore: BannerRecord[] = structuredClone(INITIAL_BANNERS);
const supportTicketsStore: SupportTicket[] = [];
const refundsStore: RefundRequestRecord[] = [];
const customerSessions = new Map<string, string>();
const adminSessions = new Map<string, string>();

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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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

const customersStore: CustomerInternal[] = [
  {
    id: 'cust-1001',
    name: 'Arjun Mehta',
    email: 'arjun.nova@example.in',
    phone: '+91 98201 44120',
    passwordHash: '',
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

let demoPasswordReady = false;
async function ensureSeedPassword() {
  if (demoPasswordReady) return;
  customersStore[0].passwordHash = await sha256Hex('sunnova:SunNova2026!');
  demoPasswordReady = true;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function sanitizeCustomer(customer: CustomerInternal): CustomerProfile {
  const { passwordHash: _ignored, ...safe } = customer;
  return safe;
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

function appendOrderTimeline(order: OrderRecord, status: OrderStatus, note: string) {
  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  order.timeline.push({ status, timestamp: now, note });
}

function dispatchOrderToSupplier(
  order: OrderRecord,
  simulateFailure = false,
): { ok: boolean; message: string } {
  if (order.supplierLocked && order.status !== 'Failed') {
    return { ok: false, message: 'Duplicate supplier dispatch prevented.' };
  }
  const supplier = suppliersStore.find((s) => s.id === order.supplierId);
  if (!supplier || !supplier.configured || !supplier.active) {
    order.failureReason = 'Configured supplier rail is unavailable or disabled.';
    order.supplierLocked = false;
    appendOrderTimeline(order, 'Failed', order.failureReason);
    return { ok: false, message: order.failureReason };
  }

  order.supplierLocked = true;
  appendOrderTimeline(order, 'Processing', `Dispatched to ${supplier.name}.`);

  if (simulateFailure) {
    order.supplierLocked = false;
    order.failureReason = 'Supplier returned temporary timeout (ERR_SUPPLIER_TIMEOUT).';
    appendOrderTimeline(order, 'Failed', order.failureReason);
    return { ok: false, message: order.failureReason };
  }

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

  const txnId = `${supplier.id.replace('sup-', '').toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`;
  order.supplierTxnId = txnId;
  order.failureReason = undefined;
  order.settlementStatus = 'Settled';
  appendOrderTimeline(order, 'Successful', `${supplier.name} delivered (${txnId}).`);

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
    }
  }
  return { ok: true, message: 'Delivered' };
}

function getAuthCustomer(request: Request): CustomerInternal | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const customerId = token ? customerSessions.get(token) : undefined;
  return customerId ? customersStore.find((c) => c.id === customerId) || null : null;
}

function getAuthAdmin(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token && adminSessions.has(token) ? adminSessions.get(token) || null : null;
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    await ensureSeedPassword();

    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    if (env.PAYMENT_MODE === 'live' || env.PAYMENT_MODE === 'sandbox') {
      websiteSettings.paymentMode = env.PAYMENT_MODE;
    }

    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const adminEmail = (env.ADMIN_EMAIL || 'admin@powerupsunnova.com').toLowerCase();
    const adminPassword = env.ADMIN_PASSWORD || 'SunNovaAdmin#2026';
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'sandbox_webhook_secret';

    if (pathname === '/api/health' && method === 'GET') {
      return jsonResponse({
        ok: true,
        brand: websiteSettings.brandName,
        mode: websiteSettings.paymentMode,
        runtime: 'cloudflare-workers',
      });
    }

    if (pathname === '/api/catalog' && method === 'GET') {
      return jsonResponse({
        titles: enrichCatalogWithSupplierStatus(),
        paymentChannels: paymentChannelsStore.filter((c) => c.enabled),
        coupons: couponsStore.filter((c) => c.active),
        banners: bannersStore.filter((b) => b.active),
        settings: {
          ...websiteSettings,
          turnstileSiteKey: env.TURNSTILE_SITE_KEY || websiteSettings.turnstileSiteKey,
        },
      });
    }

    if (pathname === '/api/security/verify-turnstile' && method === 'POST') {
      const body = await readJson<{ token?: string }>(request);
      if (!env.TURNSTILE_SECRET_KEY) {
        return jsonResponse({ success: true, mode: 'sandbox' });
      }
      const formData = new URLSearchParams();
      formData.append('secret', env.TURNSTILE_SECRET_KEY);
      formData.append('response', body.token || '');
      const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });
      const result = (await resp.json()) as { success: boolean };
      return jsonResponse({ success: Boolean(result.success), mode: 'live' });
    }

    if (pathname === '/api/verify-player' && method === 'POST') {
      const { gameSlug, playerId, secondaryId } = await readJson<{
        gameSlug?: string;
        playerId?: string;
        secondaryId?: string;
      }>(request);
      const game = enrichCatalogWithSupplierStatus().find((g) => g.slug === gameSlug);
      if (!game) return jsonResponse({ valid: false, error: 'Game title not found.' }, 404);
      if (!game.isAvailable) {
        return jsonResponse(
          { valid: false, error: 'Title unavailable pending supplier setup.' },
          409,
        );
      }
      const trimmed = (playerId || '').trim();
      if (!trimmed || !new RegExp(game.accountConfig.primaryPattern).test(trimmed)) {
        return jsonResponse({ valid: false, error: game.accountConfig.primaryHelp }, 400);
      }
      if (game.accountConfig.secondaryType === 'zone-input' && !/^\d{3,6}$/.test((secondaryId || '').trim())) {
        return jsonResponse({ valid: false, error: 'Please enter a valid 3–6 digit Zone ID.' }, 400);
      }
      if (game.accountConfig.secondaryType === 'server-select' && !secondaryId) {
        return jsonResponse({ valid: false, error: 'Please select your Server.' }, 400);
      }
      const nickname =
        game.kind === 'gift-card'
          ? trimmed
          : game.slug === 'valorant'
            ? trimmed.split('#')[0]
            : deterministicNickname(`${game.slug}:${trimmed}:${secondaryId || ''}`);
      return jsonResponse({
        valid: true,
        supported: true,
        nickname,
        region: secondaryId || game.regionLabel,
      });
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const { name, email, phone, password, referralCode } = await readJson<{
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
        referralCode?: string;
      }>(request);
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!name || name.trim().length < 2) {
        return jsonResponse({ error: 'Please enter your full name.' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
      }
      if (!password || password.length < 6) {
        return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
      }
      if (customersStore.some((c) => c.email === cleanEmail)) {
        return jsonResponse({ error: 'An account with this email already exists.' }, 409);
      }

      let startingBonus = 0;
      if (referralCode) {
        const ref = customersStore.find(
          (c) => c.referralCode.toLowerCase() === referralCode.trim().toLowerCase(),
        );
        if (ref) {
          ref.referredCount += 1;
          ref.referralEarningsInr += websiteSettings.referralBonusInr;
          ref.walletBalanceInr += websiteSettings.referralBonusInr;
          startingBonus = 25;
        }
      }

      const newCust: CustomerInternal = {
        id: `cust-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        phone: (phone || '').trim(),
        passwordHash: await sha256Hex(`sunnova:${password}`),
        walletBalanceInr: startingBonus,
        cashbackBalanceInr: 0,
        referralCode: `SUN${Math.floor(1000 + Math.random() * 8999)}`,
        referredCount: 0,
        referralEarningsInr: 0,
        savedPlayerIds: [],
        walletTransactions: [],
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
      customersStore.unshift(newCust);
      const token = crypto.randomUUID();
      customerSessions.set(token, newCust.id);
      return jsonResponse({ token, customer: sanitizeCustomer(newCust) }, 201);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await readJson<{ email?: string; password?: string }>(request);
      const cleanEmail = (email || '').trim().toLowerCase();
      const customer = customersStore.find((c) => c.email === cleanEmail);
      const pwHash = await sha256Hex(`sunnova:${password || ''}`);
      if (!customer || customer.passwordHash !== pwHash) {
        return jsonResponse({ error: 'Invalid email or password.' }, 401);
      }
      const token = crypto.randomUUID();
      customerSessions.set(token, customer.id);
      return jsonResponse({ token, customer: sanitizeCustomer(customer) });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const header = request.headers.get('authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (token) customerSessions.delete(token);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/customer/me' && method === 'GET') {
      const customer = getAuthCustomer(request);
      if (!customer) return jsonResponse({ error: 'Authentication required.' }, 401);
      return jsonResponse({
        customer: sanitizeCustomer(customer),
        orders: ordersStore.filter((o) => o.customerId === customer.id || o.customerEmail === customer.email),
        refunds: refundsStore.filter((r) => r.customerEmail === customer.email),
        coupons: couponsStore.filter((c) => c.active),
      });
    }

    if (pathname === '/api/customer/wallet/topup' && method === 'POST') {
      const customer = getAuthCustomer(request);
      if (!customer) return jsonResponse({ error: 'Authentication required.' }, 401);
      if (websiteSettings.paymentMode === 'live') {
        return jsonResponse({ error: 'Live mode requires gateway webhook confirmation.' }, 400);
      }
      const body = await readJson<{ amountInr?: number }>(request);
      const amount = Math.round(Number(body.amountInr) || 0);
      if (amount < 50 || amount > 25000) {
        return jsonResponse({ error: 'Enter an amount between ₹50 and ₹25,000.' }, 400);
      }
      customer.walletBalanceInr += amount;
      customer.walletTransactions.unshift({
        txnId: `WTX-${Math.floor(1000 + Math.random() * 8999)}`,
        type: 'Credit',
        amountInr: amount,
        description: 'Sandbox UPI Wallet Add Money',
        createdAt: new Date().toISOString(),
      });
      return jsonResponse({ customer: sanitizeCustomer(customer) });
    }

    if (pathname === '/api/customer/saved-ids' && method === 'POST') {
      const customer = getAuthCustomer(request);
      if (!customer) return jsonResponse({ error: 'Authentication required.' }, 401);
      const { gameSlug, label, playerId, secondaryId, verifiedNickname } = await readJson<{
        gameSlug?: string;
        label?: string;
        playerId?: string;
        secondaryId?: string;
        verifiedNickname?: string;
      }>(request);
      const game = catalogStore.find((g) => g.slug === gameSlug);
      if (!game || !playerId?.trim()) {
        return jsonResponse({ error: 'Valid game and Player ID are required.' }, 400);
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
      return jsonResponse({ customer: sanitizeCustomer(customer) }, 201);
    }

    if (pathname.startsWith('/api/customer/saved-ids/') && method === 'DELETE') {
      const customer = getAuthCustomer(request);
      if (!customer) return jsonResponse({ error: 'Authentication required.' }, 401);
      const id = pathname.replace('/api/customer/saved-ids/', '');
      customer.savedPlayerIds = customer.savedPlayerIds.filter((s) => s.id !== id);
      return jsonResponse({ customer: sanitizeCustomer(customer) });
    }

    if (pathname === '/api/customer/notifications/read' && method === 'POST') {
      const customer = getAuthCustomer(request);
      if (!customer) return jsonResponse({ error: 'Authentication required.' }, 401);
      customer.notifications = customer.notifications.map((n) => ({ ...n, read: true }));
      return jsonResponse({ customer: sanitizeCustomer(customer) });
    }

    if (pathname === '/api/orders' && method === 'GET') {
      const query = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (!query) return jsonResponse({ orders: ordersStore });
      const matched = ordersStore.filter(
        (order) =>
          order.orderId.toLowerCase().includes(query) ||
          order.customerEmail.toLowerCase().includes(query) ||
          order.items.some((i) => i.playerId.toLowerCase().includes(query)),
      );
      return jsonResponse({ orders: matched });
    }

    if (pathname === '/api/orders' && method === 'POST') {
      const { items, currency, paymentMethod, customerEmail, promoCode, idempotencyKey } =
        await readJson<{
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
        }>(request);

      const effectiveKey = (idempotencyKey || '').trim() || `idem_${crypto.randomUUID()}`;
      const existing = ordersStore.find((o) => o.idempotencyKey === effectiveKey);
      if (existing) {
        return jsonResponse({ order: existing, duplicatePrevented: true });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return jsonResponse({ error: 'Your shopping bag is empty.' }, 400);
      }
      const cleanEmail = (customerEmail || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
      }
      const channel =
        paymentChannelsStore.find((c) => c.id === paymentMethod && c.enabled) ||
        paymentChannelsStore.find((c) => c.enabled);
      if (!channel) {
        return jsonResponse({ error: 'No payment channel enabled.' }, 400);
      }

      const enriched = enrichCatalogWithSupplierStatus();
      const receiptItems: OrderItemReceipt[] = [];
      let subtotalInr = 0;
      let totalCostInr = 0;
      let cashbackEarnedInr = 0;
      let primarySupplierId = '';

      for (const item of items) {
        const game = enriched.find((g) => g.slug === item.gameSlug);
        if (!game) return jsonResponse({ error: `Unknown game item: ${item.gameSlug}` }, 400);
        if (!game.isAvailable) {
          return jsonResponse({ error: `${game.name} is unavailable.` }, 409);
        }
        if (!primarySupplierId) primarySupplierId = game.supplierId;
        const pack = game.packs.find((p) => p.id === item.packId);
        if (!pack) return jsonResponse({ error: 'Invalid package selected.' }, 400);
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
      const authCustomer = getAuthCustomer(request);
      const orderId = `SN-2026-${Math.floor(2000 + Math.random() * 7999)}`;
      const now = new Date().toISOString();

      const newOrder: OrderRecord = {
        orderId,
        idempotencyKey: effectiveKey,
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
        timeline: [{ status: 'Created', timestamp: now, note: 'Order initialized.' }],
        items: receiptItems,
      };

      if (channel.id === 'wallet') {
        if (!authCustomer) {
          return jsonResponse({ error: 'Sign in to pay with Sun Nova Wallet.' }, 401);
        }
        if (authCustomer.walletBalanceInr < totalInr) {
          return jsonResponse({ error: 'Insufficient Sun Nova Wallet balance.' }, 400);
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
        return jsonResponse({ order: newOrder }, 201);
      }

      appendOrderTimeline(newOrder, 'Awaiting Payment', `Payment session created (${channel.name}).`);
      ordersStore.unshift(newOrder);
      return jsonResponse({ order: newOrder }, 201);
    }

    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/refund') && method === 'POST') {
      const orderId = pathname.slice('/api/orders/'.length, -'/refund'.length);
      const order = ordersStore.find((o) => o.orderId === orderId);
      if (!order) return jsonResponse({ error: 'Order not found.' }, 404);
      if (order.status === 'Refund Pending' || order.status === 'Refunded') {
        return jsonResponse({ error: 'Refund already pending or completed.' }, 409);
      }
      if (refundsStore.some((r) => r.orderId === order.orderId)) {
        return jsonResponse({ error: 'Duplicate refund blocked.' }, 409);
      }
      const body = await readJson<{ reason?: string }>(request);
      const refund: RefundRequestRecord = {
        refundId: `REF-${Math.floor(10000 + Math.random() * 89999)}`,
        orderId: order.orderId,
        customerEmail: order.customerEmail,
        amountInr: order.totalInr,
        reason: (body.reason || 'Customer requested refund').trim(),
        status: 'Refund Pending',
        createdAt: new Date().toISOString(),
      };
      refundsStore.unshift(refund);
      appendOrderTimeline(order, 'Refund Pending', `Refund ${refund.refundId} queued.`);
      return jsonResponse({ refund, order }, 201);
    }

    if (pathname.startsWith('/api/orders/') && method === 'GET') {
      const orderId = pathname.slice('/api/orders/'.length);
      const order = ordersStore.find((o) => o.orderId.toLowerCase() === orderId.toLowerCase());
      if (!order) return jsonResponse({ error: 'Order not found.' }, 404);
      return jsonResponse({ order });
    }

    if (pathname === '/api/payments/sandbox-confirm' && method === 'POST') {
      if (websiteSettings.paymentMode === 'live') {
        return jsonResponse({ error: 'Simulated payment disabled in live mode.' }, 403);
      }
      const { orderId, outcome } = await readJson<{
        orderId?: string;
        outcome?: 'success' | 'payment_failed' | 'supplier_failed';
      }>(request);
      const order = ordersStore.find((o) => o.orderId === orderId);
      if (!order) return jsonResponse({ error: 'Order not found.' }, 404);
      if (order.status !== 'Awaiting Payment' && order.status !== 'Created') {
        return jsonResponse({ order });
      }
      if (outcome === 'payment_failed') {
        order.failureReason = 'Customer cancelled or UPI mandate expired in sandbox.';
        order.settlementStatus = 'Reversed';
        appendOrderTimeline(order, 'Failed', order.failureReason);
        return jsonResponse({ order });
      }
      order.gatewayPaymentId = `pay_sbx_${Math.floor(1000000 + Math.random() * 8999999)}`;
      appendOrderTimeline(order, 'Payment Successful', `Sandbox payment verified (${order.gatewayPaymentId}).`);
      dispatchOrderToSupplier(order, outcome === 'supplier_failed');
      return jsonResponse({ order });
    }

    if (pathname === '/api/payments/webhook' && method === 'POST') {
      const rawBody = await request.text();
      const signature = request.headers.get('x-gateway-signature') || '';
      if (websiteSettings.paymentMode === 'live') {
        const expected = await hmacSha256Hex(webhookSecret, rawBody);
        if (!signature || signature !== expected) {
          return jsonResponse({ error: 'Invalid webhook HMAC signature.' }, 401);
        }
      }
      const body = JSON.parse(rawBody || '{}') as {
        orderId?: string;
        paymentId?: string;
        status?: 'captured' | 'failed';
      };
      const order = ordersStore.find((o) => o.orderId === body.orderId);
      if (!order) return jsonResponse({ error: 'Order not found.' }, 404);
      if (order.status === 'Successful' || order.status === 'Processing') {
        return jsonResponse({ ok: true, deduplicated: true, order });
      }
      if (body.status === 'failed') {
        order.failureReason = 'Gateway reported payment failure via webhook.';
        order.settlementStatus = 'Reversed';
        appendOrderTimeline(order, 'Failed', order.failureReason);
        return jsonResponse({ ok: true, order });
      }
      order.gatewayPaymentId = body.paymentId || `pay_wh_${Date.now()}`;
      appendOrderTimeline(order, 'Payment Successful', `Webhook verified ${order.gatewayPaymentId}.`);
      dispatchOrderToSupplier(order, false);
      return jsonResponse({ ok: true, order });
    }

    if (pathname === '/api/support' && method === 'POST') {
      const { orderId, email, topic, message } = await readJson<{
        orderId?: string;
        email?: string;
        topic?: string;
        message?: string;
      }>(request);
      if (!email || !email.includes('@') || !message || message.trim().length < 8) {
        return jsonResponse({ error: 'Valid email and message required.' }, 400);
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
      return jsonResponse({ ticket }, 201);
    }

    if (pathname === '/api/ai-chat' && method === 'POST') {
      const { message, history } = await readJson<{
        message?: string;
        history?: AiChatHistoryTurn[];
      }>(request);

      const result = await generateSunNovaAiReply({
        apiKey: env.GEMINI_API_KEY,
        message: message || '',
        history,
        catalog: catalogStore,
        coupons: couponsStore,
        paymentChannels: paymentChannelsStore,
        orders: ordersStore,
        settings: websiteSettings,
      });

      if (result.error) {
        return jsonResponse({ error: result.error }, result.statusCode);
      }
      return jsonResponse({ reply: result.reply });
    }

    if (pathname === '/api/admin/login' && method === 'POST') {
      const { email, password } = await readJson<{ email?: string; password?: string }>(request);
      if ((email || '').trim().toLowerCase() !== adminEmail || (password || '') !== adminPassword) {
        return jsonResponse({ error: 'Invalid admin credentials.' }, 401);
      }
      const token = crypto.randomUUID();
      adminSessions.set(token, adminEmail);
      return jsonResponse({ token, adminEmail });
    }

    if (pathname.startsWith('/api/admin/')) {
      if (!getAuthAdmin(request)) {
        return jsonResponse({ error: 'Admin authentication required.' }, 401);
      }

      if (pathname === '/api/admin/overview' && method === 'GET') {
        const successfulOrders = ordersStore.filter((o) => o.status === 'Successful');
        return jsonResponse({
          metrics: {
            totalOrders: ordersStore.length,
            successfulOrders: successfulOrders.length,
            failedOrders: ordersStore.filter((o) => o.status === 'Failed').length,
            pendingRefunds: refundsStore.filter((r) => r.status === 'Refund Pending').length,
            totalRevenueInr: successfulOrders.reduce((s, o) => s + o.totalInr, 0),
            totalCostInr: successfulOrders.reduce((s, o) => s + o.totalCostInr, 0),
            totalGatewayFeesInr: successfulOrders.reduce((s, o) => s + o.gatewayFeeInr, 0),
            totalCommissionInr: successfulOrders.reduce((s, o) => s + o.commissionInr, 0),
            netProfitInr: successfulOrders.reduce((s, o) => s + o.netProfitInr, 0),
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
      }

      if (pathname.startsWith('/api/admin/games/') && method === 'PATCH') {
        const slug = pathname.replace('/api/admin/games/', '');
        const game = catalogStore.find((g) => g.slug === slug);
        if (!game) return jsonResponse({ error: 'Game not found.' }, 404);
        const body = await readJson<{ active?: boolean; supplierId?: string; discountPercent?: number }>(request);
        if (typeof body.active === 'boolean') game.active = body.active;
        if (body.supplierId) game.supplierId = body.supplierId;
        if (typeof body.discountPercent === 'number') game.discountPercent = body.discountPercent;
        return jsonResponse({ game });
      }

      if (pathname.startsWith('/api/admin/packages/') && method === 'PATCH') {
        const [, , , , gameSlug, packId] = pathname.split('/');
        const game = catalogStore.find((g) => g.slug === gameSlug);
        const pack = game?.packs.find((p) => p.id === packId);
        if (!pack) return jsonResponse({ error: 'Package not found.' }, 404);
        const body = await readJson<{ costPriceInr?: number; priceInr?: number; active?: boolean }>(request);
        if (typeof body.costPriceInr === 'number' && body.costPriceInr > 0) pack.costPriceInr = body.costPriceInr;
        if (typeof body.priceInr === 'number' && body.priceInr > 0) pack.priceInr = body.priceInr;
        if (typeof body.active === 'boolean') pack.active = body.active;
        return jsonResponse({ pack });
      }

      if (pathname.startsWith('/api/admin/suppliers/') && method === 'PATCH') {
        const id = pathname.replace('/api/admin/suppliers/', '');
        const supplier = suppliersStore.find((s) => s.id === id);
        if (!supplier) return jsonResponse({ error: 'Supplier not found.' }, 404);
        const body = await readJson<{ configured?: boolean; active?: boolean }>(request);
        if (typeof body.configured === 'boolean') supplier.configured = body.configured;
        if (typeof body.active === 'boolean') supplier.active = body.active;
        return jsonResponse({ supplier });
      }

      if (pathname.startsWith('/api/admin/payments/') && method === 'PATCH') {
        const id = pathname.replace('/api/admin/payments/', '');
        const ch = paymentChannelsStore.find((c) => c.id === id);
        if (!ch) return jsonResponse({ error: 'Channel not found.' }, 404);
        const body = await readJson<{ enabled?: boolean }>(request);
        if (typeof body.enabled === 'boolean') ch.enabled = body.enabled;
        return jsonResponse({ channel: ch });
      }

      if (pathname.startsWith('/api/admin/orders/') && pathname.endsWith('/retry-supplier') && method === 'POST') {
        const orderId = pathname.slice('/api/admin/orders/'.length, -'/retry-supplier'.length);
        const order = ordersStore.find((o) => o.orderId === orderId);
        if (!order || order.status !== 'Failed' || order.supplierLocked) {
          return jsonResponse({ error: 'Retry blocked.' }, 409);
        }
        const result = dispatchOrderToSupplier(order, false);
        return jsonResponse({ order, result });
      }

      if (pathname.startsWith('/api/admin/refunds/') && pathname.endsWith('/resolve') && method === 'POST') {
        const refundId = pathname.slice('/api/admin/refunds/'.length, -'/resolve'.length);
        const refund = refundsStore.find((r) => r.refundId === refundId);
        if (!refund || refund.status !== 'Refund Pending') {
          return jsonResponse({ error: 'Refund not pending.' }, 409);
        }
        const body = await readJson<{ action?: 'approve' | 'reject' }>(request);
        const order = ordersStore.find((o) => o.orderId === refund.orderId);
        const now = new Date().toISOString();
        if (body.action === 'reject') {
          refund.status = 'Rejected';
          refund.resolvedAt = now;
          return jsonResponse({ refund, order });
        }
        refund.status = 'Refunded';
        refund.resolvedAt = now;
        if (order) {
          order.settlementStatus = 'Reversed';
          appendOrderTimeline(order, 'Refunded', `Refund ${refund.refundId} completed.`);
          if (order.customerId) {
            const cust = customersStore.find((c) => c.id === order.customerId);
            if (cust) cust.walletBalanceInr += refund.amountInr;
          }
        }
        return jsonResponse({ refund, order });
      }

      if (pathname.startsWith('/api/admin/customers/') && pathname.endsWith('/wallet') && method === 'POST') {
        const custId = pathname.slice('/api/admin/customers/'.length, -'/wallet'.length);
        const cust = customersStore.find((c) => c.id === custId);
        if (!cust) return jsonResponse({ error: 'Customer not found.' }, 404);
        const body = await readJson<{ amountInr?: number }>(request);
        cust.walletBalanceInr = Math.max(0, cust.walletBalanceInr + Math.round(Number(body.amountInr) || 0));
        return jsonResponse({ customer: sanitizeCustomer(cust) });
      }

      if (pathname.startsWith('/api/admin/banners/') && method === 'PATCH') {
        const id = pathname.replace('/api/admin/banners/', '');
        const banner = bannersStore.find((b) => b.id === id);
        if (!banner) return jsonResponse({ error: 'Banner not found.' }, 404);
        const body = await readJson<{ active?: boolean }>(request);
        if (typeof body.active === 'boolean') banner.active = body.active;
        return jsonResponse({ banner });
      }

      if (pathname === '/api/admin/settings' && method === 'PATCH') {
        const body = await readJson<Partial<WebsiteSettings>>(request);
        if (body.paymentMode === 'sandbox' || body.paymentMode === 'live') {
          websiteSettings.paymentMode = body.paymentMode;
        }
        return jsonResponse({ settings: websiteSettings });
      }
    }

    return jsonResponse({ error: 'API route not found.' }, 404);
  },
};
