import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

interface AiSupportChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportEmail: string;
  onOpenSupportPage: () => void;
}

const QUICK_PROMPTS = [
  'BGMI UC vs PUBG Global difference?',
  'Active coupons & cashback deals?',
  'How long does direct top-up take?',
  'How do refunds & failed orders work?',
];

export function AiSupportChat({
  open,
  onOpenChange,
  supportEmail,
  onOpenSupportPage,
}: AiSupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, messages.length, sending]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Clipboard blocked fallback: select nothing, silent
    }
  };

  const sendQuery = async (rawQuery: string) => {
    const clean = rawQuery.trim();
    if (!clean || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
    };

    const historySnapshot = messages
      .filter((m) => !m.isError)
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: historySnapshot,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };

      if (!res.ok || !data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'model',
            text:
              data.error ||
              `Could not process your request right now. You can copy ${supportEmail} or submit a Support Ticket.`,
            isError: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.reply || '',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'model',
          text: `Network error reaching 24/7 AI Support. Please try again or copy ${supportEmail}.`,
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuery(input);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open 24/7 AI Support Chat"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold shadow-xl shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer min-h-[48px]"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          <span>24/7 AI Chat</span>
        </button>
      )}

      {open && (
        <aside
          aria-label="POWERUP SUN NOVA 24/7 AI Support Chat"
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[82vh] flex flex-col rounded-2xl bg-[#0B0E1A]/95 backdrop-blur-xl border border-violet-500/35 shadow-2xl shadow-black/70 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-violet-950/90 via-[#12162A] to-blue-950/80 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 border border-white/15">
                <Bot className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-white truncate">
                  POWERUP 24/7 AI Support
                </p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>Online 24/7 · Any Store Query</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  title="New chat"
                  aria-label="Reset conversation"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close AI Support Chat"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[420px]">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed space-y-1.5">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
                    <span>Ask POWERUP SUN NOVA AI anything 24/7</span>
                  </p>
                  <p className="text-slate-400">
                    Get instant help with Free Fire MAX, BGMI UC, PUBG Global, MLBB, pricing,
                    UPI/Wallet payments, coupons, or tracking an order ID (e.g.{' '}
                    <span className="font-mono text-sky-300">SN-2026-1042</span>).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Quick Questions
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendQuery(q)}
                        className="text-left px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 text-xs text-slate-200 transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-br-sm'
                        : msg.isError
                          ? 'bg-rose-500/15 border border-rose-500/35 text-rose-200 rounded-bl-sm'
                          : 'bg-white/[0.07] border border-white/10 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.07] border border-white/10 text-xs text-slate-300 inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" aria-hidden="true" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Non-redirecting support email bar */}
          <div className="px-4 py-2 bg-[#080B14] border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate select-all text-slate-300" title={supportEmail}>
                {supportEmail}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-sky-400 shrink-0 cursor-pointer"
                aria-label="Copy support email"
              >
                {copiedEmail ? (
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
              onClick={() => {
                onOpenChange(false);
                onOpenSupportPage();
              }}
              className="text-violet-300 hover:text-white font-medium shrink-0 cursor-pointer"
            >
              Ticket Form
            </button>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-[#090C16] border-t border-white/10 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any query about games, orders, UPI..."
              disabled={sending}
              className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
