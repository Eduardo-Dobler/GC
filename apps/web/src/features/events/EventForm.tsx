import { useState, type FormEvent } from 'react';
import { MapPin, Search } from 'lucide-react';
import type { EventView } from '@gc/shared';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { MapEmbedPreview } from './MapEmbedPreview';

export interface EventFormValues {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  category: string;
  color: string;
  recurring: boolean;
  recurrence: 'weekly' | 'monthly' | null;
  invitedUserIds: string[];
  locationDescription: string;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
}

function localValue(value?: string) {
  return value ? value.slice(0, 16) : '';
}

export function EventForm({ open, event, onClose, onSave }: { open: boolean; event: EventView | null; onClose: () => void; onSave: (values: EventFormValues) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mapsUrl, setMapsUrl] = useState(event?.googleMapsUrl ?? '');
  const [mapsEmbed, setMapsEmbed] = useState(event?.googleMapsEmbedUrl ?? '');
  const [placeSearch, setPlaceSearch] = useState('');

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const startsAt = new Date(String(form.get('startsAt')));
    const endsAt = new Date(String(form.get('endsAt')));
    if (endsAt <= startsAt) {
      setError('O término precisa ser posterior ao início.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const recurrence = String(form.get('recurrence'));
      await onSave({
        title: String(form.get('title')),
        description: String(form.get('description')),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        category: String(form.get('category')),
        color: String(form.get('color')),
        recurring: recurrence !== 'none',
        recurrence: recurrence === 'weekly' || recurrence === 'monthly' ? recurrence : null,
        invitedUserIds: event?.invitedUserIds ?? [],
        locationDescription: String(form.get('locationDescription') ?? ''),
        googleMapsUrl: mapsUrl,
        googleMapsEmbedUrl: mapsEmbed,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o evento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={event ? 'Editar evento' : 'Criar evento'} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="event-form" disabled={saving}>{saving ? 'Salvando...' : 'Salvar evento'}</Button></>}>
      <form id="event-form" className="event-form" onSubmit={submit}>
        <label className="form-field">Título<input name="title" required minLength={3} maxLength={80} defaultValue={event?.title} /></label>
        <label className="form-field">Descrição<textarea name="description" required minLength={3} maxLength={500} rows={3} defaultValue={event?.description} /></label>
        <div className="form-grid"><label className="form-field">Início<input name="startsAt" type="datetime-local" required defaultValue={localValue(event?.startsAt)} /></label><label className="form-field">Término<input name="endsAt" type="datetime-local" required defaultValue={localValue(event?.endsAt)} /></label></div>
        <div className="form-grid"><label className="form-field">Categoria<input name="category" required minLength={2} maxLength={40} defaultValue={event?.category ?? 'Encontro'} /></label><label className="form-field">Cor<input name="color" type="color" defaultValue={event?.color ?? '#f97316'} /></label></div>
        <label className="form-field">Recorrência<select name="recurrence" defaultValue={event?.recurring ? event.recurrence ?? 'weekly' : 'none'}><option value="none">Não se repete</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label>
        <fieldset className="location-fieldset"><legend>Local do evento</legend>
          <label className="form-field">Descrição do local<textarea name="locationDescription" rows={2} maxLength={1000} defaultValue={event?.locationDescription ?? ''} placeholder="Ex.: Auditório do SENAC, entrada pela rua lateral." /></label>
          <label className="form-field">Buscar local no Maps<div className="map-search-row"><input value={placeSearch} onChange={(input) => setPlaceSearch(input.target.value)} placeholder="Ex.: SENAC Caxias do Sul" /><Button type="button" variant="secondary" onClick={() => { const place = placeSearch.trim(); if (!place) return; setMapsUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`); setMapsEmbed(`https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`); }}><Search size={16} /> Usar local</Button></div></label>
          <label className="form-field">Link do Google Maps<input name="googleMapsUrl" type="url" value={mapsUrl} onChange={(input) => setMapsUrl(input.target.value)} placeholder="https://maps.app.goo.gl/..." /></label>
          <label className="form-field">Iframe do Google Maps<textarea name="googleMapsEmbedUrl" rows={3} value={mapsEmbed} onChange={(input) => setMapsEmbed(input.target.value)} placeholder="Cole o HTML copiado em Compartilhar > Incorporar um mapa" /><small className="helper-text">O sistema extrai somente o endereço seguro do mapa.</small></label>
          <details className="map-help"><summary>Modelo da Maps Embed API</summary><code>&lt;iframe width="450" height="250" frameborder="0" style="border:0" referrerpolicy="strict-origin-when-cross-origin" src="https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&amp;q=SENAC+Caxias+do+Sul" allowfullscreen&gt;&lt;/iframe&gt;</code><small className="helper-text">Troque `YOUR_API_KEY` por uma chave real antes de salvar. Para uma demonstração rápida, use o botão “Usar local” ou copie o iframe em Compartilhar → Incorporar um mapa.</small></details>
          <MapEmbedPreview src={mapsEmbed} title={`Prévia do mapa de ${event?.title ?? 'novo evento'}`} />
          {!mapsUrl && !mapsEmbed && <p className="helper-text"><MapPin size={14} /> Dica: busque “SENAC Caxias do Sul” e use o local encontrado como exemplo.</p>}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
