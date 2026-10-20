const googleHosts = new Set(['google.com', 'www.google.com', 'google.com.br', 'www.google.com.br', 'maps.google.com', 'maps.google.com.br']);
const embedModes = new Set(['place', 'view', 'directions', 'streetview', 'search']);

function googleUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

/** Returns only a Maps URL, never HTML. Empty fields are valid; invalid values return null. */
export function normalizeGoogleMapsUrl(value: string): string | null {
  const input = value.trim();
  if (!input) return '';
  const url = googleUrl(input);
  if (!url) return null;
  const mapsPath = (url.pathname === '/maps' || url.pathname.startsWith('/maps/')) && !url.pathname.startsWith('/maps/embed');
  const sharedLink = url.hostname === 'maps.app.goo.gl' && url.pathname.length > 1;
  const legacySharedLink = url.hostname === 'goo.gl' && url.pathname.startsWith('/maps/');
  const mapsSubdomain = (url.hostname === 'maps.google.com' || url.hostname === 'maps.google.com.br') && url.pathname === '/';
  return ((googleHosts.has(url.hostname) && (mapsPath || mapsSubdomain)) || sharedLink || legacySharedLink) ? url.href : null;
}

/** Extracts the quoted src from a pasted iframe and discards all other attributes. */
export function normalizeGoogleMapsEmbedUrl(value: string): string | null {
  let input = value.trim();
  if (!input) return '';
  if (input.startsWith('<')) {
    const iframe = input.match(/^<iframe\b((?:[^>"']|"[^"]*"|'[^']*')*)>\s*<\/iframe>\s*$/i);
    if (!iframe) return null;
    const attributes = [...(iframe[1] ?? '').matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)];
    const sources = attributes.filter((attribute) => (attribute[1] ?? '').toLowerCase() === 'src');
    if (sources.length !== 1) return null;
    input = sources[0]?.[2] ?? sources[0]?.[3] ?? '';
    input = input.replace(/&amp;/gi, '&');
  }
  const url = googleUrl(input);
  if (!url || !googleHosts.has(url.hostname)) return null;
  const v1Match = url.pathname.match(/^\/maps\/embed\/v1\/([^/]+)$/);
  const mode = v1Match?.[1];
  const key = url.searchParams.get('key') ?? '';
  const hasRealKey = Boolean(key) && !/^(YOUR_API_KEY|YOUR_KEY|API_KEY)$/i.test(key);
  const modeHasRequiredParameter = mode === 'place' || mode === 'search'
    ? Boolean(url.searchParams.get('q'))
    : mode === 'view'
      ? Boolean(url.searchParams.get('center'))
      : mode === 'directions'
        ? Boolean(url.searchParams.get('origin') && url.searchParams.get('destination'))
        : mode === 'streetview'
          ? Boolean(url.searchParams.get('location') || url.searchParams.get('pano'))
          : false;
  const apiEmbed = Boolean(mode && embedModes.has(mode) && hasRealKey && modeHasRequiredParameter);
  const shareEmbed = url.pathname === '/maps/embed' && Boolean(url.searchParams.get('pb'));
  const legacyEmbed = url.pathname === '/maps' && url.searchParams.get('output') === 'embed' && Boolean(url.searchParams.get('q'));
  return shareEmbed || legacyEmbed || apiEmbed ? url.href : null;
}

/** Creates a normal Maps page URL for the action button, without exposing iframe HTML. */
export function googleMapsOpenUrl(value: string, fallbackDescription = ''): string | null {
  const embed = normalizeGoogleMapsEmbedUrl(value);
  if (embed) {
    const url = new URL(embed);
    const mode = url.pathname.match(/^\/maps\/embed\/v1\/([^/]+)$/)?.[1];
    if (mode === 'directions') {
      const origin = url.searchParams.get('origin');
      const destination = url.searchParams.get('destination');
      if (origin && destination) return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    }
    const query = url.searchParams.get('q') ?? url.searchParams.get('location') ?? url.searchParams.get('center');
    if (query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    return embed;
  }
  const direct = normalizeGoogleMapsUrl(value);
  if (direct) return direct;
  const description = fallbackDescription.trim();
  return description ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(description)}` : null;
}
