import { useState } from 'react';

interface AvatarProps {
  name: string;
  color?: string;
  src?: string;
  statusMessage?: string;
  size?: 'small' | 'medium' | 'large';
  status?: 'online' | 'away' | 'offline';
}

export function Avatar({ name, color = '#777777', src, statusMessage, size = 'medium', status }: AvatarProps) {
  // Começo parte feita a MÃO
  const [failedSource, setFailedSource] = useState<string>();
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const showPhoto = src && src !== failedSource;
  // Fim da parte feita a MÃO
  return (
    <span className={`avatar avatar--${size}`} style={{ backgroundColor: color }} aria-label={name} title={statusMessage ? `${name} — ${statusMessage}` : name}>
      {/* Começo parte feita a MÃO */}
      {showPhoto ? <img className="avatar__photo" src={src} alt="" onError={() => setFailedSource(src)} /> : initials}
      {/* Fim da parte feita a MÃO */}
      {status && <span className={`avatar__status avatar__status--${status}`} aria-label={`Status: ${status}`} />}
    </span>
  );
}
