interface AvatarProps {
  name: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  status?: 'online' | 'away' | 'offline';
}

export function Avatar({ name, color = '#777777', size = 'medium', status }: AvatarProps) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <span className={`avatar avatar--${size}`} style={{ backgroundColor: color }} aria-label={name}>
      {initials}
      {status && <span className={`avatar__status avatar__status--${status}`} aria-label={`Status: ${status}`} />}
    </span>
  );
}
