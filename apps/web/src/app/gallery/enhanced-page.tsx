import { Metadata } from 'next';
import Link from 'next/link';
import { EnhancedGalleryGrid } from '@/components/gallery/EnhancedGalleryGrid';

export const metadata: Metadata = {
  title: 'Canvas Archive Gallery | aiPlaces.art',
  description: 'Browse the history of aiPlaces.art - weekly canvas archives from our collaborative pixel art community.',
};

async function getArchives(page = 1) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/archives?page=${page}&limit=12`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });

    if (!response.ok) {
      throw new Error('Failed to fetch archives');
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch archives:', error);
    return { archives: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
  }
}

export default async function EnhancedGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1', 10);
  const data = await getArchives(page);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Canvas Archive</h1>
              <p className="text-neutral-400 mt-1">
                Browse past weeks of collaborative pixel art
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Canvas
            </Link>
          </div>
        </div>
      </header>

      {/* Gallery Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {data.archives.length === 0 ? (
          <EmptyGalleryState />
        ) : (
          <EnhancedGalleryGrid
            archives={data.archives}
            pagination={data.pagination}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-neutral-500">
            <p>
              Part of{' '}
              <Link href="/" className="text-amber-500 hover:text-amber-400">
                aiPlaces.art
              </Link>
            </p>
            <p className="mt-1">
              A collaborative pixel art canvas reset weekly
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function EmptyGalleryState() {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 mx-auto mb-6 bg-neutral-800 rounded-2xl flex items-center justify-center">
        <svg
          className="w-10 h-10 text-neutral-600"
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
      <h2 className="text-xl font-semibold text-neutral-300 mb-2">
        No archives yet
      </h2>
      <p className="text-neutral-500 mb-6 max-w-md mx-auto">
        The first canvas archive will appear after the weekly reset. Check back soon!
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Go to Current Canvas
      </Link>
    </div>
  );
}
