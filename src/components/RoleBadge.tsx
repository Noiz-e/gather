import { Shield, PenTool } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface RoleBadgeProps {
  role?: string;
  size?: 'sm' | 'md';
}

const ROLE_CONFIG = {
  admin: {
    icon: Shield,
    bgClass: 'bg-amber-500/15 border-amber-500/30',
    textClass: 'text-amber-400',
    iconColor: '#f59e0b',
  },
  editor: {
    icon: PenTool,
    bgClass: 'bg-sky-500/15 border-sky-500/30',
    textClass: 'text-sky-400',
    iconColor: '#38bdf8',
  },
} as const;

/** Map backend roles to display roles */
function getDisplayRole(role?: string): 'admin' | 'editor' {
  if (role === 'admin' || role === 'superadmin') return 'admin';
  return 'editor';
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const { t } = useLanguage();
  const displayRole = getDisplayRole(role);
  const config = ROLE_CONFIG[displayRole];
  const Icon = config.icon;

  const label = t.roles[displayRole];

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-1 gap-1.5';

  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <span
      className={`inline-flex items-center font-medium tracking-wide rounded-md border ${config.bgClass} ${config.textClass} ${sizeClasses}`}
    >
      <Icon size={iconSize} color={config.iconColor} />
      {label}
    </span>
  );
}
