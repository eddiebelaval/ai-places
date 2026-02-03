'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatDateRange, calculateDuration, getIconForObjective, getRankColor } from './gallery-utils';

interface ArchiveDetail {
  id: string;
  weekNumber: number;
  year: number;
  startedAt: string;
  endedAt: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  totalPixelsPlaced: number;
  uniqueContributors: number;
  metadata?: {
    objectives?: Array<{ id: string; name: string; description: string; icon?: string }>;
  };
}

interface LeaderboardEntry {
  userId?: string;
  agentId?: string;
  username?: string;
  agentName?: string;
  score: number;
}

interface Leaderboards {
  users?: LeaderboardEntry[];
  agents?: LeaderboardEntry[];
}

interface ArchiveDetailModalProps {
  archiveId: string | null;
  onClose: () => void;
}

export function ArchiveDetailModal({ archiveId, onClose }: ArchiveDetailModalProps): React.ReactNode {
  const [archive, setArchive] = useState<ArchiveDetail | null>(null);
  const [leaderboards, setLeaderboards] = useState<Leaderboards>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'agents'>('users');

  useEffect(() => {
    if (!archiveId) return;

    async function fetchArchiveDetail(): Promise<void> {
      setLoading(true);
      try {
        const response = await fetch(`/api/archives/${archiveId}`);
        if (response.ok) {
          const data = await response.json();
          setArchive(data.archive);
          setLeaderboards(data.leaderboards || {});
        }
      } catch (error) {
        console.error('Failed to fetch archive:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArchiveDetail();
  }, [archiveId]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (archiveId) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [archiveId]);

  if (!archiveId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
      <div className="relative w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[90vh] bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-neutral-800 flex-shrink-0">
          <div>
            <h2 id="archive-modal-title" className="text-xl font-bold text-white">
              {loading ? 'Loading...' : `Week ${archive?.weekNumber}, ${archive?.year}`}
            </h2>
            {!loading && archive && (
              <p className="text-sm text-neutral-400 mt-0.5">{formatDateRange(archive.startedAt, archive.endedAt)}</p>
            )}
          </div>
          <button onClick={onClose} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-neutral-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Close modal">
            <CloseIcon className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : archive ? (
            <div className="grid lg:grid-cols-3 gap-4 p-4 md:gap-6 md:p-6">
              <div className="lg:col-span-2">
                <div className="bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                  <div className="aspect-square relative">
                    {archive.imageUrl ? (
                      <Image src={archive.imageUrl} alt={`Canvas from Week ${archive.weekNumber}`} fill className="object-contain" unoptimized priority />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-neutral-500">Canvas image not available</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  {archive.imageUrl && (
                    <a href={archive.imageUrl} download={`aiplacesart-week${archive.weekNumber}-${archive.year}.png`} className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <DownloadIcon className="w-4 h-4" />
                      Download Full Resolution
                    </a>
                  )}
                  <button className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed" disabled title="Coming soon">
                    <PlayIcon className="w-4 h-4" />
                    Timelapse
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <StatsCard archive={archive} />
                {archive.metadata?.objectives && archive.metadata.objectives.length > 0 && (
                  <ObjectivesCard objectives={archive.metadata.objectives} />
                )}
                <LeaderboardCard leaderboards={leaderboards} activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-neutral-400">Failed to load archive</p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 -z-10" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

function StatsCard({ archive }: { archive: ArchiveDetail }): React.ReactNode {
  const avgPixelsPerUser = archive.uniqueContributors > 0
    ? Math.round(archive.totalPixelsPlaced / archive.uniqueContributors)
    : 0;

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Statistics</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatItem label="Pixels" value={archive.totalPixelsPlaced.toLocaleString()} />
        <StatItem label="Contributors" value={archive.uniqueContributors.toLocaleString()} />
        <StatItem label="Avg/User" value={avgPixelsPerUser.toLocaleString()} />
        <StatItem label="Duration" value={calculateDuration(archive.startedAt, archive.endedAt)} />
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }): React.ReactNode {
  return (
    <div className="text-center p-2 bg-neutral-900 rounded">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-neutral-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ObjectivesCard({ objectives }: { objectives: Array<{ id: string; name: string; description: string; icon?: string }> }): React.ReactNode {
  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Game Modes</h3>
      <div className="space-y-2">
        {objectives.map((objective) => (
          <div key={objective.id} className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
            <div className="flex items-start gap-2">
              {objective.icon && <span className="text-lg">{getIconForObjective(objective.icon)}</span>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{objective.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{objective.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardCard({ leaderboards, activeTab, onTabChange }: { leaderboards: Leaderboards; activeTab: 'users' | 'agents'; onTabChange: (tab: 'users' | 'agents') => void }): React.ReactNode {
  const currentLeaderboard = leaderboards[activeTab] || [];

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Leaderboard</h3>

      <div className="flex gap-2 mb-3">
        {(['users', 'agents'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === tab ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {tab === 'users' ? 'Users' : 'Agents'}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {currentLeaderboard.length > 0 ? (
          currentLeaderboard.map((entry, index) => (
            <div key={entry.userId || entry.agentId || index} className="flex items-center justify-between py-2 px-3 bg-neutral-900 rounded border border-neutral-700">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-xs font-medium ${getRankColor(index)}`}>#{index + 1}</span>
                <span className="text-sm text-white truncate">{entry.username || entry.agentName || 'Anonymous'}</span>
              </div>
              <span className="text-xs text-neutral-400">{entry.score.toLocaleString()} px</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-neutral-500 text-center py-4">No entries</p>
        )}
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  );
}
