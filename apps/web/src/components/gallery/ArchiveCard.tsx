'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDateRange, formatNumber, getIconForObjective } from './gallery-utils';

interface Archive {
  id: string;
  week_number: number;
  year: number;
  started_at: string;
  ended_at: string;
  thumbnail_url: string | null;
  total_pixels_placed: number;
  unique_contributors: number;
  metadata?: {
    objectives?: Array<{ id: string; name: string; icon?: string }>;
    topContributor?: { id: string; name: string; pixelCount: number };
  };
}

interface ArchiveCardProps {
  archive: Archive;
  className?: string;
}

export function ArchiveCard({ archive, className = '' }: ArchiveCardProps): React.ReactNode {
  const dateRange = formatDateRange(archive.started_at, archive.ended_at);
  const objectives = archive.metadata?.objectives || [];
  const topContributor = archive.metadata?.topContributor;

  return (
    <Link
      href={`/gallery/${archive.id}`}
      className={`group relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-neutral-950 ${className}`}
      aria-label={`View archive for Week ${archive.week_number}, ${archive.year}`}
    >
      <div className="aspect-square bg-neutral-800 relative">
        {archive.thumbnail_url ? (
          <Image src={archive.thumbnail_url} alt={`Canvas from Week ${archive.week_number}, ${archive.year}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CanvasPlaceholderIcon className="w-12 h-12 text-neutral-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-3 left-3">
          <div className="bg-neutral-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-neutral-700">
            <span className="text-xs font-semibold text-amber-400">Week {archive.week_number}</span>
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <div className="bg-neutral-900/90 backdrop-blur-sm px-2 py-1 rounded-md border border-neutral-700">
            <span className="text-[10px] font-medium text-neutral-400">{archive.year}</span>
          </div>
        </div>

        {objectives.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {objectives.slice(0, 2).map((objective) => (
              <div key={objective.id} className="bg-purple-900/90 backdrop-blur-sm px-2 py-1.5 rounded-md border border-purple-700/50 flex items-center gap-1.5" title={objective.name}>
                {objective.icon && <span className="text-sm">{getIconForObjective(objective.icon)}</span>}
                <span className="text-xs font-medium text-purple-200 truncate max-w-[100px]">{objective.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-neutral-400 mb-3">{dateRange}</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatBadge icon={<PixelIcon />} label="Pixels" value={formatNumber(archive.total_pixels_placed)} />
          <StatBadge icon={<UserIcon />} label="Contributors" value={formatNumber(archive.unique_contributors)} />
        </div>

        {topContributor && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
              <TrophyIcon className="w-3 h-3 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-neutral-500">Top Contributor</p>
                <p className="text-xs font-medium text-white truncate">{topContributor.name}</p>
              </div>
              <span className="text-[10px] text-neutral-400">{formatNumber(topContributor.pixelCount)}px</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactNode {
  return (
    <div className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded-lg border border-neutral-700/30">
      <div className="text-neutral-400 w-4 h-4 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function PixelIcon(): React.ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function UserIcon(): React.ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.5 14c.276 0 .5-.224.5-.5V13c0-2.761-2.239-5-5-5s-5 2.239-5 5v.5c0 .276.224.5.5.5h9z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M3.5 2a.5.5 0 00-.5.5V3h-.5A1.5 1.5 0 001 4.5V5a3 3 0 003 3h.268A2 2 0 006 9.5V11H5a1 1 0 00-1 1v1a1 1 0 001 1h6a1 1 0 001-1v-1a1 1 0 00-1-1H10V9.5a2 2 0 001.732-1.5H12a3 3 0 003-3v-.5A1.5 1.5 0 0013.5 3H13v-.5a.5.5 0 00-.5-.5h-9zM13 5v-.5a.5.5 0 00-.5-.5H12v2.5c0 .235.041.46.116.671A2 2 0 0013 5zM3 5a2 2 0 00.884 1.671A3.01 3.01 0 014 5V4h-.5a.5.5 0 00-.5.5V5z" />
    </svg>
  );
}

function CanvasPlaceholderIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
