import { useState } from 'react';
import { ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { CURRENCY_CONFIG, formatCurrencyFromInr } from '../data/catalog';
import type {
  CurrencyCode,
  GameCategory,
  GameTitle,
  ShowcaseSectionTag,
} from '../types/store';
import { GameArtwork } from './GameArtwork';

export type SortMode = 'popular' | 'price-asc' | 'discount-desc';

interface CatalogSectionProps {
  titles: GameTitle[];
  selectedCategory: GameCategory;
  onCategoryChange: (category: GameCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onSelectGame: (slug: string) => void;
}

const CATEGORIES: GameCategory[] = [
  'All',
  'Battle Royale',
  'Action RPG',
  'MOBA & Strategy',
  'Tactical FPS',
  'Gift Cards',
];

const COLLECTION_TABS: Array<{ id: 'all' | ShowcaseSectionTag; label: string }> = [
  { id: 'all', label: 'All Available' },
  { id: 'popular', label: 'Popular Recharge' },
  { id: 'trending', label: 'Trending Games' },
  { id: 'bestseller', label: 'Best-Selling Products' },
  { id: 'new', label: 'New Arrivals' },
  { id: 'offer', label: 'Special Offers' },
  { id: 'giftcard', label: 'Gift Cards' },
];

export function CatalogSection({
  titles,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  currency,
  onCurrencyChange,
  sortMode,
  onSortChange,
  onSelectGame,
}: CatalogSectionProps) {
  const [collectionFilter, setCollectionFilter] = useState<'all' | ShowcaseSectionTag>('all');

  // Only display games whose supplier & recharge integration are configured and active
  const availableTitles = titles.filter((t) => t.isAvailable !== false && t.packs.length > 0);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = availableTitles
    .filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (collectionFilter !== 'all' && !item.sectionTags.includes(collectionFilter)) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.publisher.toLowerCase().includes(normalizedQuery) ||
        item.currencyUnitName.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery) ||
        item.regionLabel.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      const minA = Math.min(...a.packs.map((p) => p.priceInr));
      const minB = Math.min(...b.packs.map((p) => p.priceInr));
      if (sortMode === 'price-asc') return minA - minB;
      if (sortMode === 'discount-desc') {
        return (b.discountPercent || 0) - (a.discountPercent || 0);
      }
      return 0;
    });

  return (
    <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header & Currency/Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {selectedCategory === 'Gift Cards'
              ? 'Digital Gift Cards'
              : 'POWERUP Direct Top-Up Store'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Showing {filtered.length} verified games and digital vouchers with active supplier
            integration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
            <span>Currency</span>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              aria-label="Display currency"
              className="h-9 px-2.5 rounded-lg border border-white/15 bg-[#0F1322] text-xs font-semibold text-white focus:outline-none focus:border-violet-500"
            >
              {(Object.keys(CURRENCY_CONFIG) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_CONFIG[code].label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <select
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
              aria-label="Sort catalog"
              className="h-9 px-2.5 rounded-lg border border-white/15 bg-[#0F1322] text-xs font-semibold text-white focus:outline-none focus:border-violet-500"
            >
              <option value="popular">Popular Titles</option>
              <option value="price-asc">Lowest Starting Price</option>
              <option value="discount-desc">Highest Discount</option>
            </select>
          </label>
        </div>
      </div>

      {/* Curated Showcase Tabs (Popular, Trending, Best-Selling, New Arrivals, Offers, Gift Cards) */}
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        {COLLECTION_TABS.map((tab) => {
          const active = collectionFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCollectionFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Category & Search Toolbar */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg overflow-x-auto"
          role="tablist"
          aria-label="Game categories"
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(category)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {category === 'All' ? 'All Categories' : category}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by game, region, or publisher..."
            aria-label="Filter catalog titles"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 py-14 px-6 glass-card rounded-xl text-center">
          <p className="font-display text-base font-semibold text-white">
            No matching titles found
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Try clearing your search filter or switching to All Categories.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onCategoryChange('All');
              setCollectionFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game) => {
            const minPriceInr = Math.min(...game.packs.map((p) => p.priceInr));
            return (
              <button
                key={game.slug}
                type="button"
                onClick={() => onSelectGame(game.slug)}
                className="group text-left glass-card rounded-xl overflow-hidden hover:-translate-y-0.5 hover:border-violet-500/50 transition-all duration-150 flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <div className="aspect-[4/3] w-full bg-slate-900 overflow-hidden">
                  <GameArtwork
                    game={game}
                    className="group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between w-full">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="truncate">
                        {game.platformLabel} · {game.regionLabel}
                      </span>
                      {game.discountPercent ? (
                        <span className="font-semibold text-sky-400 whitespace-nowrap shrink-0 tabular-nums">
                          Save up to {game.discountPercent}%
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-display text-base font-bold text-white mt-1.5 group-hover:text-sky-400 transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {game.currencyUnitName} · {game.deliveryEstimate}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">From </span>
                      <span className="font-mono text-sm font-bold text-white tabular-nums">
                        {formatCurrencyFromInr(minPriceInr, currency)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 group-hover:text-sky-300">
                      <span>Top Up</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
