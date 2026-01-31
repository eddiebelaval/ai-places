import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  metadata: Record<string, unknown>;
}

interface LeaderboardEntry {
  userId?: string;
  factionId?: string;
  score: number;
}

async function getArchive(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/archives/${id}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch archive');
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch archive:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getArchive(id);

  if (!data) {
    return { title: 'Archive Not Found | AIplaces.art' };
  }

  return {
    title: `Week ${data.archive.weekNumber} (${data.archive.year}) | AIplaces.art`,
    description: `View the canvas from Week ${data.archive.weekNumber} of ${data.archive.year} - ${data.archive.totalPixelsPlaced.toLocaleString()} pixels placed by ${data.archive.uniqueContributors} contributors.`,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} days`;
}

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getArchive(id);

  if (!data) {
    notFound();
  }

  const { archive, leaderboards, commentCounts } = data;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/gallery"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
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
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                Week {archive.weekNumber}, {archive.year}
              </h1>
              <p className="text-neutral-400 mt-1">
                {formatDate(archive.startedAt)} - {formatDate(archive.endedAt)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Canvas Image */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
              <div className="aspect-square relative">
                {archive.imageUrl ? (
                  <Image
                    src={archive.imageUrl}
                    alt={`Week ${archive.weekNumber} canvas`}
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                    <span className="text-neutral-500">
                      Canvas image not available
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Download button */}
            {archive.imageUrl && (
              <div className="mt-4 flex justify-center">
                <a
                  href={archive.imageUrl}
                  download={`aiplacesart-week${archive.weekNumber}-${archive.year}.png`}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Full Resolution
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
              <h2 className="text-lg font-semibold mb-4">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Pixels Placed"
                  value={archive.totalPixelsPlaced.toLocaleString()}
                />
                <StatCard
                  label="Contributors"
                  value={archive.uniqueContributors.toLocaleString()}
                />
                <StatCard
                  label="Duration"
                  value={formatDuration(archive.startedAt, archive.endedAt)}
                />
                <StatCard
                  label="Avg Pixels/User"
                  value={
                    archive.uniqueContributors > 0
                      ? Math.round(
                          archive.totalPixelsPlaced / archive.uniqueContributors
                        ).toLocaleString()
                      : '0'
                  }
                />
              </div>
            </div>

            {/* Top Contributors */}
            {leaderboards.users && leaderboards.users.length > 0 && (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
                <h2 className="text-lg font-semibold mb-4">Top Contributors</h2>
                <div className="space-y-2">
                  {(leaderboards.users as LeaderboardEntry[])
                    .slice(0, 5)
                    .map((entry: LeaderboardEntry, index: number) => (
                      <div
                        key={entry.userId || index}
                        className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 text-sm w-5">
                            #{index + 1}
                          </span>
                          <span className="text-sm">
                            {entry.userId?.slice(0, 8) || 'Anonymous'}
                          </span>
                        </div>
                        <span className="text-sm text-neutral-400">
                          {entry.score.toLocaleString()} px
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Comments Summary */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
              <h2 className="text-lg font-semibold mb-4">Comments</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-neutral-800 rounded-lg">
                  <span className="block text-2xl font-bold">
                    {commentCounts.human}
                  </span>
                  <span className="text-xs text-neutral-400">Human</span>
                </div>
                <div className="text-center p-3 bg-neutral-800 rounded-lg">
                  <span className="block text-2xl font-bold">
                    {commentCounts.agent}
                  </span>
                  <span className="text-xs text-neutral-400">AI Agent</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-3 text-center">
                Comment section coming in Phase 6
              </p>
            </div>

            {/* Back to Gallery */}
            <Link
              href="/gallery"
              className="block w-full text-center px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
            >
              Browse More Archives
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-neutral-800 rounded-lg">
      <span className="block text-xl font-bold">{value}</span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  );
}
