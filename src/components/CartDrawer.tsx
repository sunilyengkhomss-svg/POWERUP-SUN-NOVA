import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { formatCurrencyFromInr } from '../data/catalog';
import type {
  CartItem,
  CouponRecord,
  CurrencyCode,
  CustomerProfile,
  OrderRecord,
  PaymentChannel,
  PaymentChannelId,
} from '../types/store';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  currency: CurrencyCode;
  paymentChannels: PaymentChannel[];
  coupons: CouponRecord[];
  paymentMode: 'sandbox' | 'live';
  customer: CustomerProfile | null;
  customerToken: string | null;
  preferredPayment?: PaymentChannelId;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onOrderComplete: (order: OrderRecord) => void;
  onViewOrderTracker: (orderId: string) => void;
}

export function CartDrawer({
  open,
  onClose,
  items,
  currency,
  paymentChannels,
  coupons,
  paymentMode,
  customer,
  customerToken,
  preferredPayment,
  onUpdateQuantity,
  onRemoveItem,
  onOrderComplete,
  onViewOrderTracker,
}: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentChannelId>(
    preferredPayment || paymentChannels[0]?.id || 'upi',
  );
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<OrderRecord | null>(null);
  const [finalOrder, setFinalOrder] = useState<OrderRecord | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => `idem_${Date.now()}`);

  useEffect(() => {
    if (customer?.email && !customerEmail) {
      setCustomerEmail(customer.email);
    }
  }, [customer?.email, customerEmail]);

  useEffect(() => {
    if (preferredPayment) {
      setPaymentMethod(preferredPayment);
    }
  }, [preferredPayment]);

  if (!open) return null;

  const subtotalInr = items.reduce(
    (sum, item) => sum + item.unitPriceInr * item.quantity,
    0,
  );

  const normalizedPromo = promoCode.trim().toUpperCase();
  const matchedCoupon = coupons.find(
    (c) => c.code.toUpperCase() === normalizedPromo && c.active,
  );
  let discountInr = 0;
  let promoStatusMessage = '';
  if (normalizedPromo) {
    if (!matchedCoupon) {
      promoStatusMessage = 'Coupon code not recognized';
    } else if (subtotalInr < matchedCoupon.minOrderInr) {
      promoStatusMessage = `${matchedCoupon.code} requires ₹${matchedCoupon.minOrderInr}+ order`;
    } else {
      discountInr =
        matchedCoupon.discountType === 'percent'
          ? Math.round((subtotalInr * matchedCoupon.value) / 100)
          : matchedCoupon.value;
      promoStatusMessage = `${matchedCoupon.code} applied (-₹${discountInr})`;
    }
  }

  const totalInr = Math.max(0, subtotalInr - discountInr);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customerToken) {
        headers.Authorization = `Bearer ${customerToken}`;
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotencyKey,
          items: items.map((item) => ({
            gameSlug: item.gameSlug,
            packId: item.packId,
            quantity: item.quantity,
            playerId: item.playerId,
            secondaryId: item.secondaryId,
            verifiedNickname: item.verifiedNickname,
          })),
          currency,
          paymentMethod,
          customerEmail,
          promoCode: normalizedPromo || undefined,
        }),
      });

      const data = (await response.json()) as {
        order?: OrderRecord;
        error?: string;
      };

      if (!response.ok || !data.order) {
        setCheckoutError(data.error || 'Checkout failed. Please check your inputs.');
        return;
      }

      if (data.order.status === 'Successful' || data.order.status === 'Failed') {
        setFinalOrder(data.order);
        onOrderComplete(data.order);
      } else {
        setPendingOrder(data.order);
        onOrderComplete(data.order);
      }
      setIdempotencyKey(`idem_${Date.now()}_${Math.floor(Math.random() * 999)}`);
    } catch {
      setCheckoutError('Network error while creating order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxOutcome = async (
    outcome: 'success' | 'payment_failed' | 'supplier_failed',
  ) => {
    if (!pendingOrder) return;
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/payments/sandbox-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingOrder.orderId,
          outcome,
        }),
      });
      const data = (await res.json()) as { order?: OrderRecord; error?: string };
      if (!res.ok || !data.order) {
        setCheckoutError(data.error || 'Unable to process sandbox payment.');
        return;
      }
      setPendingOrder(null);
      setFinalOrder(data.order);
      onOrderComplete(data.order);
    } catch {
      setCheckoutError('Network error confirming sandbox payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPendingOrder(null);
    setFinalOrder(null);
    setCheckoutError(null);
    onClose();
  };

  const displayOrder = finalOrder || pendingOrder;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="POWERUP SUN NOVA shopping bag and checkout"
    >
      <div className="w-full max-w-md bg-[#0B0E1A] h-full flex flex-col border-l border-white/10 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {finalOrder
                ? `Receipt #${finalOrder.orderId}`
                : pendingOrder
                  ? `Awaiting Payment · #${pendingOrder.orderId}`
                  : 'POWERUP SUN NOVA Bag'}
            </h2>
            {!displayOrder && (
              <p className="text-xs text-slate-400 tabular-nums">
                {items.reduce((acc, i) => acc + i.quantity, 0)} item(s) · Zero password needed
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close bag drawer"
            className="w-10 h-10 rounded-lg inline-flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {pendingOrder ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-violet-600/15 border border-violet-500/40 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Order Status: {pendingOrder.status}
                </p>
                <p className="font-display text-base font-bold text-white">
                  Complete Payment via {pendingOrder.paymentLabel}
                </p>
                <p className="font-mono text-xl font-bold text-white tabular-nums">
                  {formatCurrencyFromInr(pendingOrder.totalInr, currency)}
                </p>
              </div>

              {paymentMode === 'sandbox' ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Sandbox Gateway Verification Mode</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    In production, orders wait for signed gateway webhook confirmation before
                    calling the gaming supplier. Test a sandbox outcome below:
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxOutcome('success')}
                      className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-blue-500 cursor-pointer min-h-[40px]"
                    >
                      {submitting ? 'Confirming...' : 'Verify Payment & Deliver Order'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxOutcome('supplier_failed')}
                      className="w-full py-2 px-4 rounded-lg border border-amber-500/35 bg-amber-500/10 text-amber-200 text-xs font-semibold hover:bg-amber-500/20 cursor-pointer"
                    >
                      Test Payment Success + Supplier Timeout (Failed Recharge)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxOutcome('payment_failed')}
                      className="w-full py-2 px-4 rounded-lg border border-rose-500/35 bg-rose-500/10 text-rose-200 text-xs font-semibold hover:bg-rose-500/20 cursor-pointer"
                    >
                      Test Gateway Payment Cancelled
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  Awaiting gateway webhook confirmation for #{pendingOrder.orderId}. Track live
                  delivery inside Track Order.
                </div>
              )}

              {checkoutError && (
                <p role="alert" className="text-xs text-rose-300">
                  {checkoutError}
                </p>
              )}
            </div>
          ) : finalOrder ? (
            <div className="space-y-5">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  finalOrder.status === 'Successful'
                    ? 'bg-emerald-500/10 border-emerald-500/35'
                    : 'bg-rose-500/10 border-rose-500/35'
                }`}
              >
                {finalOrder.status === 'Successful' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div>
                  <p className="font-display text-sm font-bold text-white">
                    POWERUP SUN NOVA · #{finalOrder.orderId} ({finalOrder.status})
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {finalOrder.status === 'Successful'
                      ? `Credits dispatched via ${finalOrder.paymentLabel}. Receipt sent to ${finalOrder.customerEmail}.`
                      : finalOrder.failureReason ||
                        'Order failed. You may request an automatic refund from Track Order.'}
                  </p>
                </div>
              </div>

              <div className="border border-white/10 rounded-xl divide-y divide-white/10 bg-white/5">
                {finalOrder.items.map((item, idx) => (
                  <div key={idx} className="p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.gameName}</p>
                        <p className="text-xs text-sky-400">
                          {item.packLabel} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white tabular-nums">
                        {formatCurrencyFromInr(item.lineTotalInr, currency)}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400">
                      ID: {item.playerId}
                      {item.secondaryId ? ` (${item.secondaryId})` : ''}
                      {item.verifiedNickname ? ` · ${item.verifiedNickname}` : ''}
                    </p>
                    {item.voucherCode && (
                      <div className="mt-2 p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Digital PIN</span>
                        <span className="font-mono text-xs font-semibold text-sky-300">
                          {item.voucherCode}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Total Paid</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {formatCurrencyFromInr(finalOrder.totalInr, currency)}
                  </span>
                </div>
                {finalOrder.status === 'Successful' && finalOrder.cashbackEarnedInr > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Cashback Earned</span>
                    <span className="font-mono tabular-nums">
                      +{formatCurrencyFromInr(finalOrder.cashbackEarnedInr, currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const id = finalOrder.orderId;
                    handleClose();
                    onViewOrderTracker(id);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold cursor-pointer min-h-[44px]"
                >
                  Open Receipt &amp; Timeline in Track Order
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 rounded-lg border border-white/15 text-slate-200 text-sm font-semibold hover:bg-white/5 cursor-pointer min-h-[44px]"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-base font-semibold text-white">
                Your POWERUP bag is empty
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Select a game, verify your Player UID, and pick a pack to get started.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-5 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 cursor-pointer"
              >
                Explore Games
              </button>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleCreateOrder} className="space-y-6">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.gameName}</p>
                        <p className="text-xs text-sky-400 font-medium mt-0.5">
                          {item.packLabel}
                          {item.bonusLabel ? ` · ${item.bonusLabel}` : ''}
                        </p>
                        <p className="font-mono text-xs text-slate-400 mt-1">
                          {item.playerId}
                          {item.secondaryId ? ` (${item.secondaryId})` : ''}
                          {item.verifiedNickname ? ` · ${item.verifiedNickname}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.cartItemId)}
                        aria-label={`Remove ${item.packLabel}`}
                        className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div className="inline-flex items-center border border-white/15 rounded-lg">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                          aria-label="Decrease item quantity"
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono text-xs font-semibold text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                          aria-label="Increase item quantity"
                          className="w-8 h-8 inline-flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white tabular-nums">
                        {formatCurrencyFromInr(item.unitPriceInr * item.quantity, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  Payment Channel
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {paymentChannels.map((channel) => {
                    const active = paymentMethod === channel.id;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setPaymentMethod(channel.id)}
                        className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? 'border-violet-500 bg-violet-600/15 ring-1 ring-violet-500'
                            : 'border-white/10 bg-white/5 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            {channel.name}
                          </span>
                          <span className="text-[11px] text-sky-400">
                            {channel.feeNote}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {channel.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {paymentMethod === 'wallet' && customer && (
                  <p className="text-xs text-sky-400 mt-2 tabular-nums">
                    Available Sun Nova Wallet: {formatCurrencyFromInr(customer.walletBalanceInr, currency)}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="checkout-promo"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Coupon Code (Try NOVA5 or UPI20)
                  </label>
                  <input
                    id="checkout-promo"
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="NOVA5"
                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm font-mono uppercase text-white placeholder:normal-case placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  {promoStatusMessage && (
                    <p className="text-xs text-sky-400 mt-1">{promoStatusMessage}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-email"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Receipt Email Address
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.in"
                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {checkoutError && (
                <p
                  role="alert"
                  className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs font-medium text-rose-200"
                >
                  {checkoutError}
                </p>
              )}
            </form>
          )}
        </div>

        {!displayOrder && items.length > 0 && (
          <div className="p-6 border-t border-white/10 bg-[#070911] space-y-3">
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {formatCurrencyFromInr(subtotalInr, currency)}
                </span>
              </div>
              {discountInr > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-mono tabular-nums">
                    -{formatCurrencyFromInr(discountInr, currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm font-semibold text-white">Total Payable</span>
              <span className="font-mono text-lg font-bold text-white tabular-nums">
                {formatCurrencyFromInr(totalInr, currency)}
              </span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Creating Order...</span>
                </>
              ) : (
                <span>
                  Proceed to Pay · {formatCurrencyFromInr(totalInr, currency)}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
