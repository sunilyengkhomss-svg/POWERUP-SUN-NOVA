import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  CouponRecord,
  GameTitle,
  OrderRecord,
  PaymentChannel,
  WebsiteSettings,
} from '../types/store';

export interface AiChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AiSupportContext {
  apiKey?: string;
  message: string;
  history?: AiChatHistoryTurn[];
  catalog: GameTitle[];
  coupons: CouponRecord[];
  paymentChannels: PaymentChannel[];
  orders: OrderRecord[];
  settings: WebsiteSettings;
}

export interface AiSupportResult {
  reply?: string;
  error?: string;
  statusCode: number;
}

function buildSystemInstruction({
  message,
  history,
  catalog,
  coupons,
  paymentChannels,
  orders,
  settings,
}: Omit<AiSupportContext, 'apiKey'>): string {
  const activeGames = catalog.filter((g) => g.isAvailable !== false && g.packs.length > 0);
  const gamesSummary = activeGames
    .map((g) => {
      const activePacks = g.packs.filter((p) => p.active !== false);
      const minPrice = activePacks.length
        ? Math.min(...activePacks.map((p) => p.priceInr))
        : 0;
      const maxPrice = activePacks.length
        ? Math.max(...activePacks.map((p) => p.priceInr))
        : 0;
      return `- ${g.name} (${g.kind === 'gift-card' ? 'Gift Card' : 'Direct Top-Up'} | ${g.publisher} | Region: ${g.regionLabel}${g.regionRestriction ? ` [${g.regionRestriction}]` : ''} | ${g.currencyUnitName} | ₹${minPrice}–₹${maxPrice} | Delivery: ${g.deliveryEstimate})`;
    })
    .join('\n');

  const couponsSummary = coupons
    .filter((c) => c.active)
    .map(
      (c) =>
        `- ${c.code}: ${c.description} (${c.discountType === 'percent' ? `${c.value}% off` : `₹${c.value} off`}, min order ₹${c.minOrderInr})`,
    )
    .join('\n');

  const paymentsSummary = paymentChannels
    .filter((p) => p.enabled)
    .map((p) => `- ${p.name} (${p.feeNote})`)
    .join('\n');

  const combinedText = `${(history || []).map((h) => h.text).join(' ')} ${message}`;
  const orderMatches = combinedText.match(/SN-\d{4}-\d+/gi) || [];
  const uniqueOrderIds = Array.from(new Set(orderMatches.map((id) => id.toUpperCase())));

  const matchedOrderLines = uniqueOrderIds
    .map((orderId) => {
      const order = orders.find((o) => o.orderId.toUpperCase() === orderId);
      if (!order) return `- Order ${orderId}: Not found in current order records.`;
      const itemSummary = order.items
        .map((i) => `${i.gameName} (${i.packLabel} x${i.quantity})`)
        .join(', ');
      return `- Order ${order.orderId}: Status=${order.status}, Items=[${itemSummary}], Total=₹${order.totalInr}, Payment=${order.paymentMethod}, FailureReason=${order.failureReason || 'None'}`;
    })
    .join('\n');

  return `You are the 24/7 AI Customer Support Specialist for ${settings.brandName} ("${settings.tagline}"), an instant gaming recharge and digital gift card marketplace.

Be concise, friendly, accurate, and helpful for ANY customer query related to POWERUP SUN NOVA: games, top-up prices, Player UID/Zone ID entry, BGMI India vs PUBG Mobile Global regional routing, UPI/PhonePe/GPay/Card/Net Banking/Wallet payments, coupons, cashback rewards, referral rewards, order tracking, failed recharges, refunds, and gift cards.

Important Operational Rules:
1. NEVER ask customers for their game account password, OTP, or sensitive banking PINs. Direct top-ups only use public Player UID / Zone ID / Server.
2. BGMI UC is strictly for Battlegrounds Mobile India (KRAFTON India Partner Rail, India Character IDs). PUBG Mobile UC Global is a separate product for Global accounts outside India/China/Japan/Korea.
3. Official Support Mail: ${settings.supportEmail}. When sharing the support email, present it clearly as plain text for copying and suggest submitting an in-app Support Ticket on the Support page for human escalation — never tell users to click a direct mail redirect.
4. Keep responses concise (typically 2-6 short lines or clean bullet points) unless the user asks for detailed steps.
5. Never invent order statuses or fake refund approvals. Only cite order details explicitly listed below.

Active Storefront Catalog (${activeGames.length} products):
${gamesSummary}

Active Promo Coupons:
${couponsSummary}

Approved Payment Channels:
${paymentsSummary}

Wallet & Cashback Policy:
- Default cashback: ~${settings.defaultCashbackPercent}%+ on eligible packs (e.g., 2% Sun Nova Cashback on BGMI UC & Free Fire MAX), credited to customer wallet upon order success.
- Referral welcome bonus: ₹${settings.referralBonusInr}.
- Failed paid orders do not trigger duplicate automatic charges; customers can submit a 1-click refund request in Track Order or My Account, or contact ${settings.supportEmail}.
${matchedOrderLines ? `\nReferenced Order Lookups:\n${matchedOrderLines}` : ''}`;
}

export async function generateSunNovaAiReply(
  ctx: AiSupportContext,
): Promise<AiSupportResult> {
  const cleanMessage = ctx.message.trim();
  if (!cleanMessage) {
    return { statusCode: 400, error: 'Please enter a question for the 24/7 AI assistant.' };
  }

  const apiKey = ctx.apiKey?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      statusCode: 503,
      error: `24/7 AI chat requires a configured GEMINI_API_KEY. Please configure GEMINI_API_KEY in Settings > Secrets, or reach our support desk at ${ctx.settings.supportEmail}.`,
    };
  }

  const systemInstruction = buildSystemInstruction({
    message: cleanMessage,
    history: ctx.history,
    catalog: ctx.catalog,
    coupons: ctx.coupons,
    paymentChannels: ctx.paymentChannels,
    orders: ctx.orders,
    settings: ctx.settings,
  });

  const trimmedHistory = (ctx.history || [])
    .filter((turn) => (turn.role === 'user' || turn.role === 'model') && turn.text.trim())
    .slice(-10)
    .map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text.trim().slice(0, 1500) }],
    }));

  const contents = [
    ...trimmedHistory,
    { role: 'user' as const, parts: [{ text: cleanMessage.slice(0, 2000) }] },
  ];

  const callModel = async (
    model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite',
    thinkingLevel: ThinkingLevel,
    timeoutMs: number,
  ): Promise<string> => {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: timeoutMs,
        retryOptions: { attempts: 1 },
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${timeoutMs}ms.`)), timeoutMs);
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel },
        },
      }),
      timeoutPromise,
    ]);

    return (response.text || '').trim();
  };

  try {
    let replyText = '';
    try {
      replyText = await callModel('gemini-4-hydrogen', ThinkingLevel.LOW, 12000);
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : '';
      const isTransientOrTimeout =
        primaryMsg.includes('timed out') ||
        primaryMsg.includes('DEADLINE_EXCEEDED') ||
        primaryMsg.includes('504') ||
        primaryMsg.includes('503') ||
        primaryMsg.includes('NOT_FOUND') ||
        primaryMsg.includes('404') ||
        primaryMsg.includes('AbortError');
      if (!isTransientOrTimeout) {
        throw primaryErr;
      }
      replyText = await callModel('gemini-3.1-flash-lite', ThinkingLevel.MINIMAL, 15000);
    }

    if (!replyText) {
      return {
        statusCode: 502,
        error: `Could not generate a response right now. Please try again or reach support at ${ctx.settings.supportEmail}.`,
      };
    }

    return {
      statusCode: 200,
      reply: replyText,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unexpected AI service error.';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403')) {
      return {
        statusCode: 403,
        error: 'Gemini API key is invalid or unauthorized. Please check GEMINI_API_KEY in Settings > Secrets.',
      };
    }
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
      return {
        statusCode: 429,
        error: '24/7 AI chat is experiencing high traffic. Please retry in a moment.',
      };
    }
    return {
      statusCode: 502,
      error: `Unable to reach 24/7 AI Support right now (${errMsg}).`,
    };
  }
}
