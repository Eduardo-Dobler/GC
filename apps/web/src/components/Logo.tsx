export function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  return <span className={`gc-logo gc-logo--${size}`}><img src="/gc-logo.png" alt="GC — Gerenciador de Comunidade" /></span>;
}
