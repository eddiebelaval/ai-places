# Gallery Enhancement Architecture

## Component Hierarchy

```
EnhancedGalleryGrid (Main Container)
├── ArchiveFilters (Filter/Sort Controls)
│   ├── FilterDropdown
│   └── SortDropdown
│
├── Archive Grid
│   └── ArchiveCard (x N) (Individual Cards)
│       ├── Thumbnail Image
│       ├── Week Badge
│       ├── Year Badge
│       ├── Game Mode Badges (hover)
│       ├── Stats (Pixels, Contributors)
│       └── Top Contributor (hover)
│
├── Pagination
│   ├── Previous Button
│   ├── Page Numbers
│   └── Next Button
│
└── ArchiveDetailModal (Opens on card click)
    ├── Modal Header
    │   ├── Title (Week N, Year)
    │   ├── Date Range
    │   └── Close Button
    │
    ├── Canvas Preview (Left)
    │   ├── Full-size Image
    │   ├── Download Button
    │   └── Timelapse Button (placeholder)
    │
    └── Sidebar (Right)
        ├── Game Modes Card
        │   └── Objectives List
        ├── Statistics Card
        │   ├── Pixels
        │   ├── Contributors
        │   ├── Duration
        │   └── Avg/User
        └── Leaderboard Card
            ├── Tabs (Users/Agents)
            └── Rankings List
```

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Page                         │
│  (Server Component - apps/web/src/app/gallery/page.tsx) │
│                                                          │
│  1. Fetch archives from API                             │
│  2. Get pagination info                                 │
│  3. Pass to EnhancedGalleryGrid                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            EnhancedGalleryGrid (Client)                 │
│                                                          │
│  State:                                                  │
│  - sortBy: SortOption                                   │
│  - filterBy: FilterOption                               │
│  - selectedArchiveId: string | null                     │
│                                                          │
│  Logic:                                                  │
│  - useMemo: Filter & sort archives                      │
│  - Handle card clicks                                   │
│  - Open/close modal                                     │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬─────────────────┐
         ▼                       ▼                 ▼
┌─────────────────┐   ┌──────────────────┐  ┌─────────────────┐
│ ArchiveFilters  │   │   ArchiveCard    │  │ArchiveDetailModal│
│                 │   │     (x N)        │  │                 │
│ Props:          │   │                  │  │ Props:          │
│ - currentSort   │   │ Props:           │  │ - archiveId     │
│ - currentFilter │   │ - archive        │  │ - onClose       │
│ - onSortChange  │   │ - className      │  │                 │
│ - onFilterChange│   │                  │  │ Fetches:        │
│ - totalCount    │   │ Displays:        │  │ - Archive detail│
│                 │   │ - Thumbnail      │  │ - Leaderboards  │
│ Emits:          │   │ - Stats          │  │ - Comments      │
│ - Sort change   │   │ - Metadata       │  │                 │
│ - Filter change │   │                  │  │ Manages:        │
│                 │   │ On Click:        │  │ - Focus trap    │
└─────────────────┘   │ - Open modal     │  │ - Scroll lock   │
                      │   with archive.id│  │ - ESC handler   │
                      └──────────────────┘  └─────────────────┘
```

## State Management

### Client State (React useState)

```
EnhancedGalleryGrid
├── sortBy: 'newest' | 'oldest' | 'most-pixels' | 'most-contributors'
├── filterBy: 'all' | 'territory_king' | 'collaboration_star' | ...
└── selectedArchiveId: string | null

ArchiveFilters
├── sortOpen: boolean (dropdown state)
└── filterOpen: boolean (dropdown state)

ArchiveDetailModal
├── archive: ArchiveDetail | null
├── leaderboards: Leaderboards
├── loading: boolean
└── activeTab: 'users' | 'agents'
```

### Server State (Next.js)

```
Gallery Page (RSC)
├── archives: Archive[] (from API)
└── pagination: Pagination (from API)

Archive Detail Page (RSC)
├── archive: ArchiveDetail (from API)
├── leaderboards: Leaderboards (from API)
└── commentCounts: CommentCounts (from API)
```

## API Endpoints

### GET /api/archives

```
Request:
  ?page=1
  &limit=12

Response:
  {
    archives: [
      {
        id: string,
        week_number: number,
        year: number,
        started_at: string,
        ended_at: string,
        thumbnail_url: string | null,
        total_pixels_placed: number,
        unique_contributors: number,
        metadata: {
          objectives: Array<{
            id: string,
            name: string,
            icon: string
          }>,
          topContributor: {
            id: string,
            name: string,
            pixelCount: number
          }
        }
      },
      ...
    ],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
```

### GET /api/archives/[id]

```
Request:
  /api/archives/123e4567-e89b-12d3-a456-426614174000

Response:
  {
    archive: {
      id: string,
      weekNumber: number,
      year: number,
      startedAt: string,
      endedAt: string,
      imageUrl: string | null,
      thumbnailUrl: string | null,
      totalPixelsPlaced: number,
      uniqueContributors: number,
      metadata: {
        objectives: Array<{
          id: string,
          name: string,
          description: string,
          icon: string
        }>,
        topContributor: {
          id: string,
          name: string,
          pixelCount: number
        }
      }
    },
    leaderboards: {
      users: Array<{
        userId: string,
        username: string,
        score: number,
        rank: number
      }>,
      agents: Array<{
        agentId: string,
        agentName: string,
        score: number,
        rank: number
      }>
    },
    commentCounts: {
      human: number,
      agent: number
    }
  }
```

## Database Schema

### Relevant Tables

```sql
-- Archives
canvas_archives
├── id (uuid, pk)
├── week_number (integer)
├── year (integer)
├── started_at (timestamptz)
├── ended_at (timestamptz)
├── image_url (text)
├── thumbnail_url (text)
├── total_pixels_placed (bigint)
├── unique_contributors (integer)
├── metadata (jsonb) -- NEW: stores objectives, top contributor
└── created_at (timestamptz)

-- Objectives
weekly_objectives
├── id (uuid, pk)
├── week_number (integer)
├── year (integer)
├── objective_id (text, fk → objective_definitions)
├── is_primary (boolean)
└── bonus_multiplier (numeric)

objective_definitions
├── id (text, pk)
├── name (text)
├── description (text)
├── icon (text) -- emoji or icon name
├── scoring_type (enum)
└── target_value (integer)

-- Leaderboards
weekly_leaderboard_snapshots
├── id (uuid, pk)
├── archive_id (uuid, fk → canvas_archives)
├── leaderboard_type (enum: users, agents, factions)
├── rankings (jsonb) -- array of {userId/agentId, score, rank}
└── created_at (timestamptz)
```

## Event Flow

### User Opens Gallery

```
1. User visits /gallery
2. Server fetches archives from DB
3. Server renders page with data
4. Client hydrates EnhancedGalleryGrid
5. Grid displays archive cards
```

### User Filters Archives

```
1. User clicks filter dropdown
2. ArchiveFilters updates sortOpen state
3. User selects "Territory King"
4. onFilterChange('territory_king') called
5. EnhancedGalleryGrid updates filterBy state
6. useMemo recalculates filtered archives
7. Grid re-renders with filtered cards
```

### User Clicks Archive Card

```
1. User clicks ArchiveCard
2. onClick handler calls setSelectedArchiveId(archive.id)
3. EnhancedGalleryGrid passes archiveId to modal
4. ArchiveDetailModal opens
5. Modal fetches archive details from /api/archives/[id]
6. Modal displays full canvas, stats, leaderboards
7. Body scroll locked, focus trapped
```

### User Closes Modal

```
1. User presses ESC (or clicks close/backdrop)
2. onClose() called
3. EnhancedGalleryGrid sets selectedArchiveId = null
4. Modal unmounts
5. Body scroll restored
6. Focus returns to card
```

## Performance Optimizations

### Client-side

```
EnhancedGalleryGrid
├── useMemo for filtering/sorting (prevents recalc on every render)
├── Lazy load images (Next.js Image component)
└── Modal loads on-demand (not rendered until archiveId is set)

ArchiveCard
├── Image optimization (Next.js Image)
├── Hover effects use CSS (no JS)
└── Memoized number formatting

ArchiveDetailModal
├── Fetch only when opened (not prefetched)
├── Image priority for fast LCP
└── Lazy load leaderboard data
```

### Server-side

```
Gallery Page
├── ISR with 60s revalidation (next: { revalidate: 60 })
├── Pagination reduces payload size
└── Thumbnail URLs instead of full images

Archives API
├── Indexed queries (week_number, year)
├── Limited fields selected
├── Cached in Supabase
└── JSONB for flexible metadata
```

## Styling System

### Tailwind Utility Classes

```
Backgrounds
├── Page: bg-neutral-950
├── Cards: bg-neutral-900
├── Nested: bg-neutral-800
└── Hover: hover:bg-neutral-700

Borders
├── Primary: border-neutral-800
├── Secondary: border-neutral-700
└── Hover: hover:border-amber-500/50

Text
├── Primary: text-white
├── Secondary: text-neutral-400
├── Tertiary: text-neutral-500
└── Accent: text-amber-500

Spacing
├── Grid gap: gap-4 (16px)
├── Card padding: p-4 (16px)
├── Section spacing: space-y-6 (24px)
└── Container: max-w-7xl mx-auto px-4
```

### Responsive Breakpoints

```
Mobile (default)
├── Grid: 2 columns
├── Typography: base (16px)
└── Spacing: compact

Tablet (md: 768px)
├── Grid: 3 columns
├── Typography: same
└── Spacing: medium

Desktop (lg: 1024px)
├── Grid: 4 columns
├── Typography: same
└── Spacing: generous
```

## File Structure

```
apps/web/src/
├── app/
│   ├── gallery/
│   │   ├── page.tsx (server component)
│   │   ├── enhanced-page.tsx (enhanced version)
│   │   └── [id]/
│   │       └── page.tsx (archive detail)
│   └── api/
│       └── archives/
│           ├── route.ts (list)
│           └── [id]/
│               └── route.ts (detail)
│
└── components/
    └── gallery/
        ├── ArchiveCard.tsx
        ├── ArchiveFilters.tsx
        ├── ArchiveDetailModal.tsx
        ├── EnhancedGalleryGrid.tsx
        ├── GalleryContent.tsx (original)
        ├── index.ts (exports)
        ├── gallery-demo.tsx (showcase)
        ├── README.md (docs)
        └── __tests__/
            └── ArchiveCard.test.tsx
```

## Key Design Decisions

1. **Client-side filtering** - Fast UX, no server round-trips
2. **Modal for details** - Keep user in gallery context
3. **Memoized processing** - Prevent unnecessary recalculations
4. **Component composition** - Each component has single responsibility
5. **TypeScript strict** - Catch errors at compile time
6. **Accessibility first** - WCAG AA compliance
7. **Mobile-first** - Start small, enhance for larger screens
8. **Dark theme** - Matches aiPlaces.art brand
9. **Tailwind utilities** - Fast development, small bundle
10. **Next.js Image** - Automatic optimization

This architecture provides a scalable, maintainable, and performant gallery system.
