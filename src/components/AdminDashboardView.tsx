import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  LogOut,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { formatCurrencyFromInr } from '../data/catalog';
import type {
  BannerRecord,
  CouponRecord,
  CurrencyCode,
  CustomerProfile,
  GameTitle,
  OrderRecord,
  PaymentChannel,
  RefundRequestRecord,
  SupplierConfig,
  SupportTicket,
  WebsiteSettings,
} from '../types/store';

interface AdminOverviewData {
  metrics: {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    pendingRefunds: number;
    totalRevenueInr: number;
    totalCostInr: number;
    totalGatewayFeesInr: number;
    totalCommissionInr: number;
    netProfitInr: number;
    totalCustomers: number;
  };
  orders: OrderRecord[];
  refunds: RefundRequestRecord[];
  customers: CustomerProfile[];
  games: GameTitle[];
  suppliers: SupplierConfig[];
  paymentChannels: PaymentChannel[];
  coupons: CouponRecord[];
  banners: BannerRecord[];
  tickets: SupportTicket[];
  settings: WebsiteSettings;
}

type AdminSection =
  | 'overview'
  | 'orders'
  | 'refunds'
  | 'games'
  | 'suppliers'
  | 'payments'
  | 'customers'
  | 'banners';

interface AdminDashboardViewProps {
  currency: CurrencyCode;
  adminToken: string | null;
  onAdminLogin: (token: string) => void;
  onAdminLogout: () => void;
  onRefreshStorefront: () => void;
}

export function AdminDashboardView({
  currency,
  adminToken,
  onAdminLogin,
  onAdminLogout,
  onRefreshStorefront,
}: AdminDashboardViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>('overview');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const fetchOverview = async (token: string) => {
    const res = await fetch('/api/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      onAdminLogout();
      return;
    }
    const payload = (await res.json()) as AdminOverviewData;
    setData(payload);
  };

  useEffect(() => {
    if (adminToken) {
      void fetchOverview(adminToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !payload.token) {
      setLoginError(payload.error || 'Admin authentication failed.');
      return;
    }
    onAdminLogin(payload.token);
  };

  const notifyAndReload = async (message: string) => {
    setActionMsg(message);
    if (adminToken) await fetchOverview(adminToken);
    onRefreshStorefront();
  };

  if (!adminToken) {
    return (
      <section className="max-w-md mx-auto px-4 sm:px-6 py-14">
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-4 h-4" aria-hidden="true" />
            <span>POWERUP SUN NOVA Admin</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mt-2">
            Admin Console Sign In
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage games, purchase costs, selling prices, suppliers, gateways, orders, and
            settlements.
          </p>

          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@powerupsunnova.com"
                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white"
              />
            </div>

            {loginError && (
              <p role="alert" className="text-xs text-rose-300">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold cursor-pointer min-h-[44px]"
            >
              Access Admin Console
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setEmail('admin@powerupsunnova.com');
              setPassword('SunNovaAdmin#2026');
            }}
            className="mt-4 w-full py-2 px-3 rounded-lg border border-white/15 bg-white/5 text-xs text-sky-300 hover:bg-white/10 cursor-pointer"
          >
            Fill Sandbox Admin Credentials
          </button>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-slate-400">
        Loading POWERUP SUN NOVA Admin Console...
      </div>
    );
  }

  const NAV: Array<{ id: AdminSection; label: string }> = [
    { id: 'overview', label: 'Profit & Reports' },
    { id: 'orders', label: 'Orders & Failures' },
    { id: 'refunds', label: 'Refunds & Settlements' },
    { id: 'games', label: 'Games & Pricing' },
    { id: 'suppliers', label: 'Suppliers & API' },
    { id: 'payments', label: 'Payment Gateways' },
    { id: 'customers', label: 'Customers & Wallets' },
    { id: 'banners', label: 'Banners & Settings' },
  ];

  const filteredOrders = data.orders.filter(
    (o) => orderStatusFilter === 'ALL' || o.status === orderStatusFilter,
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            POWERUP SUN NOVA · Operations &amp; Business Console
          </p>
          <h1 className="font-display text-2xl font-bold text-white mt-1">
            Admin Management Workspace
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 font-mono">
            Mode: <strong className="text-amber-300 uppercase">{data.settings.paymentMode}</strong>
          </span>
          <button
            type="button"
            onClick={onAdminLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 glass-card rounded-xl p-3 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                section === item.id
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <div className="lg:col-span-9 space-y-6">
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-400">Gross Revenue</p>
                  <p className="font-mono text-lg font-bold text-white mt-1 tabular-nums">
                    {formatCurrencyFromInr(data.metrics.totalRevenueInr, currency)}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-400">Supplier Cost</p>
                  <p className="font-mono text-lg font-bold text-slate-200 mt-1 tabular-nums">
                    {formatCurrencyFromInr(data.metrics.totalCostInr, currency)}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-400">Commission + Fees</p>
                  <p className="font-mono text-lg font-bold text-sky-400 mt-1 tabular-nums">
                    {formatCurrencyFromInr(
                      data.metrics.totalCommissionInr + data.metrics.totalGatewayFeesInr,
                      currency,
                    )}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-400">Net Profit</p>
                  <p className="font-mono text-lg font-bold text-emerald-400 mt-1 tabular-nums">
                    {formatCurrencyFromInr(data.metrics.netProfitInr, currency)}
                  </p>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h2 className="font-display text-base font-bold text-white mb-4">
                  Order &amp; Settlement Breakdown
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400">Total Orders</p>
                    <p className="font-mono text-base font-bold text-white mt-1 tabular-nums">
                      {data.metrics.totalOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Successful Recharges</p>
                    <p className="font-mono text-base font-bold text-emerald-400 mt-1 tabular-nums">
                      {data.metrics.successfulOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Failed Recharges</p>
                    <p className="font-mono text-base font-bold text-rose-400 mt-1 tabular-nums">
                      {data.metrics.failedOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Pending Refunds</p>
                    <p className="font-mono text-base font-bold text-amber-300 mt-1 tabular-nums">
                      {data.metrics.pendingRefunds}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'orders' && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-white">
                  Order &amp; Failed Recharge Queue
                </h2>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-white/15 bg-[#0F1322] text-xs text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Successful">Successful</option>
                  <option value="Processing">Processing</option>
                  <option value="Awaiting Payment">Awaiting Payment</option>
                  <option value="Failed">Failed</option>
                  <option value="Refund Pending">Refund Pending</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Sell</th>
                      <th className="py-3 px-4 text-right">Cost</th>
                      <th className="py-3 px-4 text-right">Profit</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          {order.orderId}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{order.customerEmail}</td>
                        <td className="py-3 px-4 font-semibold text-sky-400">{order.status}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-white">
                          ₹{order.totalInr}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          ₹{order.totalCostInr}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">
                          ₹{order.netProfitInr}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {order.status === 'Failed' && !order.supplierLocked ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/orders/${order.orderId}/retry-supplier`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${adminToken}` },
                                });
                                await notifyAndReload(`Retried supplier dispatch for #${order.orderId}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-violet-600 text-white font-semibold cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          ) : (
                            <span className="text-slate-500">{order.settlementStatus}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'refunds' && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-display text-base font-bold text-white">
                  Automatic Refund &amp; Settlement Queue
                </h2>
              </div>
              <div className="divide-y divide-white/10">
                {data.refunds.length === 0 ? (
                  <p className="p-6 text-xs text-slate-400">
                    No refund requests pending. Failed orders can be refunded by customers or
                    admins with duplicate-refund protection.
                  </p>
                ) : (
                  data.refunds.map((ref) => (
                    <div
                      key={ref.refundId}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-mono font-bold text-white">
                          {ref.refundId} · Order #{ref.orderId} · ₹{ref.amountInr}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          {ref.customerEmail} · {ref.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ref.status === 'Refund Pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/refunds/${ref.refundId}/resolve`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${adminToken}`,
                                  },
                                  body: JSON.stringify({ action: 'approve' }),
                                });
                                await notifyAndReload(`Approved automatic refund ${ref.refundId}`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                            >
                              Approve Refund
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/refunds/${ref.refundId}/resolve`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${adminToken}`,
                                  },
                                  body: JSON.stringify({ action: 'reject' }),
                                });
                                await notifyAndReload(`Rejected refund ${ref.refundId}`);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-300 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="font-semibold text-violet-300">{ref.status}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {section === 'games' && (
            <div className="space-y-4">
              {data.games.map((game) => (
                <div key={game.slug} className="glass-card rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        {game.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {game.regionLabel} · Supplier: <span className="font-mono">{game.supplierId}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/games/${game.slug}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${adminToken}`,
                          },
                          body: JSON.stringify({ active: !game.active }),
                        });
                        await notifyAndReload(
                          `${game.name} ${!game.active ? 'enabled' : 'hidden'} on storefront`,
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        game.active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {game.active ? 'Active on Store' : 'Disabled'}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="py-2 pr-3">Package</th>
                          <th className="py-2 px-3">Purchase Cost (₹)</th>
                          <th className="py-2 px-3">Selling Price (₹)</th>
                          <th className="py-2 px-3">Margin (₹)</th>
                          <th className="py-2 pl-3 text-right">Quick Adjust</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {game.packs.slice(0, 4).map((pack) => (
                          <tr key={pack.id}>
                            <td className="py-2 pr-3 font-semibold text-white">{pack.label}</td>
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                              ₹{pack.costPriceInr}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-sky-400">
                              ₹{pack.priceInr}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-emerald-400">
                              ₹{pack.priceInr - pack.costPriceInr}
                            </td>
                            <td className="py-2 pl-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/admin/packages/${game.slug}/${pack.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${adminToken}`,
                                    },
                                    body: JSON.stringify({ priceInr: pack.priceInr + 5 }),
                                  });
                                  await notifyAndReload(`Updated ${pack.label} selling price`);
                                }}
                                className="px-2 py-1 rounded bg-white/10 text-white cursor-pointer"
                              >
                                +₹5
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/admin/packages/${game.slug}/${pack.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${adminToken}`,
                                    },
                                    body: JSON.stringify({
                                      priceInr: Math.max(pack.costPriceInr + 1, pack.priceInr - 5),
                                    }),
                                  });
                                  await notifyAndReload(`Updated ${pack.label} selling price`);
                                }}
                                className="px-2 py-1 rounded bg-white/10 text-white cursor-pointer"
                              >
                                -₹5
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === 'suppliers' && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-display text-base font-bold text-white">
                  Suppliers &amp; Gaming API Integrations
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Games linked to unconfigured or disabled suppliers are automatically hidden from
                  storefront purchase.
                </p>
              </div>
              <div className="divide-y divide-white/10">
                {data.suppliers.map((sup) => (
                  <div
                    key={sup.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{sup.name}</p>
                      <p className="font-mono text-slate-400 mt-0.5">
                        {sup.id} · {sup.protocol} · {sup.commissionPercent}% commission ·{' '}
                        {sup.avgLatencyMs}ms
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/suppliers/${sup.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${adminToken}`,
                            },
                            body: JSON.stringify({ configured: !sup.configured }),
                          });
                          await notifyAndReload(
                            `${sup.name} marked ${!sup.configured ? 'configured' : 'unconfigured'}`,
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          sup.configured
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {sup.configured ? 'API Configured' : 'Unconfigured'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/suppliers/${sup.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${adminToken}`,
                            },
                            body: JSON.stringify({ active: !sup.active }),
                          });
                          await notifyAndReload(
                            `${sup.name} ${!sup.active ? 'activated' : 'paused'}`,
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          sup.active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {sup.active ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'payments' && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-display text-base font-bold text-white">
                  Indian Payment Gateway Configuration
                </h2>
              </div>
              <div className="divide-y divide-white/10">
                {data.paymentChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="px-6 py-4 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{ch.name}</p>
                      <p className="text-slate-400 mt-0.5">
                        {ch.provider} · {ch.feeNote}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/payments/${ch.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${adminToken}`,
                          },
                          body: JSON.stringify({ enabled: !ch.enabled }),
                        });
                        await notifyAndReload(`${ch.name} ${!ch.enabled ? 'enabled' : 'disabled'}`);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        ch.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {ch.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'customers' && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-display text-base font-bold text-white">
                  Customers, Wallets, Cashback &amp; Referrals
                </h2>
              </div>
              <div className="divide-y divide-white/10">
                {data.customers.map((c) => (
                  <div
                    key={c.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {c.name} · <span className="text-slate-400 font-normal">{c.email}</span>
                      </p>
                      <p className="font-mono text-slate-400 mt-0.5">
                        Wallet: ₹{c.walletBalanceInr} · Cashback: ₹{c.cashbackBalanceInr} ·
                        Referrals: {c.referredCount} (Code: {c.referralCode})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/customers/${c.id}/wallet`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${adminToken}`,
                          },
                          body: JSON.stringify({
                            amountInr: 100,
                            note: 'Admin bonus credit (+₹100)',
                          }),
                        });
                        await notifyAndReload(`Credited +₹100 to ${c.name}'s wallet`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold cursor-pointer whitespace-nowrap"
                    >
                      +₹100 Wallet Bonus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'banners' && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-white">
                  Website Settings &amp; Security
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-slate-400">Brand &amp; Tagline</p>
                    <p className="font-semibold text-white mt-1">
                      {data.settings.brandName} — {data.settings.tagline}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-slate-400">Cloudflare Turnstile Site Key</p>
                    <p className="font-mono text-sky-400 mt-1">{data.settings.turnstileSiteKey}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const nextMode =
                        data.settings.paymentMode === 'sandbox' ? 'live' : 'sandbox';
                      await fetch('/api/admin/settings', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${adminToken}`,
                        },
                        body: JSON.stringify({ paymentMode: nextMode }),
                      });
                      await notifyAndReload(`Switched gateway mode to ${nextMode.toUpperCase()}`);
                    }}
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                  >
                    Toggle Payment Mode (Current: {data.settings.paymentMode.toUpperCase()})
                  </button>
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="font-display text-base font-bold text-white">
                    Promotional Banners
                  </h3>
                </div>
                <div className="divide-y divide-white/10">
                  {data.banners.map((b) => (
                    <div
                      key={b.id}
                      className="px-6 py-4 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white">{b.title}</p>
                        <p className="text-slate-400 mt-0.5">{b.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/banners/${b.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${adminToken}`,
                            },
                            body: JSON.stringify({ active: !b.active }),
                          });
                          await notifyAndReload(
                            `Banner "${b.title}" ${!b.active ? 'activated' : 'hidden'}`,
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          b.active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {b.active ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
