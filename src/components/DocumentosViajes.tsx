'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Viaje } from '@/types';
import { agruparDocumentos } from '@/lib/documentos-viajes';
import { formatDoc } from '@/lib/documentos';
import DrivePreviewModal from './DrivePreviewModal';
import IconoPdf from './IconoPdf';
import styles from './DocumentosViajes.module.css';

function alternar(actual: Set<string> | null, defecto: Set<string>, key: string) {
  const next = new Set(actual ?? defecto);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export default function DocumentosViajes({ viajes }: { viajes: Viaje[] }) {
  const id = useId();
  const [busqueda, setBusqueda] = useState('');
  const [aniosAbiertos, setAniosAbiertos] = useState<Set<string> | null>(null);
  const [mesesAbiertos, setMesesAbiertos] = useState<Set<string> | null>(null);
  const [preview, setPreview] = useState<{ driveId: string; label: string } | null>(null);
  const grupos = useMemo(() => agruparDocumentos(viajes, busqueda), [viajes, busqueda]);
  const total = useMemo(() => agruparDocumentos(viajes).reduce((sum, anio) => sum + anio.archivos, 0), [viajes]);
  const buscando = Boolean(busqueda.trim());
  const aniosDefecto = new Set(buscando ? grupos.map(g => g.key) : grupos.slice(0, 1).map(g => g.key));
  const mesesDefecto = new Set(buscando ? grupos.flatMap(g => g.meses.map(m => m.key)) : grupos[0]?.meses.slice(0, 1).map(m => m.key));
  const resultados = grupos.reduce((sum, anio) => sum + anio.meses.reduce((n, mes) => n + mes.viajes.length, 0), 0);

  function buscar(value: string) {
    setBusqueda(value);
    setAniosAbiertos(null);
    setMesesAbiertos(null);
  }

  return (
    <section className={styles.section} aria-labelledby={`${id}-titulo`}>
      <div className={styles.heading}>
        <h2 id={`${id}-titulo`}>Documentos</h2>
        <span className={styles.total}>{total} PDF</span>
      </div>
      <p className={styles.hint}>Guías y facturas por viaje</p>
      {total > 0 && (
        <div className={styles.search}>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar documentos por número, ruta o fecha"
            placeholder="N° de documento o ruta"
            value={busqueda}
            onChange={event => buscar(event.target.value)}
          />
          {busqueda && <button type="button" onClick={() => buscar('')} aria-label="Limpiar búsqueda"><X size={13} /></button>}
        </div>
      )}
      {buscando && <p className={styles.results} role="status">{resultados} {resultados === 1 ? 'viaje encontrado' : 'viajes encontrados'}</p>}
      <div className={styles.scroll}>
        {grupos.length === 0 ? (
          <p className={styles.empty}>{buscando ? 'No hay documentos que coincidan. Prueba con otro número o ruta.' : 'Los PDF de tus viajes aparecerán aquí cuando los adjuntes.'}</p>
        ) : (
          <ul className={styles.years}>
            {grupos.map(anio => {
              const abierto = (aniosAbiertos ?? aniosDefecto).has(anio.key);
              return (
                <li key={anio.key}>
                  <button
                    type="button" className={styles.year}
                    aria-expanded={abierto} aria-controls={`${id}-${anio.key}`}
                    onClick={() => setAniosAbiertos(prev => alternar(prev, aniosDefecto, anio.key))}
                  >
                    <ChevronRight size={12} className={styles.chevron} data-open={abierto} aria-hidden="true" />
                    <span>{anio.key === 'sin-fecha' ? 'Sin fecha' : anio.key}</span>
                    <span className={styles.count}>{anio.archivos} PDF</span>
                  </button>
                  <ul id={`${id}-${anio.key}`} hidden={!abierto} className={styles.months}>
                    {anio.meses.map(mes => {
                      const abiertoMes = (mesesAbiertos ?? mesesDefecto).has(mes.key);
                      const Icon = abiertoMes ? FolderOpen : Folder;
                      return (
                        <li key={mes.key}>
                          <button
                            type="button" className={styles.month} data-open={abiertoMes}
                            aria-expanded={abiertoMes} aria-controls={`${id}-${mes.key}-viajes`}
                            onClick={() => setMesesAbiertos(prev => alternar(prev, mesesDefecto, mes.key))}
                          >
                            <ChevronRight size={11} className={styles.chevron} data-open={abiertoMes} aria-hidden="true" />
                            <Icon size={15} className={styles.folder} aria-hidden="true" />
                            <span className={styles.monthName}>{mes.key === 'sin-fecha' ? 'Sin fecha' : format(new Date(`${mes.key}-01T12:00:00`), 'MMMM', { locale: es })}</span>
                            <span className={styles.count}>{mes.viajes.length} {mes.viajes.length === 1 ? 'viaje' : 'viajes'}</span>
                          </button>
                          <ul id={`${id}-${mes.key}-viajes`} hidden={!abiertoMes} className={styles.trips}>
                            {mes.viajes.map(({ viaje, fecha }) => (
                              <li key={viaje.id} className={styles.trip}>
                                <div className={styles.tripHeading}>
                                  <time dateTime={fecha ?? undefined}>{fecha ? format(new Date(`${fecha}T12:00:00`), 'dd MMM', { locale: es }) : 'Sin fecha'}</time>
                                  {viaje.cadena && <span className={styles.chain}>{viaje.cadena}</span>}
                                </div>
                                <p className={styles.route}>{viaje.descripcion || 'Viaje sin descripción'}</p>
                                <div className={styles.documents}>
                                  {(['guia', 'factura', 'detraccion'] as const).map(tipo => {
                                    const nombre = tipo === 'guia' ? 'Guía' : tipo === 'factura' ? 'Factura' : 'Detracción';
                                    const driveId = tipo === 'guia' ? viaje.drive_id_guia : tipo === 'factura' ? viaje.drive_id_factura : viaje.drive_id_detraccion;
                                    const numero = tipo === 'detraccion' ? (driveId ? 'Constancia' : '') : formatDoc(tipo === 'guia' ? viaje.numero_guia : viaje.numero_factura);
                                    return driveId ? (
                                      <button
                                        key={tipo} type="button" className={styles.document} data-type={tipo}
                                        title={`Abrir ${nombre.toLowerCase()} ${numero} · ${viaje.descripcion}`}
                                        aria-label={`Abrir ${nombre.toLowerCase()} ${numero} del viaje ${fecha ?? 'sin fecha'} ${viaje.descripcion}`}
                                        onClick={() => setPreview({ driveId, label: `${nombre}${numero ? ` ${numero}` : ''} · ${viaje.descripcion}` })}
                                      >
                                        <IconoPdf size={13} />
                                        <span className={styles.docType}>{nombre}</span>
                                        <span className={styles.docNumber}>{numero || 'Ver PDF'}</span>
                                      </button>
                                    ) : (
                                      <div key={tipo} className={styles.missing} title={numero ? `${nombre} ${numero}: PDF sin adjuntar` : `${nombre}: sin adjuntar`}>
                                        <span>{nombre}</span>
                                        <span>{numero ? 'Sin PDF' : 'Sin adjuntar'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {preview && <DrivePreviewModal driveId={preview.driveId} label={preview.label} onClose={() => setPreview(null)} />}
    </section>
  );
}
