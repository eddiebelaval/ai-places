export interface GameModeColorConfig {
  card: string;
  gradient: string;
  icon: string;
  iconText: string;
  iconMuted: string;
  badge: string;
  badgeText: string;
  button: string;
  buttonText: string;
  link: string;
}

const COLOR_MAP: Record<string, GameModeColorConfig> = {
  'green-500': {
    card: 'bg-green-500/10 border-green-500/30',
    gradient: 'bg-gradient-to-br from-green-500 to-emerald-400',
    icon: 'bg-green-500/20',
    iconText: 'text-green-500',
    iconMuted: 'bg-green-500/10 text-green-500/60',
    badge: 'bg-green-500/20 text-emerald-400',
    badgeText: 'text-emerald-400',
    button: 'bg-green-500/20 hover:bg-green-500/30',
    buttonText: 'text-emerald-400',
    link: 'text-emerald-400 hover:text-green-500',
  },
  'purple-500': {
    card: 'bg-purple-500/10 border-purple-500/30',
    gradient: 'bg-gradient-to-br from-purple-500 to-violet-400',
    icon: 'bg-purple-500/20',
    iconText: 'text-purple-500',
    iconMuted: 'bg-purple-500/10 text-purple-500/60',
    badge: 'bg-purple-500/20 text-violet-400',
    badgeText: 'text-violet-400',
    button: 'bg-purple-500/20 hover:bg-purple-500/30',
    buttonText: 'text-violet-400',
    link: 'text-violet-400 hover:text-purple-500',
  },
  'amber-500': {
    card: 'bg-amber-500/10 border-amber-500/30',
    gradient: 'bg-gradient-to-br from-amber-500 to-yellow-400',
    icon: 'bg-amber-500/20',
    iconText: 'text-amber-500',
    iconMuted: 'bg-amber-500/10 text-amber-500/60',
    badge: 'bg-amber-500/20 text-yellow-400',
    badgeText: 'text-yellow-400',
    button: 'bg-amber-500/20 hover:bg-amber-500/30',
    buttonText: 'text-yellow-400',
    link: 'text-yellow-400 hover:text-amber-500',
  },
  'red-500': {
    card: 'bg-red-500/10 border-red-500/30',
    gradient: 'bg-gradient-to-br from-red-500 to-orange-400',
    icon: 'bg-red-500/20',
    iconText: 'text-red-500',
    iconMuted: 'bg-red-500/10 text-red-500/60',
    badge: 'bg-red-500/20 text-orange-400',
    badgeText: 'text-orange-400',
    button: 'bg-red-500/20 hover:bg-red-500/30',
    buttonText: 'text-orange-400',
    link: 'text-orange-400 hover:text-red-500',
  },
};

const DEFAULT_COLOR = COLOR_MAP['green-500'];

export function getColorClasses(color: { primary: string }): GameModeColorConfig {
  return COLOR_MAP[color.primary] || DEFAULT_COLOR;
}
