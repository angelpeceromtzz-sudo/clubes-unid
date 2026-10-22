import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { TIPOS_FECHA, CONCEPTOS_CALENDARIO } from '../../../constants/tiposFecha';
import { useCalendarioAcademico } from '../../../hooks/useCalendarioAcademico';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { SimboloFecha } from '../../calendario/SimboloFecha';
import { fechaHoyCampus } from '../../../utils/fechas';
import { fechaEvento, periodoFechaAcademica } from '../../../utils/calendario';
import { api } from '../../../services/api';
import { Icono } from '../../ui/Icono';

const FORM_VACIO = { titulo: '', tipo_fecha: 'academico', fecha_inicio: '', fecha_fin: '', nota: '', mostrar_en_mural: false };

export function SeccionCalendarioAdmin() {
  const gestor = useCalendarioAcademico(true);
  const [parametros, setParametros] = useSearchParams();
  const { tema, modoOscuro, cardCls, inputCls } = useTheme();
  const [form, setForm] = useState(() => ({ ...FORM_VACIO, fecha_inicio: fechaHoyCampus() }));
  const [periodo, setPeriodo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [pendienteEliminar, setPendienteEliminar] = useState(null);
  const conceptoRef = useRef(null);
  const formularioRef = useRef(null);
  const fechas = useMemo(() => gestor.fechas
    .filter((item) => item.titulo.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')))
    .sort((a, b) => fechaEvento(a.fecha_inicio).localeCompare(fechaEvento(b.fecha_inicio)) || a.id_fecha - b.id_fecha), [gestor.fechas, busqueda]);
  const labelCls = `block text-xs font-semibold mb-1.5 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`;

  function cambiar(evento) {
    const { name, value } = evento.target;
    const concepto = name === 'titulo' && CONCEPTOS_CALENDARIO.find((item) => item.titulo.toLocaleLowerCase('es') === value.toLocaleLowerCase('es'));
    setForm((actual) => ({ ...actual, [name]: value, ...(concepto ? { tipo_fecha: concepto.tipo } : {}) }));
  }

  function limpiar() {
    setEditando(null);
    setPeriodo(false);
    setForm((actual) => ({ ...FORM_VACIO, fecha_inicio: actual.fecha_inicio }));
    setError('');
  }

  const editar = useCallback((publicacion) => {
    setEditando(publicacion);
    setPeriodo(!!publicacion.fecha_fin);
    setForm({ titulo: publicacion.titulo, tipo_fecha: publicacion.tipo_fecha, fecha_inicio: fechaEvento(publicacion.fecha_inicio), fecha_fin: fechaEvento(publicacion.fecha_fin), nota: publicacion.nota || '', mostrar_en_mural: !!publicacion.mostrar_en_mural });
    setError('');
    setMensaje('');
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    conceptoRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const id = parametros.get('editar_fecha');
    if (!id || gestor.cargando || gestor.errorCarga) return;
    const fecha = gestor.fechas.find((item) => String(item.id_fecha) === id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fecha) editar(fecha);
    setParametros((actuales) => { const nuevos = new URLSearchParams(actuales); nuevos.delete('editar_fecha'); return nuevos; }, { replace: true });
  }, [parametros, setParametros, gestor.cargando, gestor.errorCarga, gestor.fechas, editar]);

  async function guardar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setError('');
    setMensaje('');
    if (!form.titulo.trim() || !form.fecha_inicio) { setError('Escribe el concepto y elige una fecha.'); return; }
    if (periodo && (!form.fecha_fin || form.fecha_fin < form.fecha_inicio)) { setError('Elige una fecha de fin igual o posterior al inicio.'); return; }
    setEnviando(true);
    try {
      const datos = { titulo: form.titulo.trim(), nota: form.nota.trim() || null, tipo_fecha: form.tipo_fecha,
        fecha_inicio: form.fecha_inicio, fecha_fin: periodo ? form.fecha_fin : null,
        publicada: editando ? editando.publicada : true, mostrar_en_mural: form.mostrar_en_mural };
      const resultado = editando ? await api.updateFechaCalendario(editando.id_fecha, datos) : await api.createFechaCalendario(datos);
      gestor.incorporarFecha(resultado);
      setMensaje(editando ? 'Fecha actualizada.' : 'Fecha agregada al calendario. Puedes capturar la siguiente.');
      limpiar();
      requestAnimationFrame(() => conceptoRef.current?.focus());
    } catch (err) { setError(err.status === 404 ? 'El servicio de fechas académicas aún no está disponible en el servidor.' : err.message); }
    finally { setEnviando(false); }
  }

  async function cambiarVisibilidad(publicacion) {
    if (enviando) return;
    setEnviando(true);
    setError('');
    try {
      const resultado = await api.updateFechaCalendario(publicacion.id_fecha, { publicada: !publicacion.publicada });
      gestor.incorporarFecha(resultado);
      if (editando?.id_fecha === publicacion.id_fecha) setEditando(resultado);
      setMensaje(resultado.publicada ? 'La fecha ya es visible en el calendario.' : 'Fecha oculta del calendario.');
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  async function eliminarFecha() {
    if (enviando || !pendienteEliminar) return;
    setEnviando(true);
    setError('');
    try {
      await api.deleteFechaCalendario(pendienteEliminar.id_fecha);
      gestor.quitarFecha(pendienteEliminar.id_fecha);
      if (editando?.id_fecha === pendienteEliminar.id_fecha) limpiar();
      setPendienteEliminar(null);
      setMensaje('Fecha académica eliminada.');
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <section className="max-w-5xl" aria-labelledby="titulo-calendario-admin">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div><h2 id="titulo-calendario-admin" className={`text-xl font-black ${tema.title}`}>Calendario académico</h2><p className={`text-sm mt-1 ${tema.subtitle}`}>Un concepto, una fecha. Así de fácil.</p></div>
        <Link to="/calendario" className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border ${cardCls}`}><Icono nombre="calendar" className="h-4 w-4" />Ver calendario</Link>
      </div>
      <form ref={formularioRef} onSubmit={guardar} className={`rounded-2xl border p-4 sm:p-5 mb-6 ${cardCls}`} aria-label={editando ? 'Editar fecha académica' : 'Agregar fecha académica'}>
        <fieldset disabled={enviando}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h3 className={`text-sm font-bold ${tema.title}`}>{editando ? 'Editar fecha' : 'Agregar fecha'}</h3><label className={`flex items-center gap-2 text-xs cursor-pointer ${tema.subtitle}`}><input type="checkbox" checked={periodo} onChange={(evento) => setPeriodo(evento.target.checked)} className="accent-amber-400" />Es un periodo</label></div>
          <div className={`grid gap-3 ${periodo ? 'sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]'}`}>
            <label className={labelCls}>Concepto<input ref={conceptoRef} list="conceptos-calendario" name="titulo" value={form.titulo} onChange={cambiar} required maxLength={200} placeholder="Elige o escribe un concepto" autoComplete="off" className={`${inputCls} mt-1.5`} /><datalist id="conceptos-calendario">{CONCEPTOS_CALENDARIO.map((item) => <option key={item.titulo} value={item.titulo} />)}</datalist></label>
            <label className={labelCls}>Símbolo<select aria-label="Símbolo" name="tipo_fecha" value={form.tipo_fecha} onChange={cambiar} className={`${inputCls} mt-1.5`}>{TIPOS_FECHA.map((item) => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}</select></label>
            <label className={labelCls}>{periodo ? 'Desde' : 'Fecha'}<input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={cambiar} required className={`${inputCls} mt-1.5 min-w-0`} /></label>
            {periodo && <label className={labelCls}>Hasta<input type="date" name="fecha_fin" value={form.fecha_fin} onChange={cambiar} min={form.fecha_inicio} required className={`${inputCls} mt-1.5 min-w-0`} /></label>}
          </div>
          <details className="mt-3"><summary className={`text-xs cursor-pointer w-fit ${tema.subtitle}`}>Agregar nota (opcional)</summary><label className="block mt-3"><span className={labelCls}>Nota</span><textarea name="nota" value={form.nota} onChange={cambiar} rows={2} placeholder="Ej. Solo turno vespertino" className={`${inputCls} resize-y`} /></label></details>
          <label className={`mt-4 flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer ${modoOscuro ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50/80'}`}><input type="checkbox" checked={form.mostrar_en_mural} onChange={(evento) => setForm((actual) => ({ ...actual, mostrar_en_mural: evento.target.checked }))} className="mt-0.5 accent-blue-500" /><span><span className={`block text-xs font-bold ${tema.title}`}>Mostrar también en el mural</span><span className={`block text-[11px] mt-0.5 leading-relaxed ${tema.subtitle}`}>Aparecerá como una tarjeta informativa junto con las noticias y eventos.</span></span></label>
          <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
            {editando && <button type="button" onClick={limpiar} className={`text-xs font-bold px-3 py-2 cursor-pointer ${tema.btnInactive}`}>Cancelar edición</button>}
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 cursor-pointer disabled:opacity-50"><Icono nombre={editando ? 'check' : 'plus'} className="h-4 w-4" />{enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar al calendario'}</button>
          </div>
        </fieldset>
      </form>
      {error && <p role="alert" className="text-sm text-red-500 mb-4">{error}</p>}
      {gestor.errorCarga && <p role="alert" className="text-sm text-red-500 mb-4">{gestor.errorCarga} <button type="button" onClick={gestor.cargar} className="underline cursor-pointer">Reintentar</button></p>}
      {mensaje && <p role="status" className={`text-sm mb-4 ${modoOscuro ? 'text-emerald-300' : 'text-emerald-700'}`}>{mensaje}</p>}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-3"><h3 className={`text-sm font-bold ${tema.title}`}>Conceptos y fechas</h3><input aria-label="Buscar concepto" placeholder="Buscar concepto…" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} className={`${inputCls} !w-full sm:!w-64 !py-2 !text-xs`} /></div>
      <div role="table" aria-label="Fechas del calendario académico" className={`rounded-2xl border overflow-hidden ${cardCls}`}>
        <div role="row" className={`hidden sm:grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_150px] gap-4 px-5 py-3 text-xs font-bold ${modoOscuro ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-50 text-slate-500'}`}><span role="columnheader">Concepto</span><span role="columnheader">Fecha o periodo</span><span role="columnheader" className="text-right">Acciones</span></div>
        {gestor.cargando ? <p className={`p-6 text-sm ${tema.subtitle}`}>Cargando fechas…</p> : fechas.length === 0 ? <p className={`p-6 text-sm text-center ${tema.subtitle}`}>{busqueda ? 'No hay conceptos que coincidan.' : 'Agrega tu primera fecha para comenzar el calendario.'}</p> : fechas.map((item) => <div role="row" key={item.id_fecha} className={`grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_150px] items-center gap-2 sm:gap-4 px-4 sm:px-5 py-4 border-t ${modoOscuro ? 'border-slate-800/70' : 'border-slate-100'}`}>
          <div role="cell" className={`flex items-center gap-3 min-w-0 ${!item.publicada ? 'opacity-50' : ''}`}><SimboloFecha tipo={item.tipo_fecha} /><span className={`text-sm font-semibold break-words ${tema.title}`}>{item.titulo}{!item.publicada && <span className={`block text-[10px] font-normal mt-1 ${tema.subtitle}`}>Oculta</span>}</span></div>
          <div role="cell" className={`pl-9 sm:pl-0 text-xs leading-relaxed ${tema.subtitle}`}>{periodoFechaAcademica(item)}</div>
          <div role="cell" className="flex gap-1 sm:justify-end pl-7 sm:pl-0"><button type="button" disabled={enviando} onClick={() => editar(item)} aria-label={`Editar ${item.titulo}`} className={`p-2 cursor-pointer ${tema.btnInactive}`}><Icono nombre="edit" className="h-4 w-4" /></button><button type="button" disabled={enviando} onClick={() => cambiarVisibilidad(item)} className={`text-xs font-semibold px-2 py-2 cursor-pointer ${tema.btnInactive}`}>{item.publicada ? 'Ocultar' : 'Mostrar'}</button><button type="button" disabled={enviando} onClick={() => setPendienteEliminar(item)} aria-label={`Eliminar ${item.titulo}`} className="text-slate-400 hover:text-red-500 p-2 cursor-pointer"><Icono nombre="trash" className="h-4 w-4" /></button></div>
        </div>)}
      </div>
      <ModalConfirmacion show={!!pendienteEliminar} titulo="Eliminar fecha académica" mensaje={`¿Eliminar "${pendienteEliminar?.titulo || ''}" del calendario?`} textoConfirmar="Eliminar fecha" varianteDanger cargando={enviando} onConfirmar={eliminarFecha} onCancelar={() => { if (!enviando) setPendienteEliminar(null); }} />
    </section>
  );
}
