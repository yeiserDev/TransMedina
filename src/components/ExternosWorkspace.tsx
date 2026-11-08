'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, Receipt, Search, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { importePorCobrar, resumenCobros, saldoViaje, soles, type DocumentoExterno, type ViajeExterno } from '@/lib/externos';
import styles from './ExternosWorkspace.module.css';
import ClienteRucFields from './ClienteRucFields';
import { esRuc } from '@/lib/ruc';
import ExternosDocumentos from './ExternosDocumentos';
import ExternoDocumentPreview from './ExternoDocumentPreview';
import { uploadDocumento } from '@/lib/upload-documento';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
const blank = () => ({ cliente: '', cliente_ruc: '', ruta: '', fecha: today(), monto: '', pago_completo: false, igv_modalidad: 'incluido' as NonNullable<ViajeExterno['igv_modalidad']>, estado: 'programado', notas: '', detraccion_monto: '0', detraccion_estado: 'no_aplica' });
type Draft = ReturnType<typeof blank> & { id?: string };
async function responseData(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

export default function ExternosWorkspace() {
  const [viajes, setViajes] = useState<ViajeExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('activos');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCobros, setShowCobros] = useState(false);
  const [preview, setPreview] = useState<DocumentoExterno | null>(null);
  const locked = useRef(false);
  const [abono, setAbono] = useState({ fecha: today(), monto: '', nota: '' });
  const paymentId = useRef<string | null>(null);
  const [annul, setAnnul] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const detail = useRef<HTMLElement>(null);
  const load = useCallback(async () => {
    try { setViajes(await responseData(await fetch('/api/externos', { cache: 'no-store' }))); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los viajes.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/externos', { cache: 'no-store', signal: controller.signal })
      .then(responseData)
      .then(data => { if (!controller.signal.aborted) setViajes(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudieron cargar los viajes.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const selectedViaje = viajes.find(v => v.id === selected);
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await action(); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const post = async (body: unknown) => responseData(await fetch('/api/externos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  const open = (v: ViajeExterno) => { setSelected(v.id); setMonth(v.fecha.slice(0, 7)); setDraft(null); setShowCobros(false); setAnnul(null); setAbono({ fecha: today(), monto: '', nota: '' }); paymentId.current = null; requestAnimationFrame(() => detail.current?.focus({ preventScroll: true })); };
  const active = viajes.filter(v => v.estado !== 'cancelado');
  const totals = resumenCobros(viajes);
  const visible = viajes.filter(v => `${v.cliente} ${v.cliente_ruc ?? ''} ${v.ruta}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!day || v.fecha === day) && (filter === 'todos' || (filter === 'activos' && v.estado !== 'cancelado') || (filter === 'pendientes' && v.estado !== 'cancelado' && saldoViaje(v).pendiente > 0) || (filter === 'igv' && v.estado !== 'cancelado' && v.igv_modalidad === 'adicional' && saldoViaje(v).pendiente > 0) || (filter === 'revisar' && v.estado !== 'cancelado' && (!v.igv_modalidad || v.igv_modalidad === 'total')) || (filter === 'cancelados' && v.estado === 'cancelado')));
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(year, monthNumber - 1, 1).getDay();
  const days = new Date(year, monthNumber, 0).getDate();
  const changeMonth = (delta: number) => { const d = new Date(year, monthNumber - 1 + delta, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); setDay(''); };
  const edit = (v: ViajeExterno) => setDraft({ id: v.id, cliente: esRuc(v.cliente) ? '' : v.cliente, cliente_ruc: v.cliente_ruc ?? (esRuc(v.cliente) ? v.cliente : ''), ruta: v.ruta, fecha: v.fecha, monto: String(v.monto), pago_completo: v.pago_completo ?? false, igv_modalidad: v.igv_modalidad ?? 'total', estado: v.estado, notas: v.notas, detraccion_monto: String(v.detraccion_monto), detraccion_estado: v.detraccion_estado });

  return <main className={styles.workspace}>
    <header className={styles.header}><div><h1>Viajes externos</h1><p>{selectedViaje ? 'Detalle del viaje' : 'Tus clientes, documentos y cobros.'}</p></div><button className={styles.primary} disabled={loading || !!error || busy} onClick={() => { setDraft(blank()); setSelected(null); }}><Plus size={17} /> Nuevo viaje</button></header>
    {error ? <section className={styles.notice} role="alert"><h2>No pudimos cargar esta sección</h2><p>{error}</p><button onClick={() => void load()}>Volver a intentar</button></section> : loading && viajes.length === 0 ? <p role="status" className={styles.notice}>Cargando viajes externos…</p> : <>
      <section className={styles.summary} aria-label="Resumen de cobros de viajes activos">
        <div><span><Receipt size={14} /> IGV por cobrar</span><strong>{soles(totals.igvPendiente / 100)}</strong><button disabled={busy || !!draft} onClick={() => { setFilter('igv'); setDay(''); setQuery(''); setSelected(null); }}>{totals.viajesIgvPendiente} {totals.viajesIgvPendiente === 1 ? 'viaje pendiente' : 'viajes pendientes'} <ArrowUpRight size={14} /></button></div>
        <div><span><CheckCircle2 size={14} /> IGV cobrado</span><strong>{soles(totals.igvCobrado / 100)}</strong><small>Abonos recibidos del IGV adicional</small></div>
        <div><span>Por cobrar en total</span><strong>{soles(totals.pendiente / 100)}</strong><small>IGV y saldos anteriores</small></div>
        <p>{active.length} {active.length === 1 ? 'viaje activo' : 'viajes activos'} · Solo externos</p>
      </section>
      <div className={styles.layout}><section className={styles.main}>
      {totals.sinClasificar > 0 && <div className={styles.legacyNotice}><p>{totals.sinClasificar} {totals.sinClasificar === 1 ? 'viaje anterior conserva su saldo' : 'viajes anteriores conservan sus saldos'}. Edita su modalidad para indicar «IGV incluido» o «+ IGV». Aún no se cuentan como IGV pendiente.</p><button onClick={() => { setFilter('revisar'); setDay(''); setQuery(''); setSelected(null); setDraft(null); }}>Revisar viajes</button></div>}
        {draft ? <section className={styles.panel}><div className={styles.sectionHead}><h2>{draft.id ? 'Editar viaje' : 'Nuevo viaje externo'}</h2><button aria-label="Cerrar formulario" disabled={busy} onClick={() => setDraft(null)}><X size={18} /></button></div>
          <form onSubmit={e => { e.preventDefault(); void run(async () => { await post({ ...draft, action: 'viaje', monto: Number(draft.monto), detraccion_monto: draft.detraccion_estado === 'no_aplica' ? 0 : Number(draft.detraccion_monto) }); setDraft(null); toast.success('Viaje guardado'); }); }}>
            <fieldset disabled={busy} className={styles.fields}>
              <ClienteRucFields key={draft.id ?? 'nuevo'} ruc={draft.cliente_ruc} nombre={draft.cliente} disabled={busy} onChange={(ruc, nombre) => setDraft(current => current ? { ...current, cliente_ruc: ruc, cliente: nombre } : null)} />
              <label>Ruta<input required maxLength={250} value={draft.ruta} onChange={e => setDraft({ ...draft, ruta: e.target.value })} placeholder="Origen — destino" /></label>
              <label>Fecha del viaje<input required type="date" value={draft.fecha} onChange={e => setDraft({ ...draft, fecha: e.target.value })} /></label>
              <label>{draft.igv_modalidad === 'adicional' ? 'Flete ya pagado, sin IGV (S/)' : draft.igv_modalidad === 'incluido' ? 'Total ya pagado, IGV incluido (S/)' : 'Importe acordado anterior (S/)'}<input required type="number" min="0.01" max="99999999.99" step="0.01" value={draft.monto} onChange={e => setDraft({ ...draft, monto: e.target.value })} /></label>
              <label>Modalidad de IGV<select value={draft.igv_modalidad} onChange={e => setDraft({ ...draft, igv_modalidad: e.target.value as Draft['igv_modalidad'] })}>
                {draft.id && <option value="total">Registro anterior · conservar saldo</option>}
                <option value="incluido">IGV incluido · sin adicional por cobrar</option><option value="adicional">+ IGV · cobrar el 18 % adicional</option>
              </select></label>
              {draft.igv_modalidad !== 'incluido' && <label>Estado del cobro<select value={draft.pago_completo ? 'pagado' : 'pendiente'} onChange={e => setDraft({ ...draft, pago_completo: e.target.value === 'pagado' })}><option value="pendiente">{draft.igv_modalidad === 'adicional' ? 'Debe IGV' : 'Tiene saldo pendiente'}</option><option value="pagado">Pagó completo</option></select></label>}
              <p className={`${styles.hint} ${styles.full}`} aria-live="polite">{draft.pago_completo && draft.igv_modalidad !== 'incluido' ? 'Pagó completo. Este viaje no tendrá saldo pendiente.' : draft.igv_modalidad === 'total' ? 'Conserva el cálculo anterior: importe menos abonos. Selecciona una modalidad de IGV cuando el flete ya esté pagado.' : draft.igv_modalidad === 'incluido' ? 'El flete y su IGV ya están pagados. Adicional por cobrar: S/ 0.00.' : `El flete ya está pagado. IGV adicional (18 %): ${soles(importePorCobrar({ monto: Number(draft.monto) || 0, igv_modalidad: 'adicional' }))}, antes de descontar sus abonos.`}</p>
              <label>Estado del viaje<select value={draft.estado} onChange={e => setDraft({ ...draft, estado: e.target.value })}><option value="programado">Programado</option><option value="realizado">Realizado</option><option value="cancelado">Cancelado</option></select></label>
              <label>Detracción<select value={draft.detraccion_estado} onChange={e => setDraft({ ...draft, detraccion_estado: e.target.value })}><option value="no_aplica">No aplica</option><option value="pendiente">Pendiente</option><option value="realizado">Realizada</option></select></label>
              {draft.detraccion_estado !== 'no_aplica' && <label>Importe de detracción (S/)<input required type="number" min="0.01" max={draft.monto || undefined} step="0.01" value={draft.detraccion_monto} onChange={e => setDraft({ ...draft, detraccion_monto: e.target.value })} /><span>Se registra por separado; no reduce el saldo.</span></label>}
              <label className={styles.full}>Notas<textarea maxLength={2000} rows={3} value={draft.notas} onChange={e => setDraft({ ...draft, notas: e.target.value })} /></label>
              <div className={styles.actions}><button type="submit" className={styles.primary}>{busy ? 'Guardando…' : 'Guardar viaje'}</button><button type="button" onClick={() => setDraft(null)}>Cancelar</button></div>
            </fieldset>
          </form></section> : selectedViaje ? <section key={selectedViaje.id} ref={detail} tabIndex={-1} className={`${styles.panel} ${styles.compactPanel}`}>
            <div className={styles.sectionHead}><button disabled={busy} onClick={() => setSelected(null)}><ArrowLeft size={16} /> Todos los viajes</button><button disabled={busy} onClick={() => edit(selectedViaje)}>Editar viaje</button></div>
            <div className={styles.tripHeading}><h2>{selectedViaje.ruta}</h2><span className={styles.tripStatus} data-state={selectedViaje.estado}>{selectedViaje.estado === 'realizado' ? <CheckCircle2 size={14} /> : <Truck size={14} />}{selectedViaje.estado}</span></div>
            <p className={styles.companyName}>{selectedViaje.cliente}</p>
            <div className={styles.tripMeta}><span><CalendarDays size={14} />{dateLabel(selectedViaje.fecha)}</span>{selectedViaje.cliente_ruc && <span>RUC {selectedViaje.cliente_ruc}</span>}<span>{selectedViaje.igv_modalidad === 'incluido' ? 'IGV incluido' : selectedViaje.igv_modalidad === 'adicional' ? '+ IGV (18 %)' : 'Modalidad por revisar'}</span></div>
            <div className={styles.balance}>
              <span>{selectedViaje.igv_modalidad === 'adicional' ? 'Flete pagado sin IGV' : selectedViaje.igv_modalidad === 'incluido' ? 'Total pagado con IGV' : 'Importe anterior'}<b>{soles(selectedViaje.monto)}</b></span>
              {selectedViaje.igv_modalidad === 'adicional' && !selectedViaje.pago_completo && <span>IGV adicional (18 %)<b>{soles(importePorCobrar(selectedViaje))}</b></span>}
              {selectedViaje.igv_modalidad !== 'incluido' && !selectedViaje.pago_completo && <span>{selectedViaje.igv_modalidad === 'adicional' ? 'IGV cobrado' : 'Abonos registrados'}<b>{soles(saldoViaje(selectedViaje).cobrado)}</b></span>}
              <span data-settled={saldoViaje(selectedViaje).pendiente === 0}>{selectedViaje.igv_modalidad === 'adicional' ? 'IGV por cobrar' : 'Por cobrar'}<b>{soles(saldoViaje(selectedViaje).pendiente)}</b></span>
              <span>Detracción <b>{selectedViaje.detraccion_estado === 'no_aplica' ? 'No aplica' : soles(selectedViaje.detraccion_monto)}</b><small>{selectedViaje.detraccion_estado === 'realizado' ? 'Realizada' : selectedViaje.detraccion_estado === 'pendiente' ? 'Pendiente' : 'Sin detracción'}</small></span>
            </div>
            {(selectedViaje.pago_completo || selectedViaje.igv_modalidad === 'incluido') && <p className={styles.settled}><CheckCircle2 size={14} /> Pagó completo · Sin saldo pendiente</p>}
            {selectedViaje.igv_modalidad === 'adicional' && !selectedViaje.pago_completo && <p className={styles.hint}>El flete ya está pagado. Registra aquí únicamente los abonos del IGV adicional.</p>}
            {selectedViaje.notas && <p className={styles.notes}>{selectedViaje.notas}</p>}
            {(selectedViaje.externos_abonos.length > 0 || saldoViaje(selectedViaje).pendiente > 0) && <button type="button" className={styles.cobrosToggle} aria-expanded={showCobros} aria-controls="trip-payments" onClick={() => setShowCobros(!showCobros)}>{showCobros ? 'Cerrar cobros' : saldoViaje(selectedViaje).pendiente > 0 ? 'Registrar / ver cobros' : 'Ver cobros'} · {selectedViaje.externos_abonos.length}</button>}
            {showCobros && <section className={styles.paymentDetails} id="trip-payments">
            <h3>{selectedViaje.igv_modalidad === 'adicional' ? 'Cobros del IGV adicional' : 'Abonos del viaje'}</h3>
            {selectedViaje.externos_abonos.length === 0 ? <p className={styles.hint}>{selectedViaje.igv_modalidad === 'incluido' ? 'Sin abonos adicionales. El importe del viaje ya incluye el IGV pagado.' : 'Todavía no hay abonos registrados.'}</p> : <ul className={styles.movements}>{selectedViaje.externos_abonos.slice().sort((a,b) => b.fecha.localeCompare(a.fecha)).map(a => <li key={a.id}><div><strong>{soles(a.monto)}</strong><span>{dateLabel(a.fecha)}{a.nota ? ` · ${a.nota}` : ''}</span>{a.anulado && <span>Anulado: {a.motivo_anulacion}</span>}</div>{!a.anulado && <button disabled={busy} onClick={() => { setAnnul(a.id); setReason(''); }}>Anular</button>}</li>)}</ul>}
            {annul && <form className={styles.annul} onSubmit={e => { e.preventDefault(); void run(async () => { await post({ action: 'anular', id: annul, motivo: reason }); setAnnul(null); toast.success('Abono anulado'); }); }}><label>Motivo de anulación<input required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy}>Confirmar anulación</button><button type="button" disabled={busy} onClick={() => setAnnul(null)}>Cancelar</button></form>}
            {selectedViaje.estado !== 'cancelado' && saldoViaje(selectedViaje).pendiente > 0 && <form onSubmit={e => { e.preventDefault(); paymentId.current ??= crypto.randomUUID(); void run(async () => { await post({ action: 'abono', id: paymentId.current, viaje_id: selectedViaje.id, ...abono, monto: Number(abono.monto) }); paymentId.current = null; setAbono({ fecha: today(), monto: '', nota: '' }); toast.success('Abono registrado'); }); }}><fieldset className={styles.fields} disabled={busy}><label>Fecha del abono<input required type="date" value={abono.fecha} onChange={e => { paymentId.current = null; setAbono({ ...abono, fecha: e.target.value }); }} /></label><label>Abono (S/)<input required type="number" min="0.01" max={saldoViaje(selectedViaje).pendiente} step="0.01" value={abono.monto} onChange={e => { paymentId.current = null; setAbono({ ...abono, monto: e.target.value }); }} /></label><label className={styles.full}>Referencia o nota<input maxLength={500} value={abono.nota} onChange={e => { paymentId.current = null; setAbono({ ...abono, nota: e.target.value }); }} placeholder="Transferencia, efectivo, número de operación…" /></label><button className={styles.primary}>{busy ? 'Guardando…' : 'Registrar abono'}</button></fieldset></form>}
            </section>}
            <ExternosDocumentos key={selectedViaje.id} viaje={selectedViaje} busy={busy} onPreview={setPreview} onUpload={async (data, progress) => {
              if (locked.current) throw new Error('Espera a que termine la operación actual.');
              locked.current = true; setBusy(true);
              try { await uploadDocumento(data, progress); await load(); }
              finally { locked.current = false; setBusy(false); }
            }} />
          </section> : <>
            <div className={styles.filters}><label className={styles.search}><Search size={16} /><input aria-label="Buscar cliente o ruta" placeholder="Buscar cliente o ruta" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filtrar viajes" value={filter} onChange={e => setFilter(e.target.value)}><option value="activos">Viajes activos</option><option value="igv">IGV por cobrar</option><option value="pendientes">Cualquier saldo pendiente</option><option value="revisar">Modalidad por revisar</option><option value="todos">Todos los viajes</option><option value="cancelados">Cancelados</option></select>{day && <button onClick={() => setDay('')}>{dateLabel(day)} <X size={14} /></button>}</div>
            {visible.length === 0 ? <section className={styles.empty}><Truck size={32} strokeWidth={1.4} /><h2>{viajes.length ? 'No hay viajes con estos filtros' : 'Tu próximo viaje empieza aquí'}</h2><p>{viajes.length ? 'Prueba otra fecha, cliente o estado.' : 'Registra el flete pagado y elige IGV incluido o + IGV. Después podrás añadir sus cobros y documentos.'}</p>{viajes.length === 0 && <button className={styles.primary} onClick={() => setDraft(blank())}><Plus size={16} /> Registrar primer viaje</button>}</section> : <div className={styles.tableWrap}>
              <table><thead><tr><th>Fecha / cliente</th><th>Ruta</th><th>Flete / IGV</th><th>Pendiente</th><th>Estado</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{visible.map(v => {
                const balance = saldoViaje(v);
                return <tr key={v.id}><td><span>{dateLabel(v.fecha)}</span><strong>{v.cliente}</strong>{v.cliente_ruc && v.cliente_ruc !== v.cliente && <small>RUC {v.cliente_ruc}</small>}</td><td>{v.ruta}</td>
                  <td>{soles(v.monto)}<small>{v.pago_completo ? 'Pagó completo' : v.igv_modalidad === 'adicional' ? `+ IGV ${soles(importePorCobrar(v))}` : v.igv_modalidad === 'incluido' ? 'IGV incluido' : 'Modalidad por revisar'}</small></td>
                  <td className={balance.pendiente > 0 ? styles.pending : ''}>{v.estado === 'cancelado' ? '—' : soles(balance.pendiente)}{v.igv_modalidad === 'adicional' && <small>Solo IGV</small>}</td>
                  <td><span className={styles.status}>{v.estado === 'cancelado' ? 'Cancelado' : v.pago_completo ? 'Pagó completo' : v.igv_modalidad === 'incluido' ? 'Sin adicional' : balance.pendiente === 0 ? 'Cobrado' : balance.cobrado > 0 ? 'Abono parcial' : 'Por cobrar'}</span><small>{v.estado}</small></td>
                  <td><button aria-label={`Ver viaje de ${v.cliente}: ${v.ruta}`} onClick={() => open(v)}>Ver <ChevronRight size={14} /></button></td></tr>;
              })}</tbody></table></div>}
          </>}
      </section><aside className={styles.calendar}><div className={styles.sectionHead}><h2>Calendario</h2><span>{viajes.filter(v => v.fecha.startsWith(month) && v.estado !== 'cancelado').length} viajes</span></div><div className={styles.month}><button aria-label="Mes anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button><strong>{new Date(year, monthNumber - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</strong><button aria-label="Mes siguiente" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button></div><div className={styles.days}>{['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => <span key={d}>{d}</span>)}{Array.from({ length: start }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: days }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, '0')}`; const count = active.filter(v => v.fecha === date).length; return <button key={date} disabled={busy || !!draft} aria-label={`${dateLabel(date)}, ${count} viajes`} aria-pressed={day === date || selectedViaje?.fecha === date} data-today={date === today()} data-trips={count > 0} onClick={() => { setDay(date === day ? '' : date); setDraft(null); setSelected(null); }}>{i + 1}{count > 0 && <i />}</button>; })}</div><p>Los puntos indican días con viajes.</p><button className={styles.today} onClick={() => { setMonth(today().slice(0, 7)); setDay(''); }}>Volver al mes actual</button><div className={styles.privacy}><h3>Tu operación externa</h3><p>Solo tú tienes acceso a los viajes, abonos y documentos de esta sección.</p></div></aside></div>
    </>}
    {preview && <ExternoDocumentPreview key={preview.id} document={preview} onClose={() => setPreview(null)} />}
  </main>;
}
