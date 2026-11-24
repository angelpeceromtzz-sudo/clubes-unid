import { useState } from 'react';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { BotonAccion } from '../ui/BotonAccion';
import { formatearEdadCarta } from '../../utils/edadCarta';

const VACIA = { nombre: '', edad: '', deseo: '' };
const ETIQUETAS = { disponible: 'Disponible', reservada: 'Reservada', entregada: 'Regalo recibido', retirada: 'Retirada' };

export function GestionCartasTrineo({ idEdicion, onActualizar }) {
  const { usuario } = useAutenticacion();
  const { tema, inputCls, labelCls } = useTheme();
  const { datos, cargando, error, recargar } = useActividadRecurso('/gestion/ediciones/' + idEdicion + '/cartas', usuario.id_usuario || usuario.id, 30000);
  const [editada, setEditada] = useState(null);
  const [formulario, setFormulario] = useState(VACIA);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todas');
  const [cartasAbiertas, setCartasAbiertas] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const cartas = datos?.cartas || [];
  const consulta = busqueda.trim().toLocaleLowerCase('es-MX');
  const visibles = cartas.filter((carta) => (estado === 'todas' || estado === carta.estado) && [carta.nombre, carta.id_carta, carta.alumno_nombre, carta.matricula].filter(Boolean).join(' ').toLocaleLowerCase('es-MX').includes(consulta));
  const cambiar = (clave, valor) => setFormulario((actual) => ({ ...actual, [clave]: valor }));
  function limpiar() { setEditada(null); setFormulario(VACIA); }

  async function guardar(evento) {
    evento.preventDefault();
    if (pendiente) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try {
      await actividadService.guardarCarta(idEdicion, editada?.id_carta, { nombre: formulario.nombre, deseo: formulario.deseo, edad: Number(formulario.edad) });
      limpiar(); recargar(); setMensaje('Carta guardada.');
    } catch (fallo) { setErrorOperacion(fallo.mensajeServidor || fallo.message); }
    finally { setPendiente(false); }
  }
  async function alternar(carta) {
    if (pendiente) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try {
      await actividadService.guardarCarta(idEdicion, carta.id_carta, { activa: !carta.activa });
      if (editada?.id_carta === carta.id_carta) limpiar();
      recargar(); setMensaje(carta.activa ? 'Carta retirada de la selección.' : 'Carta disponible nuevamente.');
    } catch (fallo) { setErrorOperacion(fallo.mensajeServidor || fallo.message); }
    finally { setPendiente(false); }
  }

  async function recibir(carta) {
    if (pendiente) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try {
      await actividadService.recibirRegaloCarta(carta.id_reserva);
      recargar(); onActualizar(); setMensaje('Recepción del regalo confirmada.');
    } catch (fallo) { setErrorOperacion(fallo.mensajeServidor || fallo.message); }
    finally { setPendiente(false); }
  }

  return <section aria-label="Cartas del Trineo" className="space-y-5 rounded-xl border border-slate-400/25 p-4 sm:p-5">
    <div className="space-y-2"><h3 className={'text-xl font-bold ' + tema.title}>Cartas de regalo del Trineo</h3><p className={'text-sm ' + tema.subtitle}>Captura los datos de las cartas entregadas en el salón. La carta es {datos?.carta_obligatoria === false ? 'opcional' : 'obligatoria'} para confirmar la inscripción. El regalo se recibe aparte de las aportaciones de comida, globos u otros materiales.</p></div>
    {cargando ? <p role="status">Cargando cartas…</p> : error ? <div role="alert"><p>{error}</p><BotonAccion variant="outline" onClick={recargar}>Volver a intentar</BotonAccion></div> : <>
      <p className="text-sm">{cartas.filter((carta) => carta.estado === 'disponible').length} disponibles · {cartas.filter((carta) => carta.estado === 'reservada').length} reservadas · {cartas.filter((carta) => carta.estado === 'entregada').length} regalos recibidos</p>
      {datos.editable && <form onSubmit={guardar} className="space-y-4 rounded-xl bg-amber-400/5 p-4" aria-label={editada ? 'Editar carta' : 'Agregar carta'}>
        <h4 className="font-bold">{editada ? 'Editar carta #' + editada.id_carta : 'Agregar carta'}</h4>
      {!cartas.length && <p className="text-sm">Captura cartas para que los alumnos puedan elegirlas. La carta de regalo es {datos?.carta_obligatoria === false ? 'opcional' : 'obligatoria'} en esta edición; las aportaciones para la actividad se configuran aparte.</p>}
        <fieldset disabled={pendiente} className="space-y-4">
           <div className="grid gap-4 sm:grid-cols-[1fr_8rem]"><label className={labelCls}>Nombre del niño *<input className={inputCls} required maxLength={150} value={formulario.nombre} onChange={(evento) => cambiar('nombre', evento.target.value)} /></label><label className={labelCls}>Edad *<input className={inputCls} type="number" min={0} max={100} step={1} required value={formulario.edad} onChange={(evento) => cambiar('edad', evento.target.value)} /><span className={'text-xs font-normal ' + tema.subtitle}>Usa 0 para “Menos de 1 año”.</span></label></div>
          <label className={labelCls}>Deseo *<textarea className={inputCls} rows={3} required maxLength={2000} value={formulario.deseo} onChange={(evento) => cambiar('deseo', evento.target.value)} /></label>
          <div className="flex flex-wrap gap-3"><BotonAccion type="submit">{pendiente ? 'Guardando…' : editada ? 'Guardar carta' : 'Agregar carta'}</BotonAccion>{editada && <BotonAccion variant="outline" onClick={limpiar}>Cancelar edición</BotonAccion>}</div>
        </fieldset>
      </form>}
       <div className="grid gap-4 sm:grid-cols-2"><label className={labelCls}>Buscar carta o alumno<input className={inputCls} type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre, matrícula o número de carta" /></label><label className={labelCls}>Estado de la carta<select className={inputCls} value={estado} onChange={(evento) => setEstado(evento.target.value)}><option value="todas">Todas</option>{Object.entries(ETIQUETAS).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></label></div>
       <BotonAccion variant="outline" size="sm" onClick={recargar}>Actualizar cartas</BotonAccion>
       <details open={cartasAbiertas || Boolean(consulta)} onToggle={(evento) => setCartasAbiertas(evento.currentTarget.open)} className="rounded-xl border border-slate-400/25">
         <summary className="cursor-pointer px-4 py-3 font-semibold">Ver cartas ({cartas.length})</summary>
         <div className="space-y-4 p-4">
       {!visibles.length && <p className={tema.subtitle}>{cartas.length ? 'No hay cartas que coincidan con la búsqueda.' : 'Todavía no hay cartas capturadas.'}</p>}
       <div className="grid gap-4 sm:grid-cols-2">{visibles.map((carta) => <article key={carta.id_carta} className="min-w-0 space-y-3 rounded-xl border border-slate-400/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold">Carta #{carta.id_carta}</span><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold">{ETIQUETAS[carta.estado]}</span></div>
          <h4 className="font-bold">{carta.nombre} · {formatearEdadCarta(carta.edad ?? Math.floor(Number(carta.edad_meses || 0) / 12))}</h4><p className="whitespace-pre-wrap break-words text-sm">{carta.deseo}</p>
        {carta.alumno_nombre && <div className="space-y-1 border-t border-slate-400/25 pt-3 text-sm"><p>Alumno: {carta.alumno_nombre} · {carta.matricula}</p><p>Compromiso: regalo de esta carta.</p></div>}
        {datos.editable && carta.estado === 'reservada' && carta.estado_registro === 'confirmado' && <BotonAccion variant="outline" size="sm" disabled={pendiente} onClick={() => recibir(carta)}>Confirmar recepción del regalo</BotonAccion>}
        {carta.recibida_en && <p className={'text-xs ' + tema.subtitle}>Recibido el {new Date(carta.recibida_en).toLocaleString('es-MX', { timeZone: 'America/Merida' })}{carta.recibida_por_nombre ? ' por ' + carta.recibida_por_nombre : ''}.</p>}
         {datos.editable && ['disponible', 'retirada'].includes(carta.estado) && <div className="flex flex-wrap gap-2"><BotonAccion variant="outline" size="sm" disabled={pendiente} onClick={() => { setEditada(carta); setFormulario({ nombre: carta.nombre, edad: carta.edad ?? Math.floor(Number(carta.edad_meses || 0) / 12), deseo: carta.deseo }); setErrorOperacion(''); }}>Editar carta</BotonAccion><BotonAccion variant="outline" size="sm" disabled={pendiente} onClick={() => alternar(carta)}>{carta.activa ? 'Retirar carta' : 'Volver a ofrecer'}</BotonAccion></div>}
       </article>)}</div>
         </div>
       </details>
    </>}
    {mensaje && <p role="status" className="text-emerald-700 dark:text-emerald-300">{mensaje}</p>}
    {errorOperacion && <p role="alert" className="text-red-600 dark:text-red-400">{errorOperacion}</p>}
  </section>;
}
