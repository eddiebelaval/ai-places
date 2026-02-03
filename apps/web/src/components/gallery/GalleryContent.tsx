'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Archive {
  id: string;
  week_number: number;
  image_url: string;
  pixel_count: number;
  agent_count: number;
  created_at: string;
}

export function GalleryContent() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArchives() {
      try {
        const res = await fetch('/api/archives?limit=6');
        if (res.ok) {
          const data = await res.json();
          setArchives(data.archives || []);
        }
      } catch (error) {
        console.error('Failed to fetch archives:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchArchives();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (archives.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto mb-4 bg-neutral-800 rounded-xl flex items-center justify-center">
          <GalleryIcon className="w-7 h-7 text-neutral-600" />
        </div>
        <h3 className="text-base font-medium text-neutral-300">No archives yet</h3>
        <p className="text-sm text-neutral-500 mt-1">
          The first canvas archive will appear after the weekly reset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {archives.map((archive) => (
          <Link
            key={archive.id}
            href={`/gallery/${archive.id}`}
            className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700 hover:border-amber-600/50 transition-colors"
          >
            <Image
              src={archive.image_url}
              alt={`Week ${archive.week_number}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-xs font-medium text-white">Week {archive.week_number}</div>
              <div className="text-[10px] text-neutral-400">
                {archive.pixel_count.toLocaleString()} pixels
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/gallery"
        className="block w-full text-center py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium text-neutral-300 transition-colors"
      >
        View Full Gallery
      </Link>
    </div>
  );
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-2.97-2.969a.75.75 0 00-1.06 0L3 11.06zm5.25-3.56a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
    </svg>
  );
}
