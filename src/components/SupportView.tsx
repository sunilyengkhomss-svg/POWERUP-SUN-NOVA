import { useState } from 'react';
import { Bot, Check, CheckCircle2, ChevronDown, Copy, Loader2 } from 'lucide-react';

const FAQS = [
  {
    q: 'What is the difference between BGMI UC and PUBG Mobile UC Global?',
    a: 'BGMI UC is strictly for Battlegrounds Mobile India Character IDs routed through KRAFTON India partner rails. PUBG Mobile UC Global is a separate product for global server accounts outside India, China, Japan, and Korea.',
  },
  {
    q: 'How fast are POWERUP SUN NOVA direct top-ups delivered?',
    a: 'Once UPI, PhonePe, Google Pay, card, or wallet payment is verified, orders are submitted automatically to the configured game supplier and usually arrive within 10 to 30 seconds.',
  },
  {
    q: 'Do you ever ask for my game password or OTP?',
    a: 'Never. Direct top-ups only use your public Player UID (and Zone ID or Server when required). Never share your game login password anywhere.',
  },
  {
    q: 'What happens if a recharge fails after payment succeeds?',
    a: 'Failed orders never trigger duplicate automatic charges. You can submit a 1-click refund request in Track Order or My Account, and our admin team processes automatic wallet or gateway refunds.',
  },
];

export function SupportView({
  supportEmail,
  onOpenAiChat,
}: {
  supportEmail: string;
  onOpenAiChat: () => void;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Delayed Top-Up Credit');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email, topic, message }),
      });
      const data = (await res.json()) as {
        ticket?: { ticketId: string };
        error?: string;
      };
      if (!res.ok || !data.ticket) {
        setError(data.error || 'Could not submit support request.');
        return;
      }
      setTicketId(data.ticket.ticketId);
      setMessage('');
    } catch {
      setError('Network error submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              POWERUP SUN NOVA Support
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span>Helpdesk email (no redirect):</span>
              <span className="font-mono text-sky-400 select-all">{supportEmail}</span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 cursor-pointer"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-violet-500/30 bg-gradient-to-r from-violet-950/40 to-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-display text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span>24/7 AI Instant Support Chat</span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ask any question about game packs, BGMI vs PUBG Global, UPI payments, coupons, or
                track an order ID immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAiChat}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer min-h-[40px]"
            >
              Start 24/7 AI Chat
            </button>
          </div>

          <div className="glass-card rounded-xl divide-y divide-white/10">
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-white">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 glass-card rounded-xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-white">
            Submit a Support Ticket
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Include your Order ID if your inquiry relates to an existing transaction.
          </p>

          {ticketId ? (
            <div className="mt-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                <span>Support Ticket #{ticketId} Created</span>
              </div>
              <p className="text-xs text-slate-300">
                Our support desk has logged your request and will reply to{' '}
                <span className="font-medium text-white">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => setTicketId(null)}
                className="mt-2 text-xs font-semibold text-sky-400 underline cursor-pointer"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="support-order-id"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Order ID (Optional)
                  </label>
                  <input
                    id="support-order-id"
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. SN-2026-1042"
                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="support-email"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.in"
                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="support-topic"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Topic
                </label>
                <select
                  id="support-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-[#0F1322] text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option>Delayed Top-Up Credit</option>
                  <option>UPI / PhonePe / GPay Settlement</option>
                  <option>Digital Voucher Redemption Issue</option>
                  <option>Refund Request Follow-Up</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="support-message"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Message
                </label>
                <textarea
                  id="support-message"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue with Player UID or transaction reference..."
                  className="w-full p-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs font-medium text-rose-200"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-blue-500 transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Support Request</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
