import { useCallback, useEffect, useState } from 'react';
import {
  INITIAL_BANNERS,
  INITIAL_CATALOG_TITLES,
  INITIAL_COUPONS,
  INITIAL_PAYMENT_CHANNELS,
  INITIAL_WEBSITE_SETTINGS,
} from './data/catalog';
import type {
  BannerRecord,
  CartItem,
  CouponRecord,
  CurrencyCode,
  CustomerProfile,
  DenominationPack,
  GameCategory,
  GameTitle,
  OrderRecord,
  PaymentChannel,
  PaymentChannelId,
  WebsiteSettings,
} from './types/store';
import { Navbar, type ActiveRoute } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CatalogSection, type SortMode } from './components/CatalogSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { ProductDetailView } from './components/ProductDetailView';
import { CartDrawer } from './components/CartDrawer';
import { TrackOrderView } from './components/TrackOrderView';
import { SupportView } from './components/SupportView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { Footer } from './components/Footer';

const BAG_STORAGE_KEY = 'powerup_sun_nova_bag_v1';
const CUSTOMER_TOKEN_KEY = 'powerup_sun_nova_cust_token';
const ADMIN_TOKEN_KEY = 'powerup_sun_nova_admin_token';

const PRIORITY_SLUGS = [
  'free-fire-max',
  'bgmi',
  'pubg-mobile-global',
  'mobile-legends',
];

export default function App() {
  const [booting, setBooting] = useState(true);
  const [titles, setTitles] = useState<GameTitle[]>(INITIAL_CATALOG_TITLES);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>(
    INITIAL_PAYMENT_CHANNELS,
  );
  const [coupons, setCoupons] = useState<CouponRecord[]>(INITIAL_COUPONS);
  const [banners, setBanners] = useState<BannerRecord[]>(INITIAL_BANNERS);
  const [settings, setSettings] = useState<WebsiteSettings>(INITIAL_WEBSITE_SETTINGS);

  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('catalog');
  const [selectedGameSlug, setSelectedGameSlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [sortMode, setSortMode] = useState<SortMode>('popular');

  const [cartOpen, setCartOpen] = useState(false);
  const [preferredPayment, setPreferredPayment] = useState<PaymentChannelId>('upi');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackOrderId, setTrackOrderId] = useState('');

  const [customerToken, setCustomerToken] = useState<string | null>(() =>
    localStorage.getItem(CUSTOMER_TOKEN_KEY),
  );
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);

  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem(ADMIN_TOKEN_KEY),
  );

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(BAG_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      const data = (await res.json()) as {
        titles?: GameTitle[];
        paymentChannels?: PaymentChannel[];
        coupons?: CouponRecord[];
        banners?: BannerRecord[];
        settings?: WebsiteSettings;
      };
      if (Array.isArray(data.titles)) setTitles(data.titles);
      if (Array.isArray(data.paymentChannels)) setPaymentChannels(data.paymentChannels);
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (Array.isArray(data.banners)) setBanners(data.banners);
      if (data.settings) setSettings(data.settings);
    } catch {
      // Initial catalog remains active
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!customerToken) return;
    fetch('/api/customer/me', {
      headers: { Authorization: `Bearer ${customerToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { customer?: CustomerProfile } | null) => {
        if (d?.customer) setCustomerProfile(d.customer);
        else {
          localStorage.removeItem(CUSTOMER_TOKEN_KEY);
          setCustomerToken(null);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [customerToken]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleNavigate = (route: ActiveRoute) => {
    setSelectedGameSlug(null);
    setActiveRoute(route);
    if (route === 'gift-cards') {
      setSelectedCategory('Gift Cards');
    } else if (route === 'catalog') {
      setSelectedCategory('All');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGame = (slug: string) => {
    setSelectedGameSlug(slug);
    setActiveRoute('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToCatalog = () => {
    setSelectedGameSlug(null);
    setActiveRoute('catalog');
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 30);
  };

  const handleAddToCart = ({
    game,
    pack,
    quantity,
    playerId,
    secondaryId,
    verifiedNickname,
    preferredPayment: paymentPref,
    openDrawer,
  }: {
    game: GameTitle;
    pack: DenominationPack;
    quantity: number;
    playerId: string;
    secondaryId?: string;
    verifiedNickname?: string;
    preferredPayment: PaymentChannelId;
    openDrawer: boolean;
  }) => {
    setPreferredPayment(paymentPref);
    const itemKey = `${game.slug}::${pack.id}::${playerId}::${secondaryId || ''}`;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.cartItemId === itemKey);
      if (existing) {
        return prev.map((i) =>
          i.cartItemId === itemKey
            ? { ...i, quantity: Math.min(20, i.quantity + quantity) }
            : i,
        );
      }
      return [
        ...prev,
        {
          cartItemId: itemKey,
          gameSlug: game.slug,
          gameName: game.name,
          kind: game.kind,
          packId: pack.id,
          packLabel: pack.label,
          bonusLabel: pack.bonusLabel,
          unitPriceInr: pack.priceInr,
          costPriceInr: pack.costPriceInr,
          cashbackPercent: pack.cashbackPercent,
          quantity,
          playerId,
          secondaryId,
          verifiedNickname,
        },
      ];
    });

    if (openDrawer) {
      setCartOpen(true);
    } else {
      showToast(`Added ${pack.label} for ${game.name} to POWERUP bag`);
    }
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleOrderComplete = (_order: OrderRecord) => {
    setCartItems([]);
  };

  const handleViewOrderTracker = (orderId: string) => {
    setTrackOrderId(orderId);
    setSelectedGameSlug(null);
    setActiveRoute('track-order');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePlayerId = async (payload: {
    gameSlug: string;
    label: string;
    playerId: string;
    secondaryId?: string;
    verifiedNickname?: string;
  }) => {
    if (!customerToken) return;
    const res = await fetch('/api/customer/saved-ids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { customer?: CustomerProfile };
    if (res.ok && data.customer) {
      setCustomerProfile(data.customer);
    }
  };

  const availableTitles = titles.filter((t) => t.isAvailable !== false && t.packs.length > 0);
  const featuredGames = PRIORITY_SLUGS.map((slug) =>
    availableTitles.find((t) => t.slug === slug),
  ).filter((g): g is GameTitle => Boolean(g));

  const selectedGame = selectedGameSlug
    ? titles.find((t) => t.slug === selectedGameSlug) || null
    : null;

  const totalBagCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (booting) {
    return (
      <div className="min-h-screen bg-[#07080F] flex flex-col items-center justify-center text-center px-6">
        <p className="font-display text-2xl font-extrabold tracking-tight text-white">
          POWERUP <span className="text-violet-400">SUN NOVA</span>
        </p>
        <p className="text-xs text-sky-400 mt-1.5">{settings.tagline}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07080F] text-slate-100">
      <Navbar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        cartCount={totalBagCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {selectedGame ? (
          <ProductDetailView
            game={selectedGame}
            currency={currency}
            paymentChannels={paymentChannels}
            coupons={coupons}
            customer={customerProfile}
            onSavePlayerId={customerToken ? handleSavePlayerId : undefined}
            onBack={() => setSelectedGameSlug(null)}
            onAddToCart={handleAddToCart}
          />
        ) : activeRoute === 'track-order' ? (
          <TrackOrderView
            currency={currency}
            initialOrderId={trackOrderId}
            onSelectGame={handleSelectGame}
          />
        ) : activeRoute === 'account' ? (
          <CustomerPortalView
            currency={currency}
            paymentMode={settings.paymentMode}
            games={availableTitles}
            customer={customerProfile}
            customerToken={customerToken}
            onAuthSuccess={(token, profile) => {
              localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
              setCustomerToken(token);
              setCustomerProfile(profile);
            }}
            onCustomerUpdate={(profile) => setCustomerProfile(profile)}
            onLogout={() => {
              localStorage.removeItem(CUSTOMER_TOKEN_KEY);
              setCustomerToken(null);
              setCustomerProfile(null);
            }}
            onSelectGame={handleSelectGame}
            onOpenAdmin={() => handleNavigate('admin')}
            onOpenSupport={() => handleNavigate('support')}
          />
        ) : activeRoute === 'admin' ? (
          <AdminDashboardView
            currency={currency}
            adminToken={adminToken}
            onAdminLogin={(token) => {
              localStorage.setItem(ADMIN_TOKEN_KEY, token);
              setAdminToken(token);
            }}
            onAdminLogout={() => {
              localStorage.removeItem(ADMIN_TOKEN_KEY);
              setAdminToken(null);
            }}
            onRefreshStorefront={() => {
              void loadCatalog();
            }}
          />
        ) : activeRoute === 'support' ? (
          <SupportView supportEmail={settings.supportEmail} />
        ) : (
          <>
            {activeRoute === 'catalog' && (
              <HeroSection
                tagline={settings.tagline}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onExploreGames={scrollToCatalog}
                onBrowseTopUps={scrollToCatalog}
                onSelectGame={handleSelectGame}
                featuredGames={featuredGames}
                banners={banners}
                currency={currency}
              />
            )}

            <CatalogSection
              titles={titles}
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                if (cat === 'Gift Cards') {
                  setActiveRoute('gift-cards');
                } else if (activeRoute === 'gift-cards') {
                  setActiveRoute('catalog');
                }
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              currency={currency}
              onCurrencyChange={setCurrency}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onSelectGame={handleSelectGame}
            />

            <HowItWorksSection paymentChannels={paymentChannels} />
          </>
        )}
      </main>

      <Footer
        tagline={settings.tagline}
        supportEmail={settings.supportEmail}
        onNavigate={handleNavigate}
        onSelectGame={handleSelectGame}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        currency={currency}
        paymentChannels={paymentChannels}
        coupons={coupons}
        paymentMode={settings.paymentMode}
        customer={customerProfile}
        customerToken={customerToken}
        preferredPayment={preferredPayment}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onOrderComplete={handleOrderComplete}
        onViewOrderTracker={handleViewOrderTracker}
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-xl bg-[#131729] border border-violet-500/40 text-white text-xs font-medium shadow-xl flex items-center gap-3"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
          >
            View Bag
          </button>
        </div>
      )}
    </div>
  );
}
