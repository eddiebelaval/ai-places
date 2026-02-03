export function formatDateRange(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

const OBJECTIVE_ICONS: Record<string, string> = {
  crown: '[crown]',
  users: '[users]',
  zap: '[zap]',
  star: '[star]',
  check: '[check]',
  shield: '[shield]',
};

export function getIconForObjective(iconName: string): string {
  return OBJECTIVE_ICONS[iconName] || '[target]';
}

export function calculateDuration(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? 's' : ''}`;
}

export function getRankColor(index: number): string {
  switch (index) {
    case 0: return 'text-amber-400';
    case 1: return 'text-neutral-400';
    case 2: return 'text-orange-600';
    default: return 'text-neutral-500';
  }
}
