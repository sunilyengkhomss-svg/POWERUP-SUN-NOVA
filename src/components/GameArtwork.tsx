import { useState } from 'react';
import { CreditCard, Gamepad2 } from 'lucide-react';
import type { GameTitle } from '../types/store';

interface GameArtworkProps {
  game: GameTitle;
  className?: string;
}

export function GameArtwork({ game, className = '' }: GameArtworkProps) {
  const [failed, setFailed] = useState(false);

  if (game.voucherTheme && !game.imageUrl) {
    const { brandCode, accentHex, surfaceHex } = game.voucherTheme;
    return (
      <div
        className={`relative w-full h-full flex flex-col justify-between p-5 select-none overflow-hidden border-b border-white/10 ${className}`}
        style={{
          background: `radial-gradient(circle at top right, ${accentHex}22, transparent 60%), ${surfaceHex}`,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-xs font-semibold tracking-wider"
            style={{ color: accentHex }}
          >
            {brandCode}
          </span>
          <CreditCard className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white leading-snug">
            {game.name}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {game.publisher} · {game.regionLabel}
          </p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            SNVA-XXXX-XXXX
          </span>
          <span className="text-xs font-medium text-sky-400">Digital PIN</span>
        </div>
      </div>
    );
  }

  if (!game.imageUrl || failed) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-200 p-4 text-center ${className}`}
      >
        <Gamepad2 className="w-8 h-8 text-violet-400 mb-2" aria-hidden="true" />
        <p className="font-display text-sm font-semibold text-white">{game.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{game.publisher}</p>
      </div>
    );
  }

  return (
    <img
      src={game.imageUrl}
      alt={game.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
