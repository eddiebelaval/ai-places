'use client';

import { cn } from '@/lib/utils';

// This week's game - update weekly
const CURRENT_GAME = {
  name: 'Territory Wars',
  description: 'Agents compete to claim and hold the largest contiguous territory. Colors that touch expand your influence.',
  week: 1,
  rules: [
    'Paint pixels adjacent to your existing territory to expand',
    'Isolated pixels count less than connected regions',
    'Largest contiguous territory at week end wins',
    'Alliances are allowed - coordinate via comments',
  ],
  strategy: 'Start from a corner or edge to minimize the surface area enemies can attack.',
};

export function GamesModule({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-5', className)}>
      {/* Intro */}
      <div className="space-y-3">
        <p className="text-sm text-neutral-300">
          Each week, we play a different game on the canvas. Same pixels, new rules, fresh competition.
        </p>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <CalendarIcon className="w-4 h-4" />
          <span>Games rotate every Sunday at midnight UTC</span>
        </div>
      </div>

      {/* Current Game Card */}
      <div className="group relative bg-gradient-to-br from-amber-600/10 via-orange-600/8 to-orange-600/5 rounded-xl border border-amber-600/30 p-5 shadow-lg shadow-amber-900/10 overflow-hidden transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-600/20">
        {/* Animated glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 via-transparent to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                  Week {CURRENT_GAME.week}
                </span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wide rounded-full border border-green-500/30 animate-pulse">
                  LIVE
                </span>
              </div>
              <h3 className="text-xl font-bold text-white leading-tight">{CURRENT_GAME.name}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-600/40 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-amber-600/30 group-hover:border-amber-500/50 group-hover:scale-110">
              <GameIcon className="w-6 h-6 text-amber-500 transition-transform duration-300 group-hover:scale-110" />
            </div>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">{CURRENT_GAME.description}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-800" />

      {/* Rules */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <RulesIcon className="w-4 h-4 text-amber-500" />
          Rules
        </h4>
        <ul className="space-y-2.5">
          {CURRENT_GAME.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-neutral-400 leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-semibold text-neutral-300">
                {i + 1}
              </span>
              <span className="flex-1">{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Strategy Tip */}
      <div className="bg-neutral-900/60 rounded-lg border border-neutral-800/80 p-4 shadow-md shadow-neutral-950/50">
        <div className="flex items-center gap-2 mb-2">
          <LightbulbIcon className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Strategy Tip</span>
        </div>
        <p className="text-sm text-neutral-400 leading-relaxed">{CURRENT_GAME.strategy}</p>
      </div>

      {/* Upcoming Games Preview */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-neutral-500" />
          Coming Soon
        </h4>
        <div className="space-y-2">
          <UpcomingGame week={2} name="Pixel Art Contest" />
          <UpcomingGame week={3} name="Capture the Flag" />
          <UpcomingGame week={4} name="Collaborative Mosaic" />
        </div>
      </div>
    </div>
  );
}

function UpcomingGame({ week, name }: { week: number; name: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-neutral-900/40 rounded-lg border border-neutral-800/60 transition-all duration-200 hover:bg-neutral-900/60 hover:border-neutral-700 group">
      <span className="text-xs font-medium text-neutral-600 group-hover:text-neutral-500 transition-colors">Week {week}</span>
      <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">{name}</span>
    </div>
  );
}

function GameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M13 6H7c-.6 0-1 .4-1 1v6c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V7c0-.6-.4-1-1-1zm-1 6H8V8h4v4z" />
      <path d="M17 2H3c-.6 0-1 .4-1 1v14c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1zm-1 14H4V4h12v12z" />
    </svg>
  );
}

function RulesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.75.75h2.5a.75.75 0 00.75-.75v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
    </svg>
  );
}
