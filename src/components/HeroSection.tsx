import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { HERO_IMAGE_URL, formatCurrencyFromInr } from '../data/catalog';
import type { BannerRecord, CurrencyCode, GameTitle } from '../types/store';
import { GameArtwork } from './GameArtwork';

interface HeroSectionProps {
  tagline: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onExploreGames: () => void;
  onBrowseTopUps: () => void;
  onSelectGame: (slug: string) => void;
  featuredGames: GameTitle[];
  banners: BannerRecord[];
  currency: CurrencyCode;
}

export function HeroSection({
  tagline,
  searchQuery,
  onSearchChange,
  onExploreGames,
  onBrowseTopUps,
  onSelectGame,
  featuredGames,
  banners,
  currency,
}: HeroSectionProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBrowseTopUps();
  };

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#07080F]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-violet-600/18 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/5 w-[440px] h-[440px] rounded-full bg-blue-600/18 blur-[140px]"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-3">
              POWERUP SUN NOVA · {tagline}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
              POWERUP YOUR GAME.
            </h1>
            <p className="font-display text-lg sm:text-xl font-semibold text-violet-300 mt-3">
              Instant Gaming Recharge. Premium Digital Credits. Secure Payments.
            </p>
            <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-xl leading-relaxed">
              Recharge your favourite games with POWERUP SUN NOVA. Discover UC, Diamonds, game
              credits and digital gift cards through a simple and secure shopping experience.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreGames}
                className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Explore Games</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onBrowseTopUps}
                className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Browse Top-Ups</span>
              </button>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl"
            >
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search Free Fire MAX, BGMI, PUBG Global, MLBB, VALORANT..."
                  aria-label="Search games or vouchers"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <button
                type="submit"
                className="px-5 h-11 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-2xl overflow-hidden border border-white/15 bg-slate-950 aspect-[16/9] lg:aspect-auto lg:min-h-[360px] shadow-2xl">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE_URL}
                  alt="POWERUP SUN NOVA gaming hardware, electric purple crystals, and titanium digital credits"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 bg-slate-900 text-slate-300 text-sm">
                  POWERUP SUN NOVA · Instant Gaming Recharge
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Four Priority Featured Game Cards */}
        {featuredGames.length > 0 && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-white">
                Priority Direct Recharges
              </h2>
              <span className="text-xs text-slate-400">
                Free Fire MAX · BGMI · PUBG Mobile · Mobile Legends
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredGames.map((game) => {
                const minPrice = Math.min(...game.packs.map((p) => p.priceInr));
                return (
                  <button
                    key={game.slug}
                    type="button"
                    onClick={() => onSelectGame(game.slug)}
                    className="group text-left glass-card rounded-xl overflow-hidden hover:-translate-y-0.5 hover:border-violet-500/50 transition-all duration-150 flex flex-col cursor-pointer"
                  >
                    <div className="aspect-[4/3] w-full bg-slate-900 overflow-hidden">
                      <GameArtwork
                        game={game}
                        className="group-hover:scale-[1.03] transition-transform duration-200"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between w-full">
                      <div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {game.publisher} · {game.regionLabel}
                        </p>
                        <h3 className="font-display text-sm font-bold text-white mt-1 group-hover:text-sky-400 transition-colors">
                          {game.name}
                        </h3>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-white tabular-nums">
                          From {formatCurrencyFromInr(minPrice, currency)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300">
                          <span>Recharge</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Promotional Banners */}
        {banners.length > 0 && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative rounded-xl overflow-hidden border border-white/10 glass-card p-6 flex flex-col justify-between min-h-[168px]"
              >
                <div className="relative z-10 max-w-lg">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    {banner.eyebrow}
                  </p>
                  <h3 className="font-display text-lg font-bold text-white mt-1">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {banner.subtitle}
                  </p>
                </div>
                <div className="relative z-10 mt-4">
                  <button
                    type="button"
                    onClick={() => onSelectGame(banner.targetSlug)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{banner.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
