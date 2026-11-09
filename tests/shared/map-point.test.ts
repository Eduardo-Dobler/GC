import { describe, expect, it } from 'vitest';
import { mapPointFromUrl, mapPointLinks, normalizeGoogleMapsEmbedUrl, normalizeGoogleMapsUrl, validMapPoint } from '@gc/shared';

describe('pontos selecionados no mapa', () => {
  it.each([{ lat: -29.1681, lng: -51.1794 }, { lat: 0, lng: 0 }, { lat: 90, lng: 180 }])('gera links aceitos e restaura o ponto %j', point => {
    const links = mapPointLinks(point);
    expect(normalizeGoogleMapsUrl(links.googleMapsUrl)).toBe(links.googleMapsUrl);
    expect(normalizeGoogleMapsEmbedUrl(links.googleMapsEmbedUrl)).toBe(links.googleMapsEmbedUrl);
    expect(mapPointFromUrl(links.googleMapsUrl)).toEqual(point);
    expect(mapPointFromUrl(links.googleMapsEmbedUrl)).toEqual(point);
  });
  it.each([null, {}, { lat: NaN, lng: 0 }, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: '1', lng: 2 }])('rejeita coordenadas inválidas %j', point => {
    expect(validMapPoint(point)).toBe(false);
  });
  it('não interpreta endereços, links encurtados ou hosts externos como coordenadas', () => {
    expect(mapPointFromUrl('https://www.google.com/maps?q=SENAC')).toBeNull();
    expect(mapPointFromUrl('https://maps.app.goo.gl/example')).toBeNull();
    expect(mapPointFromUrl('https://evil.test/?q=1,2')).toBeNull();
    expect(mapPointFromUrl('https://www.google.com/maps?q=91,2')).toBeNull();
    expect(mapPointFromUrl('https://www.google.com/maps/@-29.1,-51.2,16z')).toEqual({ lat: -29.1, lng: -51.2 });
  });
});
