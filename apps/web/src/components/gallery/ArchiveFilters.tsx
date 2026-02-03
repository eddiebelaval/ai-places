'use client';

import { useState } from 'react';

export type SortOption = 'newest' | 'oldest' | 'most-pixels' | 'most-contributors';
export type FilterOption = 'all' | 'territory_king' | 'collaboration_star' | 'speed_demon' | 'artistic_merit';

interface ArchiveFiltersProps {
  currentSort: SortOption;
  currentFilter: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  totalCount: number;
}

/**
 * Archive Filters and Sort Component
 *
 * Features:
 * - Sort by date, pixel count, or contributor count
 * - Filter by game mode/objective type
 * - Responsive design with dropdown menus
 * - Active state indicators
 *
 * Accessibility:
 * - Proper button roles and labels
 * - Keyboard navigation support
 * - Screen reader friendly
 */
export function ArchiveFilters({
  currentSort,
  currentFilter,
  onSortChange,
  onFilterChange,
  totalCount,
}: ArchiveFiltersProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const sortOptions: Array<{ value: SortOption; label: string; icon: string }> = [
    { value: 'newest', label: 'Newest First', icon: '↓' },
    { value: 'oldest', label: 'Oldest First', icon: '↑' },
    { value: 'most-pixels', label: 'Most Pixels', icon: '🎨' },
    { value: 'most-contributors', label: 'Most Contributors', icon: '👥' },
  ];

  const filterOptions: Array<{ value: FilterOption; label: string; icon: string }> = [
    { value: 'all', label: 'All Archives', icon: '🎯' },
    { value: 'territory_king', label: 'Territory King', icon: '👑' },
    { value: 'collaboration_star', label: 'Team Player', icon: '🤝' },
    { value: 'speed_demon', label: 'Speed Demon', icon: '⚡' },
    { value: 'artistic_merit', label: 'Artistic Merit', icon: '⭐' },
  ];

  const currentSortLabel = sortOptions.find((opt) => opt.value === currentSort)?.label || 'Sort';
  const currentFilterLabel = filterOptions.find((opt) => opt.value === currentFilter)?.label || 'Filter';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      {/* Results count */}
      <div className="text-sm text-neutral-400">
        <span className="font-medium text-white">{totalCount}</span> archive{totalCount !== 1 ? 's' : ''} found
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Filter Dropdown */}
        <div className="relative flex-1 sm:flex-initial">
          <button
            onClick={() => {
              setFilterOpen(!filterOpen);
              setSortOpen(false);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Filter archives"
            aria-expanded={filterOpen}
          >
            <span className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Filter:</span>
              <span className="truncate">{currentFilterLabel}</span>
            </span>
            <ChevronIcon className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[200px] mt-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-10 overflow-hidden">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFilterChange(option.value);
                    setFilterOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    currentFilter === option.value
                      ? 'bg-amber-600 text-white font-medium'
                      : 'text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <span className="text-base">{option.icon}</span>
                  <span>{option.label}</span>
                  {currentFilter === option.value && (
                    <CheckIcon className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex-1 sm:flex-initial">
          <button
            onClick={() => {
              setSortOpen(!sortOpen);
              setFilterOpen(false);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Sort archives"
            aria-expanded={sortOpen}
          >
            <span className="flex items-center gap-2">
              <SortIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Sort:</span>
              <span className="truncate">{currentSortLabel}</span>
            </span>
            <ChevronIcon className={`w-4 h-4 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortOpen && (
            <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[200px] mt-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-10 overflow-hidden">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setSortOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    currentSort === option.value
                      ? 'bg-amber-600 text-white font-medium'
                      : 'text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <span className="text-base">{option.icon}</span>
                  <span>{option.label}</span>
                  {currentSort === option.value && (
                    <CheckIcon className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(sortOpen || filterOpen) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setSortOpen(false);
            setFilterOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Icon Components

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
