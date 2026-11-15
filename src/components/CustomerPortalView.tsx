import { useEffect, useState } from 'react';
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Copy,
  Gift,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { formatCurrencyFromInr } from '../data/catalog';
import type {
  CouponRecord,
  CurrencyCode,
  CustomerProfile,
  GameTitle,
  OrderRecord,
  RefundRequestRecord,
} from '../types/store';

interface CustomerPortalViewProps {
  currency: CurrencyCode;
  paymentMode: 'sandbox' | 'live';
  games: GameTitle[];
  customer: CustomerProfile | null;
  customerToken: string | null;
  onAuthSuccess: (token: string, profile: CustomerProfile) => void;
  onCustomerUpdate: (profile: CustomerProfile) => void;
  onLogout: () => void;
  onSelectGame: (slug: string) => void;
  onOpenAdmin: () => void;
  onOpenSupport: () => void;
}

type CustomerTab =
  | 'profile'
  | 'wallet'
  | 'orders'
  | 'rewards'
  | 'saved-ids'
  | 'notifications';

export function CustomerPortalView({
  currency,
  paymentMode,
  games,
  customer,
  customerToken,
  onAuthSuccess,
  onCustomerUpdate,
  onLogout,
  onSelectGame,
  onOpenAdmin,
  onOpenSupport,
}: CustomerPortalViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<CustomerTab>('profile');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRequestRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [addMoneyAmount, setAddMoneyAmount] = useState('500');
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const [newIdGameSlug, setNewIdGameSlug] = useState(games[0]?.slug || 'bgmi');
  const [newIdLabel, setNewIdLabel] = useState('');
  const [newIdPrimary, setNewIdPrimary] = useState('');
  const [newIdSecondary, setNewIdSecondary] = useState('');

  const fetchCustomerBundle = async (token: string) => {
    try {
      const res = await fetch('/api/customer/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        customer: CustomerProfile;
        orders: OrderRecord[];
        refunds: RefundRequestRecord[];
        coupons: CouponRecord[];
      };
      onCustomerUpdate(data.customer);
      setOrders(data.orders || []);
      setRefunds(data.refunds || []);
      setCoupons(data.coupons || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (customerToken) {
      void fetchCustomerBundle(customerToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerToken]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        authMode === 'login'
          ? { email, password }
          : { name, email, phone, password, referralCode: referralInput || undefined };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        token?: string;
        customer?: CustomerProfile;
        error?: string;
      };
      if (!res.ok || !data.token || !data.customer) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      onAuthSuccess(data.token, data.customer);
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToken) return;
    setWalletMsg(null);
    const res = await fetch('/api/customer/wallet/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amountInr: Number(addMoneyAmount) }),
    });
    const data = (await res.json()) as { customer?: CustomerProfile; error?: string };
    if (!res.ok || !data.customer) {
      setWalletMsg(data.error || 'Unable to add funds.');
      return;
    }
    onCustomerUpdate(data.customer);
    setWalletMsg(`₹${addMoneyAmount} credited to your Sun Nova Wallet.`);
  };

  const handleSaveId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToken) return;
    const res = await fetch('/api/customer/saved-ids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        gameSlug: newIdGameSlug,
        label: newIdLabel || undefined,
        playerId: newIdPrimary,
        secondaryId: newIdSecondary || undefined,
      }),
    });
    const data = (await res.json()) as { customer?: CustomerProfile };
    if (res.ok && data.customer) {
      onCustomerUpdate(data.customer);
      setNewIdLabel('');
      setNewIdPrimary('');
      setNewIdSecondary('');
    }
  };

  const handleDeleteSavedId = async (id: string) => {
    if (!customerToken) return;
    const res = await fetch(`/api/customer/saved-ids/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = (await res.json()) as { customer?: CustomerProfile };
    if (res.ok && data.customer) {
      onCustomerUpdate(data.customer);
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!customerToken) return;
    const res = await fetch('/api/customer/notifications/read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = (await res.json()) as { customer?: CustomerProfile };
    if (res.ok && data.customer) {
      onCustomerUpdate(data.customer);
    }
  };

  const handleRequestRefund = async (orderId: string) => {
    if (!customerToken) return;
    await fetch(`/api/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer refund request from My Account' }),
    });
    await fetchCustomerBundle(customerToken);
  };

  if (!customer || !customerToken) {
    return (
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            POWERUP SUN NOVA Account
          </p>
          <h1 className="font-display text-2xl font-bold text-white mt-1">
            {authMode === 'login' ? 'Sign In to Your Gamer Wallet' : 'Create Your Sun Nova Account'}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Access your Sun Nova Wallet, Cashback Rewards, Saved Player IDs, Referral Bonus, and
            Order History.
          </p>

          <div className="mt-5 flex p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                authMode === 'login' ? 'bg-violet-600 text-white' : 'text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                authMode === 'register' ? 'bg-violet-600 text-white' : 'text-slate-300'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rohan Sharma"
                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="arjun.nova@example.in"
                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Referral Code (Optional — try SUNARJUN50)
                </label>
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="SUNARJUN50"
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 font-mono text-sm uppercase text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {authError && (
              <p
                role="alert"
                className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200"
              >
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold cursor-pointer min-h-[44px]"
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {paymentMode === 'sandbox' && authMode === 'login' && (
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('arjun.nova@example.in');
                  setPassword('SunNova2026!');
                }}
                className="w-full py-2 px-3 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-sky-300 hover:bg-white/10 cursor-pointer"
              >
                Fill Demo Customer Credentials (arjun.nova@example.in)
              </button>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white pt-1 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Admin Console</span>
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const unreadCount = customer.notifications.filter((n) => !n.read).length;

  const TABS: Array<{ id: CustomerTab; label: string }> = [
    { id: 'profile', label: 'My Profile' },
    { id: 'wallet', label: 'My Wallet' },
    { id: 'orders', label: 'Orders & Refunds' },
    { id: 'rewards', label: 'Cashback & Referrals' },
    { id: 'saved-ids', label: 'Saved Player IDs' },
    { id: 'notifications', label: `Notifications (${unreadCount})` },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Customer Summary Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            POWERUP SUN NOVA Customer Dashboard
          </p>
          <h1 className="font-display text-2xl font-bold text-white mt-1">
            Welcome back, {customer.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {customer.email} {customer.phone ? `· ${customer.phone}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] text-slate-400">Wallet Balance</p>
            <p className="font-mono text-base font-bold text-white tabular-nums">
              {formatCurrencyFromInr(customer.walletBalanceInr, currency)}
            </p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] text-slate-400">Cashback Earned</p>
            <p className="font-mono text-base font-bold text-emerald-400 tabular-nums">
              {formatCurrencyFromInr(customer.cashbackBalanceInr, currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 glass-card rounded-xl p-3 space-y-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
            <button
              type="button"
              onClick={onOpenSupport}
              className="w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Support Tickets
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium text-violet-300 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Admin Console
            </button>
          </div>
        </aside>

        {/* Main Tab Content */}
        <div className="lg:col-span-9 space-y-6">
          {activeTab === 'profile' && (
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-sky-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-white">My Profile</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400">Account Name</p>
                  <p className="font-semibold text-white mt-1">{customer.name}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400">Email Address</p>
                  <p className="font-semibold text-white mt-1">{customer.email}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400">Referral Code</p>
                  <p className="font-mono font-bold text-sky-400 mt-1">
                    {customer.referralCode}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400">Member Since</p>
                  <p className="font-semibold text-white mt-1">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-violet-400" aria-hidden="true" />
                  <h2 className="font-display text-lg font-bold text-white">
                    My Sun Nova Wallet · Add Money
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Pay instantly for any recharge with 0% gateway fee using your wallet balance.
                </p>

                <form onSubmit={handleAddMoney} className="mt-4 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Amount (INR)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={25000}
                      value={addMoneyAmount}
                      onChange={(e) => setAddMoneyAmount(e.target.value)}
                      className="h-10 w-40 px-3 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-white"
                    />
                  </div>
                  {['250', '500', '1000', '2000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddMoneyAmount(preset)}
                      className="h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-xs font-mono text-slate-200 hover:bg-white/10 cursor-pointer"
                    >
                      +₹{preset}
                    </button>
                  ))}
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add Money</span>
                  </button>
                </form>

                {walletMsg && (
                  <p className="mt-3 text-xs text-emerald-400">{walletMsg}</p>
                )}
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="font-display text-base font-bold text-white">
                    Wallet Ledger
                  </h3>
                </div>
                <div className="divide-y divide-white/10">
                  {customer.walletTransactions.length === 0 ? (
                    <p className="p-6 text-xs text-slate-400">No wallet transactions yet.</p>
                  ) : (
                    customer.walletTransactions.map((txn) => (
                      <div
                        key={txn.txnId}
                        className="px-6 py-3.5 flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{txn.description}</p>
                          <p className="text-slate-400 font-mono mt-0.5">
                            {txn.txnId} · {new Date(txn.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            txn.type === 'Debit' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {txn.type === 'Debit' ? '-' : '+'}
                          {formatCurrencyFromInr(txn.amountInr, currency)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="font-display text-lg font-bold text-white">Order History</h2>
                </div>
                <div className="divide-y divide-white/10">
                  {orders.length === 0 ? (
                    <p className="p-6 text-xs text-slate-400">No orders placed yet.</p>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.orderId}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-mono text-sm font-bold text-white">
                            #{order.orderId} ·{' '}
                            <span className="text-sky-400">{order.status}</span>
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {order.items.map((i) => `${i.gameName} (${i.packLabel})`).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {formatCurrencyFromInr(order.totalInr, currency)}
                          </span>
                          {(order.status === 'Failed' || order.status === 'Successful') && (
                            <button
                              type="button"
                              onClick={() => handleRequestRefund(order.orderId)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/35 text-xs text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" aria-hidden="true" />
                              <span>Refund</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="font-display text-base font-bold text-white">
                    Refund Requests
                  </h3>
                </div>
                <div className="divide-y divide-white/10">
                  {refunds.length === 0 ? (
                    <p className="p-6 text-xs text-slate-400">No refund requests submitted.</p>
                  ) : (
                    refunds.map((ref) => (
                      <div
                        key={ref.refundId}
                        className="px-6 py-3.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-mono font-bold text-white">
                            {ref.refundId} · Order #{ref.orderId}
                          </p>
                          <p className="text-slate-400 mt-0.5">{ref.reason}</p>
                        </div>
                        <span className="font-semibold text-amber-300">{ref.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-sky-400" aria-hidden="true" />
                  <h2 className="font-display text-lg font-bold text-white">
                    Referral Rewards &amp; Cashback
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  Invite friends with your code. They get ₹25 bonus credit and you earn ₹50 when
                  they register on POWERUP SUN NOVA.
                </p>
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-[11px] text-slate-400">Your Referral Code</p>
                    <p className="font-mono text-lg font-bold text-sky-400">
                      {customer.referralCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        void navigator.clipboard.writeText(customer.referralCode);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 1800);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    {copiedRef ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] text-slate-400">
                      Friends Referred: <strong className="text-white">{customer.referredCount}</strong>
                    </p>
                    <p className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                      Earned: {formatCurrencyFromInr(customer.referralEarningsInr, currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-white mb-4">
                  Active Promo Coupons
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.code}
                      className="p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <p className="font-mono text-sm font-bold text-violet-300">
                        {coupon.code}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">{coupon.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                        Min order: ₹{coupon.minOrderInr}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'saved-ids' && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bookmark className="w-5 h-5 text-violet-400" aria-hidden="true" />
                  <h2 className="font-display text-lg font-bold text-white">
                    Saved Player IDs
                  </h2>
                </div>

                <form onSubmit={handleSaveId} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={newIdGameSlug}
                    onChange={(e) => setNewIdGameSlug(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-white/15 bg-[#0F1322] text-xs text-white"
                  >
                    {games.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={newIdPrimary}
                    onChange={(e) => setNewIdPrimary(e.target.value)}
                    placeholder="Player UID / Riot ID"
                    className="h-10 px-3 rounded-lg border border-white/15 bg-white/5 font-mono text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newIdSecondary}
                    onChange={(e) => setNewIdSecondary(e.target.value)}
                    placeholder="Zone / Server (Optional)"
                    className="h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 cursor-pointer"
                  >
                    Save Player ID
                  </button>
                </form>

                <div className="mt-5 divide-y divide-white/10">
                  {customer.savedPlayerIds.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.gameName}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({item.label})
                          </span>
                        </p>
                        <p className="font-mono text-xs text-sky-400 mt-0.5">
                          {item.playerId}
                          {item.secondaryId ? ` (${item.secondaryId})` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectGame(item.gameSlug)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                        >
                          Recharge
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedId(item.id)}
                          aria-label="Delete saved ID"
                          className="p-2 text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <h2 className="font-display text-lg font-bold text-white">Notifications</h2>
                </div>
                <button
                  type="button"
                  onClick={handleMarkNotificationsRead}
                  className="text-xs font-semibold text-violet-300 hover:text-white cursor-pointer"
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-white/10">
                {customer.notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-6 py-4 ${n.read ? 'opacity-70' : 'bg-violet-600/5'}`}
                  >
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
