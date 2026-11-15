import { useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';
import type { ActiveRoute } from './Navbar';

interface FooterProps {
  tagline: string;
  supportEmail: string;
  onNavigate: (route: ActiveRoute) => void;
  onSelectGame: (slug: string) => void;
  onOpenAiChat: () => void;
}

export function Footer({
  tagline,
  supportEmail,
  onNavigate,
  onSelectGame,
  onOpenAiChat,
}: FooterProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <footer className="bg-[#05060B] text-slate-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="font-display text-lg font-extrabold text-white">
              POWERUP <span className="text-violet-400">SUN NOVA</span>
            </p>
            <p className="text-xs font-medium text-sky-400 mt-1">{tagline}</p>
            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed max-w-xs">
              Instant gaming recharge, UC, Diamonds, and verified digital gift cards across India
              and global servers.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Priority Recharges
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectGame('free-fire-max')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Free Fire MAX Diamonds
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectGame('bgmi')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  BGMI UC (India)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectGame('pubg-mobile-global')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  PUBG Mobile UC Global
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectGame('mobile-legends')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Mobile Legends Diamonds
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Marketplace &amp; Portals
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Direct Top-Up Store
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('gift-cards')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Digital Gift Cards
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Customer Wallet &amp; Rewards
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('track-order')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Track Order &amp; Receipts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="text-violet-300 hover:text-white transition-colors cursor-pointer"
                >
                  Admin Console
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Coupons &amp; Support
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apply <span className="font-mono text-white">NOVA5</span> for 5% instant savings or{' '}
              <span className="font-mono text-white">UPI20</span> on orders ₹500+.
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-400">Helpdesk (No Direct Redirect):</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-200 select-all">
                  {supportEmail}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-sky-400 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={onOpenAiChat}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/35 text-xs font-semibold text-violet-200 transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span>24/7 AI Support Chat</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} POWERUP SUN NOVA (SUN NOVA). All rights reserved.</p>
          <p>Authorized Gaming Credits · Cloudflare Ready · INR / USD / SGD</p>
        </div>
      </div>
    </footer>
  );
}
