import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';

export type ActiveRoute =
  | 'catalog'
  | 'gift-cards'
  | 'track-order'
  | 'account'
  | 'admin'
  | 'support';

interface NavbarProps {
  activeRoute: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveRoute; label: string }> = [
  { id: 'catalog', label: 'Direct Top-Up' },
  { id: 'gift-cards', label: 'Gift Cards' },
  { id: 'track-order', label: 'Track Order' },
  { id: 'account', label: 'My Account' },
  { id: 'support', label: 'Support' },
];

export function Navbar({
  activeRoute,
  onNavigate,
  cartCount,
  onOpenCart,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (route: ActiveRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 glass-surface border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('catalog')}
          className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
        >
          POWERUP <span className="text-violet-400">SUN NOVA</span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 ${
                  isActive
                    ? 'text-sky-400 border-violet-500'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-white/25'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 min-h-[40px]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span className="tabular-nums">Bag ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/15 text-slate-200 hover:bg-white/10 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-white/10 bg-[#0B0E1A] px-4 py-3 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  isActive
                    ? 'bg-violet-600/20 text-sky-300'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => handleNavClick('admin')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 cursor-pointer"
          >
            Admin Console
          </button>
        </nav>
      )}
    </header>
  );
}
