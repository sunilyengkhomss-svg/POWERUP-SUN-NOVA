import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { formatCurrencyFromInr } from '../data/catalog';
import type { CurrencyCode, OrderRecord } from '../types/store';

interface TrackOrderViewProps {
  currency: CurrencyCode;
  initialOrderId?: string;
  onSelectGame: (slug: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  Successful: 'text-emerald-400',
  Processing: 'text-sky-400',
  'Payment Successful': 'text-sky-300',
  'Awaiting Payment': 'text-amber-300',
  Created: 'text-slate-300',
  Failed: 'text-rose-400',
  'Refund Pending': 'text-amber-300',
  Refunded: 'text-violet-300',
};

export function TrackOrderView({
  currency,
  initialOrderId = '',
  onSelectGame,
}: TrackOrderViewProps) {
  const [query, setQuery] = useState(initialOrderId);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);

  const fetchOrders = async (searchText: string) => {
    setLoading(true);
    try {
      const url = searchText.trim()
        ? `/api/orders?q=${encodeURIComponent(searchText.trim())}`
        : '/api/orders';
      const res = await fetch(url);
      const data = (await res.json()) as { orders?: OrderRecord[] };
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(initialOrderId);
    void fetchOrders(initialOrderId);
  }, [initialOrderId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchOrders(query);
  };

  const handleCopy = (code: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    }
  };

  const handleRequestRefund = async (orderId: string) => {
    setRefundNotice(null);
    const res = await fetch(`/api/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer requested refund via Track Order' }),
    });
    const data = (await res.json()) as { error?: string; refund?: { refundId: string } };
    if (!res.ok) {
      setRefundNotice(data.error || 'Refund request could not be placed.');
    } else {
      setRefundNotice(`Refund request ${data.refund?.refundId} submitted for #${orderId}.`);
      void fetchOrders(query);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          Track Order &amp; Digital Receipts
        </h1>
        <p className="text-sm text-slate-400 mt-1.5">
          Search by Order ID (e.g. <span className="font-mono text-white">SN-2026-1042</span>),
          receipt email, or Player UID to inspect live supplier timelines and PINs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Order ID, email, or Player UID..."
            aria-label="Search orders"
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <button
          type="submit"
          className="px-5 h-11 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-blue-500 whitespace-nowrap shrink-0 cursor-pointer"
        >
          Lookup Order
        </button>
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              void fetchOrders('');
            }}
            className="px-4 h-11 rounded-lg border border-white/15 bg-white/5 text-sm font-medium text-slate-200 hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Show All
          </button>
        )}
      </form>

      {refundNotice && (
        <div className="mt-5 p-3.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200">
          {refundNotice}
        </div>
      )}

      <div className="mt-8 space-y-5">
        {loading ? (
          <div className="p-8 glass-card rounded-xl text-sm text-slate-400">
            Loading POWERUP SUN NOVA receipts...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 glass-card rounded-xl text-center">
            <p className="font-display text-base font-semibold text-white">
              No matching orders found
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Verify your Order ID or place a new recharge from the store.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const canRequestRefund =
              order.status === 'Failed' || order.status === 'Successful';
            return (
              <article
                key={order.orderId}
                className="glass-card rounded-xl overflow-hidden"
              >
                <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-sm font-bold text-white">
                      #{order.orderId}
                    </span>
                    <span
                      className={`text-xs font-semibold ${STATUS_STYLE[order.status] || 'text-slate-300'}`}
                    >
                      {order.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {order.paymentLabel} · <span className="text-white">{order.customerEmail}</span>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.gameName} — {item.packLabel} × {item.quantity}
                        </p>
                        <p className="font-mono text-xs text-slate-400 mt-1">
                          Target ID: {item.playerId}
                          {item.secondaryId ? ` (${item.secondaryId})` : ''}
                          {item.verifiedNickname ? ` · ${item.verifiedNickname}` : ''}
                        </p>
                        {item.voucherCode && (
                          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
                            <span className="font-mono text-xs font-semibold text-sky-300">
                              {item.voucherCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.voucherCode!)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-white cursor-pointer"
                            >
                              {copiedCode === item.voucherCode ? (
                                <>
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Copy PIN</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm font-semibold text-white tabular-nums">
                          {formatCurrencyFromInr(item.lineTotalInr, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectGame(item.gameSlug)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Top Up Again</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order State Timeline */}
                {order.timeline && order.timeline.length > 0 && (
                  <div className="px-6 py-3.5 border-t border-white/10 bg-black/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Fulfillment Timeline
                    </p>
                    <div className="space-y-1.5">
                      {order.timeline.map((evt, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                        >
                          <span className="text-slate-200">
                            <strong className={STATUS_STYLE[evt.status] || 'text-white'}>
                              {evt.status}
                            </strong>{' '}
                            — {evt.note}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-6 py-3 bg-white/5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">
                      {order.promoCode ? `Coupon: ${order.promoCode}` : 'Standard Checkout'}
                    </span>
                    {canRequestRefund && (
                      <button
                        type="button"
                        onClick={() => handleRequestRefund(order.orderId)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" aria-hidden="true" />
                        <span>Request Refund</span>
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-white tabular-nums">
                    Total Paid: {formatCurrencyFromInr(order.totalInr, currency)}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
