import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { formatCurrencyFromInr } from '../data/catalog';
import type {
  CouponRecord,
  CurrencyCode,
  CustomerProfile,
  DenominationPack,
  GameTitle,
  PaymentChannel,
  PaymentChannelId,
  VerifiedPlayer,
} from '../types/store';
import { GameArtwork } from './GameArtwork';

interface ProductDetailViewProps {
  game: GameTitle;
  currency: CurrencyCode;
  paymentChannels: PaymentChannel[];
  coupons: CouponRecord[];
  customer: CustomerProfile | null;
  onBack: () => void;
  onSavePlayerId?: (payload: {
    gameSlug: string;
    label: string;
    playerId: string;
    secondaryId?: string;
    verifiedNickname?: string;
  }) => Promise<void>;
  onAddToCart: (payload: {
    game: GameTitle;
    pack: DenominationPack;
    quantity: number;
    playerId: string;
    secondaryId?: string;
    verifiedNickname?: string;
    preferredPayment: PaymentChannelId;
    openDrawer: boolean;
  }) => void;
}

export function ProductDetailView({
  game,
  currency,
  paymentChannels,
  coupons,
  customer,
  onBack,
  onSavePlayerId,
  onAddToCart,
}: ProductDetailViewProps) {
  const defaultPack = game.packs.find((p) => p.popular) || game.packs[0];

  const [selectedPackId, setSelectedPackId] = useState<string>(defaultPack?.id || '');
  const [playerId, setPlayerId] = useState('');
  const [secondaryId, setSecondaryId] = useState(
    game.accountConfig.secondaryType === 'server-select' &&
      game.accountConfig.servers?.length
      ? game.accountConfig.servers[0].id
      : '',
  );
  const [preferredPayment, setPreferredPayment] = useState<PaymentChannelId>(
    paymentChannels[0]?.id || 'upi',
  );
  const [quantity, setQuantity] = useState(1);

  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerifiedPlayer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const selectedPack =
    game.packs.find((p) => p.id === selectedPackId) || game.packs[0];

  const savedForThisGame =
    customer?.savedPlayerIds.filter((s) => s.gameSlug === game.slug) || [];

  const isPurchasable = game.isAvailable !== false && Boolean(selectedPack);

  const runVerification = async (): Promise<VerifiedPlayer> => {
    setVerifying(true);
    setFormError(null);
    try {
      const response = await fetch('/api/verify-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameSlug: game.slug,
          playerId,
          secondaryId: secondaryId || undefined,
        }),
      });
      const data = (await response.json()) as VerifiedPlayer;
      setVerification(data);
      if (!data.valid) {
        setFormError(data.error || 'Unable to verify account details.');
      }
      return data;
    } catch {
      const fallback: VerifiedPlayer = {
        valid: false,
        error: 'Network error verifying account. Please try again.',
      };
      setVerification(fallback);
      setFormError(fallback.error || null);
      return fallback;
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveId = async () => {
    if (!onSavePlayerId || !playerId.trim()) return;
    setSavingId(true);
    setSavedNotice(null);
    try {
      await onSavePlayerId({
        gameSlug: game.slug,
        label: `${game.name} ID`,
        playerId: playerId.trim(),
        secondaryId: secondaryId.trim() || undefined,
        verifiedNickname: verification?.nickname,
      });
      setSavedNotice('Player ID saved to your profile.');
    } finally {
      setSavingId(false);
    }
  };

  const handleSubmitPurchase = async (openDrawer: boolean) => {
    if (!isPurchasable || !selectedPack) return;
    setFormError(null);

    let activeVerification = verification;
    if (!activeVerification?.valid) {
      activeVerification = await runVerification();
    }

    if (!activeVerification.valid) {
      return;
    }

    onAddToCart({
      game,
      pack: selectedPack,
      quantity,
      playerId: playerId.trim(),
      secondaryId: secondaryId.trim() || undefined,
      verifiedNickname: activeVerification.nickname,
      preferredPayment,
      openDrawer,
    });
  };

  const subtotalInr = (selectedPack?.priceInr || 0) * quantity;
  const cashbackInr = selectedPack
    ? Math.round((subtotalInr * selectedPack.cashbackPercent) / 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to POWERUP catalog</span>
      </button>

      {!isPurchasable && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-sm text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            This title is currently unavailable for purchase while its supplier integration is
            being configured.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Sticky Column: Game Info, Regional Notice & UID Guide */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="aspect-[4/3] w-full bg-slate-900">
              <GameArtwork game={game} />
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-sky-400">
                {game.publisher} · {game.platformLabel} · {game.regionLabel}
              </p>
              <h1 className="font-display text-2xl font-bold text-white mt-1.5">
                {game.name}
              </h1>
              <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
                {game.shortDescription}
              </p>

              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Supported Region:</strong> {game.regionRestriction}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-medium text-slate-300">
                <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
                <span>{game.deliveryEstimate} · Zero password required</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <HelpCircle className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <span>
                {game.kind === 'gift-card'
                  ? 'How to redeem your code'
                  : `Where to find your ${game.accountConfig.primaryLabel}`}
              </span>
            </div>
            <ol className="mt-3 space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              {game.idGuideSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Player UID & Server */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-white">
                01. {game.kind === 'gift-card' ? 'Delivery Details' : 'Enter Player UID'}
              </h2>
              <span className="text-xs text-slate-400">
                We never request your game password
              </span>
            </div>

            {savedForThisGame.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Saved IDs:</span>
                {savedForThisGame.map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() => {
                      setPlayerId(saved.playerId);
                      if (saved.secondaryId) setSecondaryId(saved.secondaryId);
                      setVerification(null);
                      setFormError(null);
                    }}
                    className="px-2.5 py-1 rounded-md bg-violet-600/20 border border-violet-500/40 text-xs font-mono text-violet-200 hover:bg-violet-600/30 cursor-pointer"
                  >
                    {saved.playerId}
                    {saved.secondaryId ? ` (${saved.secondaryId})` : ''}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div
                className={
                  game.accountConfig.secondaryType === 'none'
                    ? 'sm:col-span-12'
                    : 'sm:col-span-7'
                }
              >
                <label
                  htmlFor="primary-player-id"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  {game.accountConfig.primaryLabel}
                </label>
                <input
                  id="primary-player-id"
                  type="text"
                  value={playerId}
                  onChange={(e) => {
                    setPlayerId(e.target.value);
                    setVerification(null);
                    setFormError(null);
                  }}
                  placeholder={game.accountConfig.primaryPlaceholder}
                  className="w-full h-11 px-3.5 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {game.accountConfig.secondaryType === 'zone-input' && (
                <div className="sm:col-span-5">
                  <label
                    htmlFor="secondary-zone-id"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    {game.accountConfig.secondaryLabel}
                  </label>
                  <input
                    id="secondary-zone-id"
                    type="text"
                    value={secondaryId}
                    onChange={(e) => {
                      setSecondaryId(e.target.value);
                      setVerification(null);
                      setFormError(null);
                    }}
                    placeholder={game.accountConfig.secondaryPlaceholder}
                    className="w-full h-11 px-3.5 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              )}

              {game.accountConfig.secondaryType === 'server-select' &&
                game.accountConfig.servers && (
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="secondary-server-select"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      {game.accountConfig.secondaryLabel}
                    </label>
                    <select
                      id="secondary-server-select"
                      value={secondaryId}
                      onChange={(e) => {
                        setSecondaryId(e.target.value);
                        setVerification(null);
                        setFormError(null);
                      }}
                      className="w-full h-11 px-3 rounded-lg border border-white/15 bg-[#0F1322] text-sm text-white focus:outline-none focus:border-violet-500"
                    >
                      {game.accountConfig.servers.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">{game.accountConfig.primaryHelp}</p>
              <div className="flex items-center gap-2">
                {customer && playerId.trim() && onSavePlayerId && (
                  <button
                    type="button"
                    onClick={handleSaveId}
                    disabled={savingId}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 cursor-pointer min-h-[40px]"
                  >
                    <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{savingId ? 'Saving...' : 'Save ID'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={runVerification}
                  disabled={verifying || !isPurchasable}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-violet-500/40 bg-violet-600/20 text-xs font-semibold text-violet-200 hover:bg-violet-600/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 min-h-[40px]"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>
                      {game.kind === 'gift-card' ? 'Confirm Recipient' : 'Verify Player ID'}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {verification?.valid && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  Verified nickname:{' '}
                  <strong className="font-semibold text-white">{verification.nickname}</strong>
                  {verification.region ? ` · ${verification.region}` : ''}
                </span>
              </div>
            )}

            {savedNotice && (
              <p className="mt-2 text-xs text-sky-400">{savedNotice}</p>
            )}

            {formError && (
              <p
                role="alert"
                className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs font-medium text-rose-200"
              >
                {formError}
              </p>
            )}
          </div>

          {/* Step 2: Select Recharge Denomination */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-white">
                02. Select {game.currencyUnitName}
              </h2>
              <span className="text-xs text-slate-400 tabular-nums">
                {game.packs.length} denominations
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {game.packs.map((pack) => {
                const isSelected = pack.id === selectedPack?.id;
                const savingsPercent =
                  pack.originalPriceInr && pack.originalPriceInr > pack.priceInr
                    ? Math.round(
                        ((pack.originalPriceInr - pack.priceInr) / pack.originalPriceInr) * 100,
                      )
                    : 0;

                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    aria-pressed={isSelected}
                    className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'border-violet-500 bg-violet-600/15 ring-1 ring-violet-500'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-bold text-white">
                          {pack.label}
                        </p>
                        {pack.bonusLabel ? (
                          <p className="text-xs text-sky-400 font-medium mt-0.5">
                            {pack.bonusLabel}
                          </p>
                        ) : null}
                      </div>
                      {pack.popular ? (
                        <span className="text-[11px] font-semibold text-violet-300 whitespace-nowrap shrink-0">
                          Popular
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm font-bold text-white tabular-nums">
                          {formatCurrencyFromInr(pack.priceInr, currency)}
                        </span>
                        {pack.originalPriceInr && pack.originalPriceInr > pack.priceInr ? (
                          <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                            {formatCurrencyFromInr(pack.originalPriceInr, currency)}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium tabular-nums">
                        {pack.cashbackPercent}% cashback
                        {savingsPercent > 0 ? ` · -${savingsPercent}%` : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Payment Methods, Cashback/Coupons & Order Summary */}
          <div className="glass-card rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                03. Payment Method &amp; Order Summary
              </h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {paymentChannels.map((channel) => {
                  const active = preferredPayment === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setPreferredPayment(channel.id)}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'border-sky-400 bg-blue-600/15 ring-1 ring-sky-400'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <p className="text-xs font-semibold text-white truncate">{channel.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {channel.feeNote}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cashback & Coupon Info */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-white">
                    Sun Nova Cashback: +{formatCurrencyFromInr(cashbackInr, currency)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Available coupons:{' '}
                    {coupons.map((c) => c.code).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400">Qty</span>
                <div className="inline-flex items-center border border-white/15 rounded-lg bg-white/5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 inline-flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono text-sm font-semibold text-white tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="w-9 h-9 inline-flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Summary & Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">
                  {selectedPack?.label} × {quantity}
                </p>
                <p className="font-mono text-2xl font-bold text-white tabular-nums">
                  {formatCurrencyFromInr(subtotalInr, currency)}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmitPurchase(false)}
                  disabled={verifying || !isPurchasable}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/15 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  <span>Add to Bag</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitPurchase(true)}
                  disabled={verifying || !isPurchasable}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  <span>Purchase Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
