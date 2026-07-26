/* Calendario semanal de horarios de entrenamiento del club. */
import { useState, useEffect, useMemo } from 'react';
import { Icono } from '../../ui/Icono';
import { Spinner } from '../../ui/Spinner';
import { BotonAccion } from '../../ui/BotonAccion';
import { api } from '../../../services/api';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const HORA_MIN_DEFAULT = 7;
const HORA_MAX_DEFAULT = 22;
const ROW_HEIGHT = 56;

function horaStr(h) { return h?.slice(0, 5) || '00:00'; }

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function HorariosClub({ club, modoOscuro, esAdmin, esPresidente }) {
  const puedeVer = esAdmin || esPresidente;

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    dias_semana: [],
    hora_inicio: '09:00',
    hora_fin: '11:00',
    lugar: '',
    ubicacion_maps: '',
    descripcion: '',
  });

  useEffect(() => {
    if (club?.id_club) cargarHorarios();
  }, [club?.id_club]);

  async function cargarHorarios() {
    try {
      const data = await api.getHorarios(club.id_club);
      setHorarios(data);
    } catch { setHorarios([]); }
    finally { setCargando(false); }
  }

  const { horaMin, horaMax } = useMemo(() => {
    if (!horarios.length) return { horaMin: HORA_MIN_DEFAULT, horaMax: HORA_MAX_DEFAULT };
    let min = 24, max = 0;
    horarios.forEach(h => {
      const hi = parseInt(h.hora_inicio?.slice(0, 2) || '12');
      const hf = parseInt(h.hora_fin?.slice(0, 2) || '12');
      if (hi < min) min = hi;
      if (hf > max) max = hf;
    });
    return { horaMin: Math.max(min - 1, 6), horaMax: Math.min(max + 1, 23) };
  }, [horarios]);

  const horas = useMemo(() => {
    const arr = [];
    for (let h = horaMin; h <= horaMax; h++) arr.push(h);
    return arr;
  }, [horaMin, horaMax]);

  function abrirNuevo() {
    setEditando(null);
    setForm({ dias_semana: [], hora_inicio: '09:00', hora_fin: '11:00', lugar: '', ubicacion_maps: '', descripcion: '' });
    setError('');
    setShowForm(true);
  }

  function abrirEditar(h) {
    setEditando(h);
    setForm({
      dias_semana: [h.dia_semana],
      hora_inicio: horaStr(h.hora_inicio),
      hora_fin: horaStr(h.hora_fin),
      lugar: h.lugar || '',
      ubicacion_maps: h.ubicacion_maps || '',
      descripcion: h.descripcion || '',
    });
    setError('');
    setShowForm(true);
  }

  function toggleDia(dia) {
    setForm(prev => {
      const dias = prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia];
      return { ...prev, dias_semana: dias };
    });
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.dias_semana.length || !form.hora_inicio || !form.hora_fin || !form.lugar) return;
    setEnviando(true);
    setError('');
    try {
      if (editando) {
        await api.updateHorario(editando.id_horario, {
          dia_semana: form.dias_semana[0],
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
          lugar: form.lugar,
          ubicacion_maps: form.ubicacion_maps,
          descripcion: form.descripcion,
        });
      } else {
        await api.createHorario(club.id_club, form);
      }
      setShowForm(false);
      await cargarHorarios();
    } catch (err) {
      const msg = err?.message || err?.error || 'Error al guardar';
      setError(msg);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await api.deleteHorario(id);
      await cargarHorarios();
    } catch { /* silently handled */ }
  }

  function getBloquesPorDia(dia) {
    return horarios
      .filter(h => h.dia_semana === dia)
      .map(h => {
        const iniMin = timeToMinutes(horaStr(h.hora_inicio));
        const finMin = timeToMinutes(horaStr(h.hora_fin));
        const top = ((iniMin / 60) - horaMin) * ROW_HEIGHT;
        const height = ((finMin - iniMin) / 60) * ROW_HEIGHT;
        return { ...h, top, height: Math.max(height, ROW_HEIGHT / 2) };
      });
  }

  return (
    <section className={`rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3"
        style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
            <Icono nombre="clock" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-black tracking-tight ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Horario</h2>
            {!cargando && horarios.length === 0 && (
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5
                ${modoOscuro ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                Sin horarios
              </span>
            )}
          </div>
        </div>
        {puedeVer && !showForm && (
          <button onClick={abrirNuevo}
            className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer">
            <Icono nombre="plus" className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Formulario modal */}
      {showForm && (
        <div className="border-b" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
          <form onSubmit={guardar} className="p-5 space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400">
                {error}
              </div>
            )}

            {/* Selector de días */}
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Días de la semana
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {DIAS.map((dia, i) => (
                  <button key={i} type="button" onClick={() => toggleDia(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border
                      ${form.dias_semana.includes(i)
                        ? 'bg-amber-400 text-[#0e162c] border-amber-400'
                        : modoOscuro
                          ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-400/50 hover:text-amber-400'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                      }`}>
                    {DIAS_CORTO[i]}
                  </button>
                ))}
              </div>
            </div>

            {/* Horas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hora inicio
                </label>
                <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} required
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                    ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hora fin
                </label>
                <input type="time" value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })} required
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                    ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
            </div>

            {/* Lugar */}
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Lugar
              </label>
              <input type="text" value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} required
                placeholder="Ej: Cancha 1, Gimnasio..."
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                  ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
            </div>

            {/* Maps */}
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Ubicación Maps <span className="font-normal">(opcional)</span>
              </label>
              <input type="url" value={form.ubicacion_maps} onChange={e => setForm({ ...form, ubicacion_maps: e.target.value })}
                placeholder="https://maps.google.com/?q=..."
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                  ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
            </div>

            {/* Descripción */}
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Notas <span className="font-normal">(opcional)</span>
              </label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                rows={2} placeholder="Instrucciones, material, etc."
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50 resize-none
                  ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
            </div>

            <div className="flex gap-2 pt-1">
              <BotonAccion type="submit" disabled={enviando} variant="primary" size="sm">
                {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Agregar'}
              </BotonAccion>
              <BotonAccion onClick={() => setShowForm(false)} variant="outline" size="sm">Cancelar</BotonAccion>
            </div>
          </form>
        </div>
      )}

      {/* Calendario */}
      {cargando ? (
        <Spinner className="py-12" />
      ) : horarios.length === 0 ? (
        <div className={`rounded-xl border border-dashed m-5 p-8 text-center
          ${modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}>
          <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center
            ${modoOscuro ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
            <Icono nombre="clock" strokeWidth={1.5} className={`h-6 w-6 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-sm font-medium mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            No hay horarios registrados
          </p>
          <p className={`text-xs ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
            {puedeVer ? 'Haz clic en + para crear el primer horario del club.' : 'El presidente aún no ha configurado los horarios.'}
          </p>
        </div>
      ) : (
        <>
          {/* Vista escritorio — tabla semanal */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Encabezado días */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b"
                style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
                <div className={`py-2 px-1 text-center text-[10px] font-bold uppercase ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                  Hora
                </div>
                {DIAS.slice(1, 7).map((dia, i) => {
                  const diaReal = i + 1;
                  const tieneHorarios = horarios.some(h => h.dia_semana === diaReal);
                  return (
                    <div key={diaReal}
                      className={`py-2 px-2 text-center text-xs font-bold uppercase tracking-wider border-l
                        ${tieneHorarios
                          ? 'text-amber-400'
                          : modoOscuro ? 'text-slate-500' : 'text-slate-400'
                        }
                        ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}>
                      {dia}
                    </div>
                  );
                })}
              </div>

              {/* Filas de horas */}
              <div className="relative grid grid-cols-[60px_repeat(7,1fr)]"
                style={{ height: `${horas.length * ROW_HEIGHT}px` }}>
                {/* Labels de hora */}
                {horas.map((h, i) => (
                  <div key={h} className={`absolute left-0 w-[60px] text-right pr-2 text-[10px] font-bold
                    ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}
                    style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`, display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}

                {/* Columnas */}
                {[1, 2, 3, 4, 5, 6].map(dia => (
                  <div key={dia} className={`relative border-l
                    ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}
                    style={{ gridColumn: dia + 1 }}>
                    {/* Líneas de hora */}
                    {horas.map((h, i) => (
                      <div key={h} className={`absolute w-full border-t
                        ${modoOscuro ? 'border-slate-800/50' : 'border-slate-100'}`}
                        style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }} />
                    ))}

                    {/* Bloques de entrenamiento */}
                    {getBloquesPorDia(dia).map(bloque => (
                      <div key={bloque.id_horario}
                        className={`absolute left-1 right-1 rounded-lg border p-2 cursor-pointer transition-all hover:scale-[1.02] hover:z-10 group
                          ${modoOscuro
                            ? 'bg-amber-400/15 border-amber-400/30 hover:bg-amber-400/25'
                            : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                          }`}
                        style={{ top: `${bloque.top + 2}px`, height: `${bloque.height - 4}px` }}
                        title={`${bloque.lugar}${bloque.descripcion ? ' — ' + bloque.descripcion : ''}`}>
                        <p className={`text-[11px] font-bold leading-tight truncate
                          ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`}>
                          {horaStr(bloque.hora_inicio)} – {horaStr(bloque.hora_fin)}
                        </p>
                        <p className={`text-[10px] leading-tight truncate
                          ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                          {bloque.lugar}
                        </p>
                        {bloque.descripcion && (
                          <p className={`text-[9px] leading-tight truncate mt-0.5
                            ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                            {bloque.descripcion}
                          </p>
                        )}

                        {/* Acciones */}
                        {puedeVer && (
                          <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); abrirEditar(bloque); }}
                              className={`p-0.5 rounded transition-colors cursor-pointer
                                ${modoOscuro ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}>
                              <Icono nombre="edit" className="h-3 w-3" strokeWidth={2} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); eliminar(bloque.id_horario); }}
                              className={`p-0.5 rounded transition-colors cursor-pointer
                                ${modoOscuro ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                              <Icono nombre="trash" className="h-3 w-3" strokeWidth={2} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vista móvil — apilada por día */}
          <div className="md:hidden space-y-3 p-4">
            {[1, 2, 3, 4, 5, 6].map(dia => {
              const bloques = horarios.filter(h => h.dia_semana === dia);
              if (!bloques.length) return null;
              return (
                <div key={dia}
                  className={`rounded-xl border overflow-hidden
                    ${modoOscuro ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`px-3 py-2 border-b font-bold text-xs uppercase tracking-wider
                    ${modoOscuro ? 'border-slate-700/50 text-amber-400' : 'border-slate-200 text-amber-600'}`}>
                    {DIAS[dia]}
                  </div>
                  {bloques.map(b => (
                    <div key={b.id_horario}
                      className={`px-3 py-2.5 border-b last:border-b-0 flex items-start justify-between gap-2
                        ${modoOscuro ? 'border-slate-700/30' : 'border-slate-200/60'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Icono nombre="clock" className="h-3 w-3 shrink-0 text-amber-400" strokeWidth={2} />
                          <span className={`text-xs font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                            {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icono nombre="location" className="h-3 w-3 shrink-0 text-amber-400/60" strokeWidth={2} />
                          <span className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{b.lugar}</span>
                        </div>
                        {b.descripcion && (
                          <p className={`text-[10px] mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>{b.descripcion}</p>
                        )}
                        {b.ubicacion_maps && (
                          <a href={b.ubicacion_maps} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 mt-1">
                            <Icono nombre="map-pin" className="h-2.5 w-2.5" strokeWidth={2} /> Maps
                          </a>
                        )}
                      </div>
                      {puedeVer && (
                        <div className="flex gap-1 shrink-0 mt-0.5">
                          <button onClick={() => abrirEditar(b)}
                            className={`p-1 rounded transition-colors cursor-pointer
                              ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                            <Icono nombre="edit" className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button onClick={() => eliminar(b.id_horario)}
                            className={`p-1 rounded transition-colors cursor-pointer
                              ${modoOscuro ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                            <Icono nombre="trash" className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
