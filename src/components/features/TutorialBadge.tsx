import { cn } from '@/lib/utils';

interface TutorialBadgeProps {
  type: 'format' | 'difficulty';
  value: string;
}

const badgeColors: Record<string, string> = {
  Video: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
  Text: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  Interactive: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  Beginner: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  Intermediate: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  Advanced: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

export function TutorialBadge({ type, value }: TutorialBadgeProps) {
  const colors = badgeColors[value] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
        colors
      )}
    >
      {value}
    </span>
  );
}
