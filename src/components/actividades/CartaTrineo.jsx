import { useState } from 'react';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { BotonAccion } from '../ui/BotonAccion';

const normalizar = (valor) => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function ResumenCartaTrineo({ carta, onRecibir }) {
  const { tema } = useTheme();
  if (!carta) return null;
  return <section aria-label="Carta del Trineo" className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
    <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Carta #{carta.id_carta}</p>
    <h4 className={'font-bold ' + tema.title}>{carta.nombre} · {carta.edad} años</h4>
    <p className="whitespace-pre-wrap break-words text-sm">{carta.deseo}</p>
    {carta.estado && <p className="text-sm font-semibold">{carta.estado === 'entregada' ? 'Regalo recibido' : carta.estado === 'cancelada' ? 'Reserva liberada' : 'Carta reservada'}</p>}
    {carta.cancelada_en && <p className={'text-xs ' + tema.subtitle}>Liberada el {new Date(carta.cancelada_en).toLocaleString('es-MX', { timeZone: 'America/Merida' })}.</p>}
    {carta.recibida_en && <p className={'text-xs ' + tema.subtitle}>Recibido el {new Date(carta.recibida_en).toLocaleString('es-MX', { timeZone: 'America/Merida' })}{carta.recibida_por_nombre ? ' por ' + carta.recibida_por_nombre : ''}.</p>}
    {carta.estado === 'reservada' && onRecibir && <BotonAccion variant="outline" size="sm" onClick={onRecibir}>Confirmar recepción del regalo</BotonAccion>}
  </section>;
}

export function SelectorCartaTrineo({ idEdicion, actual, seleccionada, onSeleccionar, bloqueada, obligatoria = true, version = 0 }) {
  const { usuario } = useAutenticacion();
  const { tema, labelCls, inputCls } = useTheme();
  const { datos, cargando, error, recargar } = useActividadRecurso('/ediciones/' + idEdicion + '/cartas', (usuario.id_usuario || usuario.id) + ':' + version, 30000);
  const [busqueda, setBusqueda] = useState('');
  const consulta = normalizar(busqueda);
  const cartas = (datos?.cartas || []).filter((carta) => carta.id_carta !== actual?.id_carta && normalizar(carta.nombre + ' ' + carta.id_carta).includes(consulta));
  return <fieldset className="space-y-4" disabled={bloqueada}>
     <legend className={'mb-2 text-lg font-bold ' + tema.title}>Carta de regalo ({obligatoria ? 'obligatoria' : 'opcional'})</legend>
     <p className={'text-sm ' + tema.subtitle}>{bloqueada ? 'El regalo de esta carta ya fue recibido. Sus datos se conservarán en tu registro.' : 'Busca al niño de la carta que recibiste en el salón. Se reservará exclusivamente para ti al confirmar tu inscripción. El regalo es independiente de las aportaciones para la actividad.' + (!obligatoria ? ' Puedes continuar sin seleccionar una carta.' : '')}</p>
    {seleccionada && <><ResumenCartaTrineo carta={seleccionada} />{seleccionada.estado !== 'entregada' && <p className="text-sm">Puedes elegir otra carta antes de guardar los cambios.</p>}</>}
    {!bloqueada && <>
      <label className={labelCls}>Buscar niño por nombre o número de carta<input className={inputCls} type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre del niño" /></label>
      <BotonAccion variant="outline" size="sm" onClick={recargar}>Actualizar disponibilidad</BotonAccion>
      {actual && seleccionada?.id_carta !== actual.id_carta && <BotonAccion variant="outline" size="sm" onClick={() => onSeleccionar(actual)}>Conservar mi carta actual</BotonAccion>}
      {cargando ? <p role="status">Consultando cartas disponibles…</p> : error ? <p role="alert" className="text-red-600 dark:text-red-400">{error}</p> : <>
        <p role="status" className={'text-sm ' + tema.subtitle}>{cartas.length ? cartas.length + (cartas.length === 1 ? ' carta disponible' : ' cartas disponibles') : consulta ? 'No hay cartas disponibles con ese nombre. Verifica los datos con el encargado.' : 'No hay cartas disponibles en este momento. Consulta al encargado.'}</p>
        <div className="grid max-h-[32rem] gap-3 overflow-y-auto sm:grid-cols-2">{cartas.map((carta) => <article key={carta.id_carta} className={'min-w-0 space-y-3 rounded-xl border p-4 ' + (seleccionada?.id_carta === carta.id_carta ? 'border-amber-400 bg-amber-400/10' : 'border-slate-400/25')}>
          <p className={'text-xs ' + tema.subtitle}>Carta #{carta.id_carta}</p>
          <h4 className="font-bold">{carta.nombre} · {carta.edad} años</h4>
          <p className="whitespace-pre-wrap break-words text-sm">{carta.deseo}</p>
          <BotonAccion size="sm" variant={seleccionada?.id_carta === carta.id_carta ? 'primary' : 'outline'} aria-pressed={seleccionada?.id_carta === carta.id_carta} onClick={() => onSeleccionar(carta)}>{seleccionada?.id_carta === carta.id_carta ? 'Carta seleccionada' : 'Elegir este niño'}</BotonAccion>
        </article>)}</div>
      </>}
    </>}
  </fieldset>;
}
