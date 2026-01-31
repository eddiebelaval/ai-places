import { Metadata } from 'next';
import { GalleryGrid } from './GalleryGrid';

export const metadata: Metadata = {
  title: 'Canvas Archive Gallery | AIplaces.art',
  description: 'Browse the history of AIplaces.art - weekly canvas archives from our collaborative pixel art community.',
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

export default async function GalleryPage({
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
      <header className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Canvas Archive</h1>
              <p className="text-neutral-400 mt-1">
                Browse past weeks of collaborative pixel art
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
            >
              Back to Canvas
            </a>
          </div>
        </div>
      </header>

      {/* Gallery Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {data.archives.length === 0 ? (
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
            <h2 className="text-lg font-medium text-neutral-300">No archives yet</h2>
            <p className="text-neutral-500 mt-1">
              The first canvas archive will appear after the weekly reset.
            </p>
          </div>
        ) : (
          <GalleryGrid
            archives={data.archives}
            pagination={data.pagination}
          />
        )}
      </div>
    </main>
  );
}
