// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { mapPointLinks } from '@gc/shared';
import { Avatar } from '../../apps/web/src/components/Avatar';
import { MapLocationPicker } from '../../apps/web/src/components/MapLocationPicker';
import { prepareProfilePhoto } from '../../apps/web/src/components/profilePhoto';

it('exibe foto, mantém indicador de presença e recupera iniciais quando a imagem falha ou é removida', () => {
  const { container, rerender } = render(<Avatar name="Pedro Santos" src="data:image/png;base64,aA==" status="away" statusMessage="Em aula" />);
  expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,aA==');
  expect(screen.getByLabelText('Status: away')).toBeInTheDocument();
  fireEvent.error(container.querySelector('img')!);
  expect(screen.getByText('PS')).toBeInTheDocument();
  rerender(<Avatar name="Pedro Santos" src="data:image/png;base64,aQ==" />);
  expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,aQ==');
  rerender(<Avatar name="Pedro Santos" src="" />);
  expect(screen.getByText('PS')).toBeInTheDocument();
});

it('só aplica o ponto após confirmar e ignora mensagens de outra origem ou janela', async () => {
  const onSelect = vi.fn();
  render(<MapLocationPicker value="" onSelect={onSelect} />);
  await userEvent.click(screen.getByRole('button', { name: 'Selecionar no Maps' }));
  const frame = screen.getByTitle('Selecionar localização no mapa') as HTMLIFrameElement;
  const point = { lat: -29.1681, lng: -51.1794 };
  const message = (origin: string, source: Window | null, selected = point) => act(() => {
    window.dispatchEvent(new MessageEvent('message', { origin, source, data: { type: 'gc-map-select', point: selected } }));
  });
  message('https://evil.test', frame.contentWindow);
  message(window.location.origin, window);
  message(window.location.origin, frame.contentWindow, { lat: 100, lng: 0 });
  expect(screen.getByRole('button', { name: 'Usar este local' })).toBeDisabled();
  message(window.location.origin, frame.contentWindow);
  expect(onSelect).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Usar este local' }));
  expect(onSelect).toHaveBeenCalledWith(mapPointLinks(point));
  expect(screen.queryByTitle('Selecionar localização no mapa')).not.toBeInTheDocument();
});

it('cancelar mantém o link salvo e reabrir restaura o ponto anterior', async () => {
  const onSelect = vi.fn();
  const value = mapPointLinks({ lat: 0, lng: 0 }).googleMapsUrl;
  render(<MapLocationPicker value={value} onSelect={onSelect} />);
  await userEvent.click(screen.getByRole('button', { name: 'Selecionar no Maps' }));
  expect(screen.getByTitle('Selecionar localização no mapa')).toHaveAttribute('src', '/map-picker.html#0,0');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar seleção' }));
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Selecionar no Maps' })).toHaveFocus();
});

it('rejeita arquivos incompatíveis e grandes antes de abrir a imagem', async () => {
  await expect(prepareProfilePhoto(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }))).rejects.toThrow('JPG');
  await expect(prepareProfilePhoto(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'image.jpg', { type: 'image/jpeg' }))).rejects.toThrow('10 MB');
});
