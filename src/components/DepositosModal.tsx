'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import type { Viaje } from '@/types';
import { agruparDepositos, fechaDeposito, MESES_DEPOSITOS, periodoDeposito } from '@/lib/depositos';
import { cadenaDe } from '@/lib/cadenas';
import CadenaLabel from './CadenaLabel';
import styles from './DepositosModal.module.css';

const money = (centimos: number) => `S/ ${(centimos / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaTexto = (viaje: Viaje) => {
  const fecha = fechaDeposito(viaje);
  return fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha exacta';
};

type Month = ReturnType<typeof agruparDepositos>['meses'][number];

function Grafico({ meses, seleccionado, onSelect }: {
  meses: Month[]; seleccionado: number; onSelect: (month: number) => void;
}) {
  const valores = meses.map(m => m.centimos);
  const max = Math.max(...valores, 0);
  return <div className={styles.chart}>
    <div className={styles.scale} aria-hidden="true">
      <span>{money(max)}</span>
      <span>{money(Math.round(max / 2))}</span>
      <span>0</span>
    </div>
    <div className={styles.plot} role="group" aria-label="Importe depositado por mes">
      <div className={styles.gridLines} aria-hidden="true"><i /><i /><i /></div>
      {meses.map((mes, index) => {
        const label = `${mes.nombre}: ${money(mes.centimos)}, ${mes.depositos.length} depósitos`;
        return <button type="button" key={mes.month} className={styles.barButton}
          aria-label={label} aria-pressed={seleccionado === mes.month} title={label} onClick={() => onSelect(mes.month)}>
          <span className={styles.barArea} aria-hidden="true">
            <span className={styles.bar} style={{ height: `${valores[index] ? Math.max(2, valores[index] / (max || 1) * 100) : 0}%` }} />
            {!valores[index] && <span className={styles.zero} />}
          </span>
          <span className={styles.barLabel} aria-hidden="true">{mes.nombre.slice(0, 3)}</span>
        </button>;
      })}
    </div>
  </div>;
}

function AbonosDelMes({ depositos, seleccionado, onSelect }: {
  depositos: Viaje[]; seleccionado: string | null; onSelect: (id: string) => void;
}) {
  const mayor = Math.max(...depositos.map(v => Math.round(Number(v.monto) * 100)), 1);
  return <div className={styles.abonos} role="group" aria-label="Seleccionar un depósito individual">
    {depositos.slice().reverse().map((viaje, index) => {
      const importe = Math.round(Number(viaje.monto) * 100);
      return <button key={viaje.id} type="button" className={styles.abono} aria-pressed={seleccionado === viaje.id}
        aria-label={`Depósito ${index + 1}, ${fechaTexto(viaje)}, ${money(importe)}. Ver detalle`}
        title={viaje.descripcion || 'Depósito recibido'} onClick={() => onSelect(viaje.id)}>
        <span className={styles.abonoDate}>{fechaTexto(viaje)}</span>
        <span className={styles.abonoTrack} aria-hidden="true"><span style={{ width: `${Math.max(2, importe / mayor * 100)}%` }} /></span>
        <strong>{money(importe)}</strong>
      </button>;
    })}
  </div>;
}

export default function DepositosModal({ viajes, onClose }: { viajes: Viaje[]; onClose: () => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState(() => {
    const datos = agruparDepositos(viajes, 2026);
    return { year: 2026, month: datos.meses.findLast(m => m.depositos.length > 0)?.month ?? -1 };
  });
  const { year, month } = selection;
  const [depositoId, setDepositoId] = useState<string | null>(null);
  const datos = useMemo(() => agruparDepositos(viajes, year), [viajes, year]);
  const years = useMemo(() => [...new Set([2026, 2025, ...viajes.filter(v => v.tipo === 'deposito').flatMap(v => {
    const periodo = periodoDeposito(v);
    return periodo ? [periodo.year] : [];
  })])].sort((a, b) => b - a), [viajes]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const selectMonth = (next: number) => {
    setSelection(current => ({ ...current, month: next }));
    setDepositoId(null);
  };
  const depositosMes = month >= 0 ? datos.meses[month].depositos : [];
  const listadoMes = month === -2 ? datos.sinFecha : month === -1 ? datos.meses.slice().reverse().flatMap(m => m.depositos) : depositosMes;
  const depositoSeleccionado = listadoMes.find(v => v.id === depositoId);
  const listado = depositoSeleccionado ? [depositoSeleccionado] : listadoMes;
  const totalListado = listado.reduce((s, v) => s + Math.round((Number(v.monto) || 0) * 100), 0);
  const nombreMes = month >= 0 ? MESES_DEPOSITOS[month] : month === -2 ? 'Depósitos sin fecha' : 'Todos los meses';
  const mesesMayor = datos.meses.filter(m => m.depositos.length > 0 && m.centimos === datos.mayor).map(m => m.nombre);
  const mesesMenor = datos.meses.filter(m => m.depositos.length > 0 && m.centimos === datos.menor).map(m => m.nombre);

  return createPortal(
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      } }}>
      <header className={styles.header}>
        <div><h2 id={titleId}>Depósitos de FART</h2><p>Todos los abonos recibidos, mes a mes.</p></div>
        <button type="button" className={styles.close} aria-label="Cerrar detalle de depósitos" onClick={onClose} autoFocus><X size={20} /></button>
      </header>
      <div className={styles.body}>
        <div className={styles.summary}>
          <div><p>Total recibido en {year}</p><strong>{money(datos.totalCentimos)}</strong><span>{datos.cantidad} {datos.cantidad === 1 ? 'depósito registrado' : 'depósitos registrados'} · todas las cargas</span></div>
          <div className={styles.yearSwitch} role="group" aria-label="Año de los depósitos">
            {years.map(y => <button type="button" key={y} aria-pressed={year === y} onClick={() => {
              const next = agruparDepositos(viajes, y);
              setSelection({ year: y, month: next.meses.findLast(m => m.depositos.length > 0)?.month ?? -1 });
              setDepositoId(null);
            }}>{y}</button>)}
          </div>
        </div>

        <div className={styles.charts}>
          <section className={styles.chartSection} aria-label="Comparación de importes mensuales">
            <h3>Importe por mes</h3><p>Selecciona un mes para desglosar sus abonos.</p>
            <Grafico meses={datos.meses} seleccionado={month} onSelect={selectMonth} />
          </section>
          <section className={styles.chartSection} aria-label="Depósitos individuales del mes seleccionado">
            <h3>{month >= 0 ? `Abonos de ${MESES_DEPOSITOS[month].toLowerCase()}` : 'Abonos del mes'}</h3>
            <p>Cada barra es un depósito. Selecciona uno para ver su detalle.</p>
            {depositosMes.length > 0 ? <AbonosDelMes depositos={depositosMes} seleccionado={depositoSeleccionado?.id ?? null} onSelect={setDepositoId} />
              : <div className={styles.chartEmpty}>{month >= 0 ? 'Este mes no tiene depósitos registrados.' : 'Selecciona un mes del gráfico anual para ver sus abonos individuales.'}</div>}
          </section>
        </div>

        {datos.cantidad > 0 && <div className={styles.comparison}>
          <p><ArrowUpRight size={16} aria-hidden="true" /><span>Mayor importe <strong>{mesesMayor.join(', ')} · {money(datos.mayor ?? 0)}</strong></span></p>
          <p><ArrowDownLeft size={16} aria-hidden="true" /><span>Menor importe <strong>{mesesMenor.join(', ')} · {money(datos.menor ?? 0)}</strong></span></p>
          <span className={styles.comparisonNote}>Entre los meses con depósitos. Los meses sin abonos figuran en cero.</span>
        </div>}

        <section className={styles.detail} aria-label="Detalle de depósitos">
          <div className={styles.detailHeader}>
            <div><h3>{depositoSeleccionado ? `Depósito del ${fechaTexto(depositoSeleccionado)}` : `${nombreMes}${month !== -2 ? ` ${year}` : ''}`}</h3><p aria-live="polite">{listado.length} {listado.length === 1 ? 'depósito' : 'depósitos'} · {money(totalListado)}</p></div>
            <label className={styles.monthSelect}><span className={styles.srOnly}>Mes de los depósitos</span>
              <select value={month} onChange={e => selectMonth(Number(e.target.value))}>
                <option value={-1}>Todos los meses</option>
                {datos.meses.map(m => <option key={m.month} value={m.month}>{m.nombre} ({m.depositos.length})</option>)}
                {datos.sinFecha.length > 0 && <option value={-2}>Sin fecha ({datos.sinFecha.length})</option>}
              </select><ChevronDown size={14} aria-hidden="true" />
            </label>
          </div>
          {depositoSeleccionado && <div className={styles.selectionNote}>
            <span>Estás viendo un abono individual de {nombreMes.toLowerCase()}.</span>
            <button type="button" onClick={() => setDepositoId(null)}>Volver al mes</button>
          </div>}
          {datos.sinFecha.length > 0 && <p className={styles.note}>
            {datos.sinFecha.length} {datos.sinFecha.length === 1 ? 'depósito sin fecha no está incluido' : 'depósitos sin fecha no están incluidos'} en los totales anuales. <button type="button" onClick={() => selectMonth(-2)}>Revisar</button>
          </p>}
          {listado.length === 0 ? <div className={styles.empty}><p>No hay depósitos registrados {month >= 0 ? `en ${MESES_DEPOSITOS[month].toLowerCase()} de ${year}` : `en ${year}`}.</p><span>Selecciona otro mes o cambia de año para consultar los abonos.</span></div> :
            <div className={styles.tableWrap}><table className={styles.table}>
              <caption className={styles.srOnly}>{nombreMes} · depósitos de FART</caption>
              <thead><tr><th scope="col">Fecha</th><th scope="col">Descripción</th><th scope="col">Carga / cuenta</th><th scope="col">Importe</th></tr></thead>
              <tbody>{listado.map(v => <tr key={v.id}><td>{fechaTexto(v)}</td><td>{v.descripcion || 'Depósito recibido'}</td><td><CadenaLabel cadena={cadenaDe(v)} /></td><td>{money(Math.round(Number(v.monto) * 100))}</td></tr>)}</tbody>
              <tfoot><tr><th scope="row" colSpan={3}>{depositoSeleccionado ? 'Importe del depósito' : `Total ${month === -2 ? 'sin fecha' : month === -1 ? year : MESES_DEPOSITOS[month].toLowerCase()}`}</th><td>{money(totalListado)}</td></tr></tfoot>
            </table></div>}
        </section>
      </div>
    </dialog>, document.body,
  );
}
