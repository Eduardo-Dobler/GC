import { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { mapPointFromUrl, mapPointLinks, validMapPoint, type MapPoint } from '@gc/shared';
import { Button } from './Button';

type SelectedLocation = ReturnType<typeof mapPointLinks>;
interface PickerProps { value: string; onSelect: (location: SelectedLocation) => void }

function PickerPanel({ value, onSelect, onClose }: PickerProps & { onClose: () => void }) {
  const [initial] = useState(() => mapPointFromUrl(value));
  const [point, setPoint] = useState<MapPoint | null>(initial);
  const [mapError, setMapError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data?.type === 'gc-map-select' && validMapPoint(data.point)) {
        setPoint({ lat: data.point.lat, lng: data.point.lng });
      } else if (data?.type === 'gc-map-error') {
        setMapError('Não foi possível carregar o mapa. Verifique sua internet ou use os campos de endereço e link.');
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  const hash = initial ? `#${initial.lat},${initial.lng}` : '';
  return <div className="map-picker__panel">
    <p>Clique ou toque no mapa para marcar o ponto. Arraste para navegar e use + e − para aproximar. Confirme para preencher o link.</p>
    <iframe ref={frame} className="map-picker__frame" title="Selecionar localização no mapa" src={`/map-picker.html${hash}`} allow="geolocation" />
    {mapError && <p role="alert" className="form-error">{mapError}</p>}
    <p className="helper-text" aria-live="polite">{point ? `Ponto selecionado: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : 'Selecione um ponto para continuar.'}</p>
    <div className="map-picker__actions">
      <Button type="button" variant="secondary" onClick={onClose}>Cancelar seleção</Button>
      <Button type="button" disabled={!point} onClick={() => { if (point) { onSelect(mapPointLinks(point)); onClose(); } }}>Usar este local</Button>
    </div>
    <p className="helper-text">Seleção com OpenStreetMap. O link salvo abre o ponto no Google Maps. Requer internet.</p>
  </div>;
}

export function MapLocationPicker({ value, onSelect }: PickerProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); container.current?.querySelector<HTMLButtonElement>('button')?.focus(); };
  return <div className="map-picker" ref={container}>
    <Button type="button" variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen(current => !current)}><MapPin size={17} /> Selecionar no Maps</Button>
    <div id={id}>{open && <PickerPanel value={value} onSelect={onSelect} onClose={close} />}</div>
  </div>;
}
