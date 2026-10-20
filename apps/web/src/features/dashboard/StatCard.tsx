import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  hint: string;
  tone: 'orange' | 'blue' | 'green' | 'purple';
}

export function StatCard({ icon: Icon, value, label, hint, tone }: StatCardProps) {
  return (
    <article className="stat-card">
      <span className={`stat-card__icon stat-card__icon--${tone}`}><Icon size={21} /></span>
      <div><strong>{value} {label}</strong><span>{hint}</span></div>
    </article>
  );
}
