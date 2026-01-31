'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Archive {
  id: string;
  week_number: number;
  year: number;
  started_at: string;
  ended_at: string;
  thumbnail_url: string | null;
  total_pixels_placed: number;
  unique_contributors: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GalleryGridProps {
  archives: Archive[];
  pagination: Pagination;
}

function formatDateRange(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

export function GalleryGrid({ archives, pagination }: GalleryGridProps) {
  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {archives.map((archive) => (
          <Link
            key={archive.id}
            href={`/gallery/${archive.id}`}
            className="group relative bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 hover:border-purple-500/50 transition-all"
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-neutral-800 relative">
              {archive.thumbnail_url ? (
                <Image
                  src={archive.thumbnail_url}
                  alt={`Week ${archive.week_number} canvas`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-neutral-600 text-sm">No preview</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">
                  Week {archive.week_number}
                </span>
                <span className="text-xs text-neutral-500">{archive.year}</span>
              </div>
              <p className="text-xs text-neutral-400 mb-2">
                {formatDateRange(archive.started_at, archive.ended_at)}
              </p>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span title="Pixels placed">
                  <PixelIcon className="w-3 h-3 inline mr-1" />
                  {archive.total_pixels_placed.toLocaleString()}
                </span>
                <span title="Contributors">
                  <UserIcon className="w-3 h-3 inline mr-1" />
                  {archive.unique_contributors}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Link
            href={`/gallery?page=${pagination.page - 1}`}
            className={`px-3 py-1.5 rounded bg-neutral-800 text-sm ${
              pagination.page <= 1
                ? 'opacity-50 pointer-events-none'
                : 'hover:bg-neutral-700'
            }`}
          >
            Previous
          </Link>

          <span className="text-sm text-neutral-400 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Link
            href={`/gallery?page=${pagination.page + 1}`}
            className={`px-3 py-1.5 rounded bg-neutral-800 text-sm ${
              pagination.page >= pagination.totalPages
                ? 'opacity-50 pointer-events-none'
                : 'hover:bg-neutral-700'
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}

function PixelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.5 14c.276 0 .5-.224.5-.5V13c0-2.761-2.239-5-5-5s-5 2.239-5 5v.5c0 .276.224.5.5.5h9z" />
    </svg>
  );
}
