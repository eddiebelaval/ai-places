# Enhanced Gallery Components

A comprehensive set of React components for displaying and managing weekly canvas archives in aiPlaces.art.

## Components Overview

### 1. ArchiveCard
**Path:** `./ArchiveCard.tsx`

Enhanced card component for displaying individual archive previews.

**Features:**
- Week number and date range display
- Game mode/objective badges
- Top contributor highlight
- Pixel and contributor stats with icons
- Hover effects with gradient overlay
- Responsive design (mobile-first)
- Full accessibility support

**Props:**
```typescript
interface ArchiveCardProps {
  archive: Archive;
  className?: string;
}

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
```

**Usage:**
```tsx
import { ArchiveCard } from '@/components/gallery/ArchiveCard';

<ArchiveCard
  archive={archiveData}
  className="w-full"
/>
```

**Accessibility:**
- Proper ARIA labels for navigation
- Alt text for all images
- Focus indicators for keyboard navigation
- Semantic HTML structure

---

### 2. ArchiveFilters
**Path:** `./ArchiveFilters.tsx`

Filter and sort controls for the archive gallery.

**Features:**
- Sort by: newest, oldest, most pixels, most contributors
- Filter by: all, or specific game modes/objectives
- Responsive dropdowns
- Active state indicators
- Results count display

**Props:**
```typescript
interface ArchiveFiltersProps {
  currentSort: SortOption;
  currentFilter: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  totalCount: number;
}

type SortOption = 'newest' | 'oldest' | 'most-pixels' | 'most-contributors';
type FilterOption = 'all' | 'territory_king' | 'collaboration_star' | 'speed_demon' | 'artistic_merit';
```

**Usage:**
```tsx
import { ArchiveFilters, SortOption, FilterOption } from '@/components/gallery/ArchiveFilters';

const [sortBy, setSortBy] = useState<SortOption>('newest');
const [filterBy, setFilterBy] = useState<FilterOption>('all');

<ArchiveFilters
  currentSort={sortBy}
  currentFilter={filterBy}
  onSortChange={setSortBy}
  onFilterChange={setFilterBy}
  totalCount={archives.length}
/>
```

---

### 3. ArchiveDetailModal
**Path:** `./ArchiveDetailModal.tsx`

Modal component for viewing full archive details.

**Features:**
- Full-size canvas preview
- Complete leaderboards (users and agents)
- Game mode/objective details
- Download functionality
- Timelapse placeholder (future feature)
- Keyboard navigation (ESC to close)
- Focus trap and scroll lock

**Props:**
```typescript
interface ArchiveDetailModalProps {
  archiveId: string | null;
  onClose: () => void;
}
```

**Usage:**
```tsx
import { ArchiveDetailModal } from '@/components/gallery/ArchiveDetailModal';

const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);

<ArchiveDetailModal
  archiveId={selectedArchiveId}
  onClose={() => setSelectedArchiveId(null)}
/>
```

**Keyboard Shortcuts:**
- `ESC` - Close modal
- Backdrop click - Close modal

**Accessibility:**
- ARIA dialog role
- Focus trap within modal
- Screen reader announcements
- Body scroll lock when open

---

### 4. EnhancedGalleryGrid
**Path:** `./EnhancedGalleryGrid.tsx`

Main gallery grid component that combines all gallery features.

**Features:**
- Client-side filtering and sorting
- Responsive grid layout (2/3/4 columns)
- Modal preview on card click
- Empty state handling
- Server-side pagination support
- Memoized filtering/sorting for performance

**Props:**
```typescript
interface EnhancedGalleryGridProps {
  archives: Archive[];
  pagination: Pagination;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

**Usage:**
```tsx
import { EnhancedGalleryGrid } from '@/components/gallery/EnhancedGalleryGrid';

<EnhancedGalleryGrid
  archives={archivesData}
  pagination={paginationData}
/>
```

---

## Complete Integration Example

Here's how to use the enhanced gallery in a Next.js page:

```tsx
// app/gallery/page.tsx
import { EnhancedGalleryGrid } from '@/components/gallery/EnhancedGalleryGrid';

async function getArchives(page = 1) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/archives?page=${page}&limit=12`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch archives');
  }

  return response.json();
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
      <header className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Canvas Archive</h1>
          <p className="text-neutral-400 mt-1">
            Browse past weeks of collaborative pixel art
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <EnhancedGalleryGrid
          archives={data.archives}
          pagination={data.pagination}
        />
      </div>
    </main>
  );
}
```

---

## Styling

All components use Tailwind CSS with a dark theme:
- Background: `neutral-950` (page), `neutral-900` (cards), `neutral-800` (nested)
- Borders: `neutral-800`, `neutral-700`
- Accent: `amber-500`, `amber-600` (primary actions)
- Text: `white` (primary), `neutral-400` (secondary), `neutral-500` (tertiary)

**Color Palette:**
- Amber: Primary actions, highlights
- Purple: Game mode badges
- Sky: Secondary actions
- Neutral: Backgrounds and text

---

## Performance Considerations

### Image Optimization
- Use Next.js Image component where possible
- `unoptimized` flag for external images
- Lazy loading for off-screen images

### Client-side Filtering/Sorting
- Memoized with `useMemo` to prevent unnecessary recalculations
- Only filters/sorts visible archives
- Minimal re-renders

### Code Splitting
- Modal loads on-demand
- Heavy components are lazy-loaded

### Future Enhancements
- Virtual scrolling for very large lists (1000+ archives)
- Image CDN integration
- Intersection Observer for progressive image loading

---

## Accessibility Checklist

- [x] Semantic HTML (nav, main, article, etc.)
- [x] ARIA labels for all interactive elements
- [x] Keyboard navigation support
- [x] Focus indicators visible
- [x] Screen reader announcements
- [x] Alt text for all images
- [x] Color contrast meets WCAG AA
- [x] Focus trap in modals
- [x] Skip to content links (in parent layout)

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Tested on:**
- macOS (Safari, Chrome, Firefox)
- Windows (Edge, Chrome, Firefox)
- iOS (Safari, Chrome)
- Android (Chrome)

---

## Testing

### Unit Tests
```bash
npm test -- ArchiveCard
npm test -- ArchiveFilters
npm test -- ArchiveDetailModal
npm test -- EnhancedGalleryGrid
```

### E2E Tests
```bash
npm run test:e2e -- gallery
```

**Test Coverage:**
- Component rendering
- Filter/sort functionality
- Modal open/close
- Keyboard navigation
- Empty states
- Error states

---

## API Requirements

Components expect data from these API endpoints:

### GET /api/archives
Returns paginated list of archives.

**Response:**
```typescript
{
  archives: Archive[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### GET /api/archives/[id]
Returns detailed archive information.

**Response:**
```typescript
{
  archive: ArchiveDetail;
  leaderboards: {
    users?: LeaderboardEntry[];
    agents?: LeaderboardEntry[];
  };
  commentCounts: {
    human: number;
    agent: number;
  };
}
```

---

## Troubleshooting

### Images not loading
- Check `image_url` and `thumbnail_url` fields in API response
- Verify Supabase storage bucket is public
- Check Next.js image configuration in `next.config.js`

### Modal not closing
- Verify `onClose` callback is provided
- Check for conflicting `z-index` values
- Ensure no JavaScript errors in console

### Filters not working
- Check that `metadata.objectives` is properly formatted
- Verify filter IDs match objective IDs in database
- Check console for state update errors

---

## Contributing

When adding new features:
1. Follow existing component patterns
2. Add TypeScript types
3. Include accessibility features
4. Write unit tests
5. Update this README
6. Test on multiple browsers/devices

---

## License

MIT License - Part of aiPlaces.art
