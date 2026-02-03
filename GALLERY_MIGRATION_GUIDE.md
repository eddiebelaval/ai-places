# Gallery Enhancement Migration Guide

Quick guide to implement the enhanced gallery components in your aiPlaces.art project.

## Option 1: Quick Start (Recommended)

Replace the existing gallery page with the enhanced version:

```bash
# Backup existing page
cp apps/web/src/app/gallery/page.tsx apps/web/src/app/gallery/page.tsx.backup

# Use enhanced version
cp apps/web/src/app/gallery/enhanced-page.tsx apps/web/src/app/gallery/page.tsx
```

That's it! The enhanced gallery is now live.

## Option 2: Gradual Migration

### Step 1: Add Components to Existing Page

```tsx
// apps/web/src/app/gallery/page.tsx
import { EnhancedGalleryGrid } from '@/components/gallery/EnhancedGalleryGrid';

// Replace GalleryGrid with EnhancedGalleryGrid
<EnhancedGalleryGrid
  archives={data.archives}
  pagination={data.pagination}
/>
```

### Step 2: Update Archive API Response (Optional)

Add metadata to your archive objects for enhanced features:

```typescript
// apps/web/src/app/api/archives/route.ts

// Enhance the response with metadata
const enrichedArchives = archives.map(archive => ({
  ...archive,
  metadata: {
    objectives: await getWeeklyObjectives(archive.week_number, archive.year),
    topContributor: await getTopContributor(archive.id),
  }
}));
```

### Step 3: Add Objectives to Archives

```sql
-- Add to your archive creation logic
INSERT INTO canvas_archives (
  week_number,
  year,
  started_at,
  ended_at,
  metadata
) VALUES (
  5,
  2026,
  '2026-01-26',
  '2026-02-01',
  jsonb_build_object(
    'objectives', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', od.id,
          'name', od.name,
          'description', od.description,
          'icon', od.icon
        )
      )
      FROM weekly_objectives wo
      JOIN objective_definitions od ON wo.objective_id = od.id
      WHERE wo.week_number = 5 AND wo.year = 2026
    )
  )
);
```

## Testing the Enhancement

### Visual Test

1. Visit `/gallery` in your browser
2. Verify archive cards display correctly
3. Click a card to test the modal
4. Test filters and sorting
5. Check mobile responsive design

### Accessibility Test

1. Tab through cards (should see focus rings)
2. Press Enter on a card (should open modal)
3. Press ESC in modal (should close)
4. Use screen reader to verify labels

### Browser Test

Test in:
- Chrome (desktop/mobile)
- Safari (desktop/iOS)
- Firefox
- Edge

## Component Demo Page (Optional)

Create a demo page to showcase components:

```tsx
// apps/web/src/app/gallery-demo/page.tsx
export { GalleryDemo as default } from '@/components/gallery/gallery-demo';
```

Visit `/gallery-demo` to see all component variations.

## Customization

### Change Colors

Edit component files to match your theme:

```tsx
// Example: Change accent from amber to blue
// Find and replace in components:
'amber-500' → 'blue-500'
'amber-600' → 'blue-600'
```

### Add Custom Filters

```tsx
// ArchiveFilters.tsx
const filterOptions = [
  // Add your custom filter
  { value: 'custom', label: 'Custom Filter', icon: '🎨' },
];
```

### Modify Grid Layout

```tsx
// EnhancedGalleryGrid.tsx
// Change grid columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Troubleshooting

### Cards not displaying
- Check API response format matches expected interface
- Verify `archives` array is not empty
- Check browser console for errors

### Modal not opening
- Ensure `selectedArchiveId` state is working
- Check for JavaScript errors
- Verify modal component is imported

### Images not loading
- Check `thumbnail_url` and `image_url` paths
- Verify Supabase storage is public
- Check Next.js image domains in config

### Filters not working
- Verify `metadata.objectives` structure
- Check filter logic in `useMemo`
- Ensure objective IDs match

## Performance Optimization

### Enable Image Optimization

```js
// next.config.js
module.exports = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

### Add Loading States

```tsx
// While data is fetching
{loading ? (
  <SkeletonGrid />
) : (
  <EnhancedGalleryGrid archives={archives} pagination={pagination} />
)}
```

## Rollback Plan

If issues arise:

```bash
# Restore original page
cp apps/web/src/app/gallery/page.tsx.backup apps/web/src/app/gallery/page.tsx

# Remove new components (optional)
rm -rf apps/web/src/components/gallery/Archive*
rm -rf apps/web/src/components/gallery/Enhanced*
```

## Next Steps

After migration:

1. **Add Analytics**
   - Track card clicks
   - Monitor filter usage
   - Measure modal opens

2. **Add Timelapse Feature**
   - Generate video from pixel history
   - Add playback controls
   - Implement download

3. **Enhance Metadata**
   - Add more stats
   - Include faction data
   - Show top patterns

4. **Social Features**
   - Share buttons
   - Archive reactions
   - Community voting

## Support

If you encounter issues:

1. Check component README.md
2. Review test files for examples
3. Inspect browser console
4. Verify API response structure

## Checklist

- [ ] Components copied to project
- [ ] Gallery page updated
- [ ] API returns proper metadata
- [ ] Tested in multiple browsers
- [ ] Accessibility audit passed
- [ ] Mobile responsive verified
- [ ] Performance metrics acceptable
- [ ] Documentation reviewed

## Summary

The enhanced gallery is production-ready and can be deployed immediately. All components are fully typed, tested, and accessible. The migration can be done in under 5 minutes with Option 1, or gradually with Option 2.

Enjoy your enhanced gallery!
