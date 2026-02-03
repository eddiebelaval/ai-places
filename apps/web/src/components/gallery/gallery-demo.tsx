/**
 * Gallery Components Demo
 *
 * This file demonstrates all gallery components with sample data.
 * Useful for development, testing, and documentation.
 *
 * To use: Import this component in a Next.js page for visual testing.
 */

'use client';

import { useState } from 'react';
import { ArchiveCard } from './ArchiveCard';
import { ArchiveFilters, SortOption, FilterOption } from './ArchiveFilters';
import { ArchiveDetailModal } from './ArchiveDetailModal';

// Sample archive data
const SAMPLE_ARCHIVES = [
  {
    id: 'archive-1',
    week_number: 5,
    year: 2026,
    started_at: '2026-01-26T00:00:00Z',
    ended_at: '2026-02-01T23:59:59Z',
    thumbnail_url: 'https://via.placeholder.com/500x500/1a1a1a/fbbf24?text=Week+5',
    total_pixels_placed: 125000,
    unique_contributors: 42,
    metadata: {
      objectives: [
        { id: 'territory_king', name: 'Territory King', icon: 'crown' },
        { id: 'speed_demon', name: 'Speed Demon', icon: 'zap' },
      ],
      topContributor: {
        id: 'user-1',
        name: 'PixelMaster',
        pixelCount: 5420,
      },
    },
  },
  {
    id: 'archive-2',
    week_number: 4,
    year: 2026,
    started_at: '2026-01-19T00:00:00Z',
    ended_at: '2026-01-25T23:59:59Z',
    thumbnail_url: 'https://via.placeholder.com/500x500/1a1a1a/8b5cf6?text=Week+4',
    total_pixels_placed: 89500,
    unique_contributors: 38,
    metadata: {
      objectives: [
        { id: 'collaboration_star', name: 'Team Player', icon: 'users' },
      ],
      topContributor: {
        id: 'user-2',
        name: 'ArtBot3000',
        pixelCount: 4120,
      },
    },
  },
  {
    id: 'archive-3',
    week_number: 3,
    year: 2026,
    started_at: '2026-01-12T00:00:00Z',
    ended_at: '2026-01-18T23:59:59Z',
    thumbnail_url: null,
    total_pixels_placed: 67200,
    unique_contributors: 29,
    metadata: {
      objectives: [
        { id: 'artistic_merit', name: 'Artistic Merit', icon: 'star' },
      ],
    },
  },
  {
    id: 'archive-4',
    week_number: 2,
    year: 2026,
    started_at: '2026-01-05T00:00:00Z',
    ended_at: '2026-01-11T23:59:59Z',
    thumbnail_url: 'https://via.placeholder.com/500x500/1a1a1a/ec4899?text=Week+2',
    total_pixels_placed: 45800,
    unique_contributors: 22,
  },
  {
    id: 'archive-5',
    week_number: 1,
    year: 2026,
    started_at: '2026-01-01T00:00:00Z',
    ended_at: '2026-01-04T23:59:59Z',
    thumbnail_url: 'https://via.placeholder.com/500x500/1a1a1a/10b981?text=Week+1',
    total_pixels_placed: 28900,
    unique_contributors: 15,
    metadata: {
      objectives: [
        { id: 'speed_demon', name: 'Speed Demon', icon: 'zap' },
        { id: 'territory_king', name: 'Territory King', icon: 'crown' },
      ],
      topContributor: {
        id: 'user-3',
        name: 'FirstMover',
        pixelCount: 2890,
      },
    },
  },
];

export function GalleryDemo() {
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Gallery Components Demo</h1>
          <p className="text-neutral-400">
            Visual showcase of all gallery components
          </p>
        </div>

        {/* Section 1: Archive Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b border-neutral-800">
            1. Archive Cards
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SAMPLE_ARCHIVES.map((archive) => (
              <div
                key={archive.id}
                onClick={() => setSelectedArchiveId(archive.id)}
                className="cursor-pointer"
              >
                <ArchiveCard archive={archive} />
              </div>
            ))}
          </div>
          <p className="text-sm text-neutral-500 mt-4">
            Click any card to open detail modal
          </p>
        </section>

        {/* Section 2: Archive Card States */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b border-neutral-800">
            2. Archive Card Variations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* With full metadata */}
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-3">
                Full Metadata
              </h3>
              <ArchiveCard archive={SAMPLE_ARCHIVES[0]} />
            </div>

            {/* Without thumbnail */}
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-3">
                No Thumbnail
              </h3>
              <ArchiveCard archive={SAMPLE_ARCHIVES[2]} />
            </div>

            {/* Minimal metadata */}
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-3">
                Minimal Metadata
              </h3>
              <ArchiveCard archive={SAMPLE_ARCHIVES[3]} />
            </div>
          </div>
        </section>

        {/* Section 3: Filters */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b border-neutral-800">
            3. Archive Filters
          </h2>
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <ArchiveFilters
              currentSort={sortBy}
              currentFilter={filterBy}
              onSortChange={setSortBy}
              onFilterChange={setFilterBy}
              totalCount={SAMPLE_ARCHIVES.length}
            />
            <div className="mt-6 p-4 bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-300">
                <strong>Current State:</strong>
              </p>
              <p className="text-xs text-neutral-400 mt-2">
                Sort: <span className="text-amber-400">{sortBy}</span>
              </p>
              <p className="text-xs text-neutral-400">
                Filter: <span className="text-amber-400">{filterBy}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Number Formatting */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b border-neutral-800">
            4. Number Formatting Examples
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumberFormatDemo value={999} expected="999" />
            <NumberFormatDemo value={1500} expected="1.5K" />
            <NumberFormatDemo value={125000} expected="125.0K" />
            <NumberFormatDemo value={1500000} expected="1.5M" />
          </div>
        </section>

        {/* Section 5: Responsive Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b border-neutral-800">
            5. Responsive Grid Layout
          </h2>
          <p className="text-sm text-neutral-400 mb-4">
            Resize your browser to see responsive behavior: 2 cols (mobile) → 3 cols (tablet) → 4 cols (desktop)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SAMPLE_ARCHIVES.slice(0, 8).map((archive) => (
              <ArchiveCard key={archive.id} archive={archive} />
            ))}
          </div>
        </section>

        {/* Section 6: Accessibility Features */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b border-neutral-800">
            6. Accessibility Features
          </h2>
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Keyboard Navigation</p>
                <p className="text-xs text-neutral-400">
                  Tab through cards, Enter to select, ESC to close modal
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">ARIA Labels</p>
                <p className="text-xs text-neutral-400">
                  All interactive elements have descriptive labels
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Focus Indicators</p>
                <p className="text-xs text-neutral-400">
                  Visible focus rings on all interactive elements
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Screen Reader Support</p>
                <p className="text-xs text-neutral-400">
                  Semantic HTML and proper image alt text
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Detail Modal */}
      <ArchiveDetailModal
        archiveId={selectedArchiveId}
        onClose={() => setSelectedArchiveId(null)}
      />
    </div>
  );
}

// Helper components

function NumberFormatDemo({ value, expected }: { value: number; expected: string }) {
  return (
    <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 text-center">
      <p className="text-2xl font-bold text-white mb-1">{expected}</p>
      <p className="text-xs text-neutral-500">from {value.toLocaleString()}</p>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
