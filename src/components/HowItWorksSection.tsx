import { ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react';
import type { PaymentChannel } from '../types/store';

interface HowItWorksSectionProps {
  paymentChannels: PaymentChannel[];
}

const REASONS = [
  {
    icon: Zap,
    title: 'Instant Supplier Dispatch',
    description:
      'Orders execute automatically once payment webhook verification completes—typically delivering credits within 10–30 seconds.',
  },
  {
    icon: ShieldCheck,
    title: 'Zero Password Required',
    description:
      'Only your public Player UID, Zone ID, or Server is needed. POWERUP SUN NOVA never asks for game account passwords.',
  },
  {
    icon: Wallet,
    title: 'Cashback & Wallet Rewards',
    description:
      'Earn Sun Nova Cashback on every eligible recharge, apply promo coupons, and unlock instant wallet checkouts.',
  },
  {
    icon: Sparkles,
    title: 'Separate Regional Routing',
    description:
      'BGMI India and PUBG Mobile Global run on distinct supplier integrations so your account never gets misrouted.',
  },
];

export function HowItWorksSection({ paymentChannels }: HowItWorksSectionProps) {
  return (
    <section className="border-t border-white/10 bg-[#0A0D18]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Why Choose POWERUP SUN NOVA
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5">
            Built for speed, transparency, and Indian payment rails.
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="glass-card rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <Icon className="w-5 h-5 text-sky-400" aria-hidden="true" />
                  <h3 className="font-display text-base font-bold text-white mt-3">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white">
              Approved Indian &amp; Digital Payment Channels
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              UPI, PhonePe, Google Pay UPI flows, RuPay/Visa/Mastercard, Net Banking, and Sun Nova
              Wallet.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {paymentChannels.map((channel) => (
              <div
                key={channel.id}
                className="px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10"
              >
                <p className="text-xs font-semibold text-white truncate">{channel.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{channel.feeNote}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
