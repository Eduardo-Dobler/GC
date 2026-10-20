import { Bold, Italic, Link as LinkIcon, List, MapPin, Pencil, Pin, Plus, StickyNote, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PersonalNote } from '@gc/shared';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { NoteContent } from '../components/NoteContent';

type NoteValues = Omit<PersonalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
const colors = ['#ff6a00', '#d97706', '#6b7280', '#272727'];

function NoteEditor({ note, busy, error, onSave }: { note?: PersonalNote; busy: boolean; error: string; onSave: (values: NoteValues) => Promise<void> }) {
  const [content, setContent] = useState(note?.content ?? '');
  const [color, setColor] = useState(note?.color ?? colors[0]!);
  const textArea = useRef<HTMLTextAreaElement>(null);
  function insert(before: string, after = '') {
    const input = textArea.current; if (!input) return;
    const start = input.selectionStart; const end = input.selectionEnd;
    setContent(content.slice(0, start) + before + (content.slice(start, end) || 'texto') + after + content.slice(end));
    input.focus();
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const rows = String(form.get('table')).trim();
    void onSave({
      title: String(form.get('title')), content, color, pinned: form.get('pinned') === 'on',
      checklist: String(form.get('checklist')).split('\n').map(text => text.trim()).filter(Boolean).map(text => ({ text, done: note?.checklist.find(item => item.text === text)?.done ?? false })),
      table: rows ? rows.split('\n').map(row => row.split('|').map(cell => cell.trim())) : [],
      locationDescription: String(form.get('locationDescription')), googleMapsUrl: String(form.get('googleMapsUrl')),
    });
  }
  return <form className="note-editor" onSubmit={save}>
    <label className="form-field">Título<input name="title" required maxLength={80} defaultValue={note?.title} placeholder="Uma ideia, um lembrete, um plano..." /></label>
    <div className="note-toolbar" role="toolbar" aria-label="Formatação da anotação"><button type="button" onClick={() => insert('**', '**')} title="Negrito" aria-label="Negrito"><Bold size={17} /></button><button type="button" onClick={() => insert('*', '*')} title="Itálico" aria-label="Itálico"><Italic size={17} /></button><button type="button" onClick={() => insert('\n- ')} title="Lista" aria-label="Lista"><List size={17} /></button><button type="button" onClick={() => insert('[', '](https://exemplo.com)')} title="Link" aria-label="Inserir link"><LinkIcon size={17} /></button></div>
    <label className="form-field">Anotação<textarea ref={textArea} value={content} onChange={event => setContent(event.target.value)} maxLength={12000} rows={7} placeholder="Escreva aqui. Selecione um trecho e use os botões para formatar." /></label>
    <div className="note-editor__options"><fieldset><legend>Cor do card</legend>{colors.map(item => <label key={item} className="note-color" style={{ backgroundColor: item }}><input type="radio" name="color" aria-label={`Cor ${item}`} checked={color === item} onChange={() => setColor(item)} /></label>)}</fieldset><label><input name="pinned" type="checkbox" defaultChecked={note?.pinned} /> Fixar no topo</label></div>
    <label className="form-field">Checklist (um item por linha)<textarea name="checklist" rows={3} defaultValue={note?.checklist.map(item => item.text).join('\n')} placeholder="Preparar apresentação&#10;Revisar os eventos" /></label>
    <details><summary>Tabela e localização</summary><div className="note-editor__extras"><label className="form-field">Tabela (separe colunas com |)<textarea name="table" rows={4} defaultValue={note?.table.map(row => row.join(' | ')).join('\n')} placeholder="Tarefa | Prazo&#10;Apresentação | Sexta-feira" /></label><p className="helper-text">Até 20 linhas e 8 colunas. A primeira linha será o cabeçalho.</p><label className="form-field">Descrição do local<input name="locationDescription" maxLength={500} defaultValue={note?.locationDescription} placeholder="Ex.: sala de informática do SENAC" /></label><label className="form-field">Link do Google Maps<input name="googleMapsUrl" defaultValue={note?.googleMapsUrl} placeholder="https://www.google.com/maps/..." /></label></div></details>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar anotação'}</Button>
  </form>;
}

export function NotesPage() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PersonalNote | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PersonalNote | null>(null);
  const [busy, setBusy] = useState(false);
  function load() { setLoading(true); setError(''); void api.get<PersonalNote[]>('/notes').then(setNotes).catch(caught => setError(caught.message)).finally(() => setLoading(false)); }
  useEffect(load, []);
  async function save(values: NoteValues, existing?: PersonalNote) {
    setBusy(true); setError('');
    try {
      const saved = existing ? await api.patch<PersonalNote>(`/notes/${existing.id}`, values) : await api.post<PersonalNote>('/notes', values);
      setNotes(current => [saved, ...current.filter(note => note.id !== saved.id)]);
      setEditing(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a anotação.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return; setBusy(true); setError('');
    try { await api.delete(`/notes/${deleting.id}`); setNotes(current => current.filter(note => note.id !== deleting.id)); setDeleting(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível excluir.'); }
    finally { setBusy(false); }
  }
  const visible = notes.filter(note => `${note.title} ${note.content} ${note.locationDescription}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  return <section className="page notes-page"><div className="page-heading"><div><span className="eyebrow">Só você tem acesso</span><h1>Anotações</h1><p>Guarde ideias, organize tarefas e leve seus planos com você entre comunidades.</p></div><Button onClick={() => { setError(''); setEditing('new'); }}><Plus size={18} /> Nova anotação</Button></div>
    <label className="notes-search">Buscar anotações<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Título, conteúdo ou local" /></label>
    {error && !editing && <p className="form-error" role="alert">{error} <Button variant="secondary" onClick={load}>Tentar novamente</Button></p>}
    {loading ? <p className="page-state">Carregando anotações...</p> : <div className="notes-grid">{visible.map(note => <article key={note.id} className="surface note-card" style={{ borderTopColor: note.color }}><header><h2>{note.title}</h2>{note.pinned && <Pin size={16} aria-label="Fixada" />}</header><NoteContent content={note.content} />{note.checklist.length > 0 && <div className="note-checklist">{note.checklist.map((item, index) => <label key={index}><input type="checkbox" checked={item.done} disabled={busy} onChange={() => void save({ ...note, checklist: note.checklist.map((current, n) => n === index ? { ...current, done: !current.done } : current) }, note)} /><span className={item.done ? 'note-done' : ''}>{item.text}</span></label>)}</div>}{note.table.length > 0 && <div className="note-table"><table><thead><tr>{note.table[0]!.map((cell, index) => <th key={index}>{cell}</th>)}</tr></thead><tbody>{note.table.slice(1).map((row, index) => <tr key={index}>{row.map((cell, n) => <td key={n}>{cell}</td>)}</tr>)}</tbody></table></div>}{(note.locationDescription || note.googleMapsUrl) && <div className="note-location"><MapPin size={16} /><div>{note.locationDescription && <p>{note.locationDescription}</p>}{note.googleMapsUrl && <a href={note.googleMapsUrl} target="_blank" rel="noopener noreferrer">Abrir no Maps</a>}</div></div>}<footer><small>{new Date(note.updatedAt).toLocaleDateString('pt-BR')}</small><button className="icon-button" aria-label={`Editar ${note.title}`} onClick={() => { setError(''); setEditing(note); }}><Pencil size={17} /></button><button className="icon-button" aria-label={`Excluir ${note.title}`} onClick={() => { setError(''); setDeleting(note); }}><Trash2 size={17} /></button></footer></article>)}</div>}
    {!loading && !visible.length && !error && <div className="page-state"><StickyNote size={30} /><p>{query ? 'Nenhuma anotação encontrada.' : 'Seu próximo plano começa com uma anotação.'}</p></div>}
    <Modal open={Boolean(editing)} title={editing === 'new' ? 'Nova anotação' : 'Editar anotação'} onClose={() => { if (!busy) setEditing(null); }} wide>{editing && <NoteEditor key={editing === 'new' ? 'new' : editing.id} note={editing === 'new' ? undefined : editing} busy={busy} error={error} onSave={values => save(values, editing === 'new' ? undefined : editing)} />}</Modal>
    <Modal open={Boolean(deleting)} title="Excluir anotação" onClose={() => { if (!busy) setDeleting(null); }} footer={<><Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancelar</Button><Button onClick={() => void remove()} disabled={busy}>Excluir</Button></>}><p>Excluir “{deleting?.title}”?</p></Modal>
  </section>;
}
