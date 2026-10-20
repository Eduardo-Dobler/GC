import { normalizeGoogleMapsEmbedUrl } from '@gc/shared';

export function MapEmbedPreview({ src, title }: { src: string; title: string }) {
  if (!src.trim()) return null;
  const safeSrc = normalizeGoogleMapsEmbedUrl(src);
  if (!safeSrc) return <p className="form-error">O iframe precisa ser uma incorporação válida do Google Maps. Troque `YOUR_API_KEY` por uma chave real ou copie o iframe em Compartilhar → Incorporar um mapa.</p>;
  return <div className="map-preview"><iframe title={title} src={safeSrc} width="450" height="250" frameBorder="0" style={{ border: 0 }} referrerPolicy="strict-origin-when-cross-origin" loading="lazy" allowFullScreen /></div>;
}
