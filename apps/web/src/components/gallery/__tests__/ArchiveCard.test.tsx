import { render, screen } from '@testing-library/react';
import { ArchiveCard } from '../ArchiveCard';

const mockArchive = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  week_number: 5,
  year: 2026,
  started_at: '2026-01-26T00:00:00Z',
  ended_at: '2026-02-01T23:59:59Z',
  thumbnail_url: 'https://example.com/week5.png',
  total_pixels_placed: 125000,
  unique_contributors: 42,
  metadata: {
    objectives: [
      {
        id: 'territory_king',
        name: 'Territory King',
        icon: 'crown',
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        icon: 'zap',
      },
    ],
    topContributor: {
      id: 'user123',
      name: 'PixelMaster',
      pixelCount: 5420,
    },
  },
};

const mockArchiveNoMetadata = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  week_number: 1,
  year: 2026,
  started_at: '2026-01-01T00:00:00Z',
  ended_at: '2026-01-07T23:59:59Z',
  thumbnail_url: null,
  total_pixels_placed: 1200,
  unique_contributors: 5,
};

describe('ArchiveCard', () => {
  describe('Rendering', () => {
    it('renders archive information correctly', () => {
      render(<ArchiveCard archive={mockArchive} />);

      expect(screen.getByText('Week 5')).toBeInTheDocument();
      expect(screen.getByText('2026')).toBeInTheDocument();
      expect(screen.getByText(/Jan 26.*Feb 1.*2026/)).toBeInTheDocument();
    });

    it('displays formatted pixel count', () => {
      render(<ArchiveCard archive={mockArchive} />);

      // Should format large numbers (125000 -> 125K)
      expect(screen.getByText('125.0K')).toBeInTheDocument();
    });

    it('displays contributor count', () => {
      render(<ArchiveCard archive={mockArchive} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders thumbnail image when available', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const image = screen.getByAltText(/Canvas from Week 5, 2026/);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('week5.png'));
    });

    it('renders placeholder when thumbnail is not available', () => {
      render(<ArchiveCard archive={mockArchiveNoMetadata} />);

      // Placeholder icon should be visible
      const placeholder = screen.getByRole('img', { hidden: true });
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('displays game mode objectives', () => {
      render(<ArchiveCard archive={mockArchive} />);

      expect(screen.getByText('Territory King')).toBeInTheDocument();
      expect(screen.getByText('Speed Demon')).toBeInTheDocument();
    });

    it('displays top contributor information', () => {
      render(<ArchiveCard archive={mockArchive} />);

      expect(screen.getByText('Top Contributor')).toBeInTheDocument();
      expect(screen.getByText('PixelMaster')).toBeInTheDocument();
      expect(screen.getByText('5.4Kpx')).toBeInTheDocument();
    });

    it('handles missing metadata gracefully', () => {
      render(<ArchiveCard archive={mockArchiveNoMetadata} />);

      // Should not crash and should still display basic info
      expect(screen.getByText('Week 1')).toBeInTheDocument();
      expect(screen.queryByText('Top Contributor')).not.toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('formats millions correctly', () => {
      const millionArchive = {
        ...mockArchive,
        total_pixels_placed: 1500000,
      };

      render(<ArchiveCard archive={millionArchive} />);
      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    it('formats thousands correctly', () => {
      const thousandArchive = {
        ...mockArchive,
        total_pixels_placed: 5420,
      };

      render(<ArchiveCard archive={thousandArchive} />);
      expect(screen.getByText('5.4K')).toBeInTheDocument();
    });

    it('formats small numbers without suffix', () => {
      const smallArchive = {
        ...mockArchive,
        total_pixels_placed: 999,
      };

      render(<ArchiveCard archive={smallArchive} />);
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label for link', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'aria-label',
        'View archive for Week 5, 2026'
      );
    });

    it('has alt text for images', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const image = screen.getByAltText('Canvas from Week 5, 2026');
      expect(image).toBeInTheDocument();
    });

    it('has tooltips for stats', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const pixelStat = screen.getByTitle('125,000 pixels placed');
      expect(pixelStat).toBeInTheDocument();

      const contributorStat = screen.getByTitle('42 unique contributors');
      expect(contributorStat).toBeInTheDocument();
    });

    it('applies focus styles', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus:ring-2', 'focus:ring-amber-500');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ArchiveCard archive={mockArchive} className="custom-class" />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });

    it('has hover transition classes', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('transition-all', 'hover:border-amber-500/50');
    });
  });

  describe('Date Range Formatting', () => {
    it('formats same-month date range correctly', () => {
      render(<ArchiveCard archive={mockArchive} />);

      // Jan 26-Feb 1, 2026
      expect(screen.getByText(/Jan 26.*Feb 1.*2026/)).toBeInTheDocument();
    });

    it('formats different-month date range correctly', () => {
      const crossMonthArchive = {
        ...mockArchive,
        started_at: '2026-01-28T00:00:00Z',
        ended_at: '2026-02-03T23:59:59Z',
      };

      render(<ArchiveCard archive={crossMonthArchive} />);
      expect(screen.getByText(/Jan 28.*Feb 3.*2026/)).toBeInTheDocument();
    });
  });

  describe('Link Behavior', () => {
    it('links to correct archive detail page', () => {
      render(<ArchiveCard archive={mockArchive} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/gallery/123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
