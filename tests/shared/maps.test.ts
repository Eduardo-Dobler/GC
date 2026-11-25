import { describe, expect, it } from 'vitest';
import { googleMapsOpenUrl, normalizeGoogleMapsEmbedUrl } from '@gc/shared';

describe('Google Maps', () => {
  it('aceita o iframe v1 somente com modo, chave e parâmetro reais', () => {
    const html = '<iframe width="450" height="250" frameborder="0" style="border:0" referrerpolicy="strict-origin-when-cross-origin" src="https://www.google.com/maps/embed/v1/place?key=demo-key&q=SENAC+Caxias+do+Sul" allowfullscreen></iframe>';
    expect(normalizeGoogleMapsEmbedUrl(html)).toContain('/maps/embed/v1/place?key=demo-key&q=');
    expect(normalizeGoogleMapsEmbedUrl(html)).not.toContain('<iframe');
    expect(normalizeGoogleMapsEmbedUrl(html.replace('demo-key', 'YOUR_API_KEY'))).toBeNull();
  });

  it('converte a incorporação em uma URL de abertura do Maps', () => {
    const embed = 'https://www.google.com/maps/embed/v1/place?key=demo-key&q=SENAC+Caxias+do+Sul';
    expect(googleMapsOpenUrl(embed)).toBe('https://www.google.com/maps/search/?api=1&query=SENAC%20Caxias%20do%20Sul');
    expect(googleMapsOpenUrl('', 'SENAC Caxias do Sul')).toBe('https://www.google.com/maps/search/?api=1&query=SENAC%20Caxias%20do%20Sul');
  });
});
