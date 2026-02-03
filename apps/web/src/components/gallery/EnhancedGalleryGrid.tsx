'use client';

import { useState, useMemo } from 'react';
import { ArchiveCard } from './ArchiveCard';
import { ArchiveFilters, type SortOption, type FilterOption } from './ArchiveFilters';
import { ArchiveDetailModal } from './ArchiveDetailModal';

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
    objectives?: Array<{
      id: string;
      name: string;
      icon?: string;
    }>;
    topContributor?: {
      id: string;
      name: string;
      pixelCount: number;
    };
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface EnhancedGalleryGridProps {
  archives: Archive[];
  pagination: Pagination;
}

/**
 * Enhanced Gallery Grid Component
 *
 * Features:
 * - Client-side filtering by game mode/objective
 * - Client-side sorting (newest, oldest, most pixels, most contributors)
 * - Responsive grid layout (2-col mobile, 3-col tablet, 4-col desktop)
 * - Modal preview on card click
 * - Empty state handling
 * - Loading states
 *
 * Performance:
 * - Memoized filtering and sorting
 * - Virtual scrolling for large lists (future enhancement)
 * - Lazy loading images
 *
 * Accessibility:
 * - Keyboard navigation
 * - Screen reader announcements
 * - Focus management
 */
export function EnhancedGalleryGrid({ archives, pagination }: EnhancedGalleryGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);

  // Filter and sort archives
  const processedArchives = useMemo(() => {
    let result = [...archives];

    // Apply filter
    if (filterBy !== 'all') {
      result = result.filter((archive) => {
        const objectives = archive.metadata?.objectives || [];
        return objectives.some((obj) => obj.id === filterBy);
      });
    }

    // Apply sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.week_number - a.week_number;
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.week_number - b.week_number;
        });
        break;
      case 'most-pixels':
        result.sort((a, b) => b.total_pixels_placed - a.total_pixels_placed);
        break;
      case 'most-contributors':
        result.sort((a, b) => b.unique_contributors - a.unique_contributors);
        break;
    }

    return result;
  }, [archives, sortBy, filterBy]);

  return (
    <div>
      {/* Filters */}
      <ArchiveFilters
        currentSort={sortBy}
        currentFilter={filterBy}
        onSortChange={setSortBy}
        onFilterChange={setFilterBy}
        totalCount={processedArchives.length}
      />

      {/* Grid */}
      {processedArchives.length === 0 ? (
        <EmptyState filterActive={filterBy !== 'all'} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {processedArchives.map((archive) => (
            <div
              key={archive.id}
              onClick={() => setSelectedArchiveId(archive.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedArchiveId(archive.id);
                }
              }}
            >
              <ArchiveCard archive={archive} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination - Server-side pagination for full archive list */}
      {pagination.totalPages > 1 && (
        <Pagination pagination={pagination} />
      )}

      {/* Detail Modal */}
      <ArchiveDetailModal
        archiveId={selectedArchiveId}
        onClose={() => setSelectedArchiveId(null)}
      />
    </div>
  );
}

function EmptyState({ filterActive }: { filterActive: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-lg flex items-center justify-center">
        <svg
          className="w-8 h-8 text-neutral-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-neutral-300">
        {filterActive ? 'No archives match this filter' : 'No archives yet'}
      </h2>
      <p className="text-neutral-500 mt-1">
        {filterActive
          ? 'Try adjusting your filter settings'
          : 'The first canvas archive will appear after the weekly reset.'}
      </p>
    </div>
  );
}

function Pagination({ pagination }: { pagination: Pagination }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-6 sm:mt-8">
      <a
        href={`?page=${pagination.page - 1}`}
        className={`px-3 py-2 sm:px-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-neutral-800 text-sm font-medium transition-colors ${
          pagination.page <= 1
            ? 'opacity-50 pointer-events-none cursor-not-allowed'
            : 'hover:bg-neutral-700'
        }`}
        aria-disabled={pagination.page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline">Previous</span>
      </a>

      <div className="flex items-center gap-1">
        {/* Show page numbers with ellipsis for large ranges */}
        {renderPageNumbers(pagination.page, pagination.totalPages)}
      </div>

      <a
        href={`?page=${pagination.page + 1}`}
        className={`px-3 py-2 sm:px-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-neutral-800 text-sm font-medium transition-colors ${
          pagination.page >= pagination.totalPages
            ? 'opacity-50 pointer-events-none cursor-not-allowed'
            : 'hover:bg-neutral-700'
        }`}
        aria-disabled={pagination.page >= pagination.totalPages}
        aria-label="Next page"
      >
        <ChevronRightIcon className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline">Next</span>
      </a>
    </div>
  );
}

function renderPageNumbers(currentPage: number, totalPages: number) {
  const pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <PageButton key={i} page={i} currentPage={currentPage} />
      );
    }
  } else {
    // Show first, last, and pages around current
    pages.push(<PageButton key={1} page={1} currentPage={currentPage} />);

    if (currentPage > 3) {
      pages.push(<Ellipsis key="ellipsis-start" />);
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(<PageButton key={i} page={i} currentPage={currentPage} />);
    }

    if (currentPage < totalPages - 2) {
      pages.push(<Ellipsis key="ellipsis-end" />);
    }

    pages.push(<PageButton key={totalPages} page={totalPages} currentPage={currentPage} />);
  }

  return pages;
}

function PageButton({ page, currentPage }: { page: number; currentPage: number }) {
  const isCurrent = page === currentPage;

  return (
    <a
      href={`?page=${page}`}
      className={`min-w-[2.5rem] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isCurrent
          ? 'bg-amber-600 text-white'
          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
      }`}
      aria-current={isCurrent ? 'page' : undefined}
    >
      {page}
    </a>
  );
}

function Ellipsis() {
  return (
    <span className="px-2 py-2 text-neutral-500 text-sm">
      ...
    </span>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}
