/* Expediente estudiantil: búsqueda de alumnos y consulta de su historial completo de participación en clubes. */
import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useExpediente } from '../../hooks/useExpediente';
import { api } from '../../services/api';
import { BarraBusquedaUsuarios } from '../admin/BarraBusquedaUsuarios';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { Th, Td } from '../ui/CeldasTabla';
import { EmptyState } from '../ui/EmptyState';
import { formatearNombre, fechaCorta, fechaEventoCorta } from '../../utils/formato';

const COLOR_ESTADO_POSTULACION = {
  'Miembro oficial': 'emerald',
  'Oferta enviada': 'blue',
  Convocado: 'blue',
  Preseleccionado: 'amber',
  'En revisión': 'slate',
  Rechazado: 'red',
};

const COLOR_ASISTENCIA = {
  presente: 'emerald',
  justificado: 'amber',
  ausente: 'red',
};

function Tarjeta({ titulo, valor, detalle }) {
  const { modoOscuro } = useTheme();
  return (
    <div className={`rounded-xl border px-4 py-3 ${modoOscuro ? 'bg-[#18223f] border-slate-700/60' : 'bg-white border-slate-200'}`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{titulo}</p>
      <p className={`text-2xl font-black mt-1 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{valor}</p>
      {detalle && <p className="text-xs text-slate-500 mt-0.5">{detalle}</p>}
    </div>
  );
}

function Bloque({ titulo, descripcion, children }) {
  const { modoOscuro } = useTheme();
  return (
    <section className={`rounded-xl border p-4 ${modoOscuro ? 'bg-[#18223f]/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
      <h3 className={`text-sm font-black uppercase tracking-wider mb-1 ${modoOscuro ? 'text-white' : 'text-slate-800'}`}>{titulo}</h3>
      {descripcion && <p className={`text-xs mb-3 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{descripcion}</p>}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function VistaDetalle({ expediente, onVolver }) {
  const { modoOscuro } = useTheme();
  const { alumno, resumen, membresias, postulaciones, asistencia_por_club, sesiones, actividades_asistencia } = expediente;
  const clubActual = (membresias || []).find((m) => m.estatus === 'activo')?.nombre_club || null;
  const membresiasOrdenadas = [...(membresias || [])].sort((a, b) => {
    if (a.estatus === 'activo' && b.estatus !== 'activo') return -1;
    if (a.estatus !== 'activo' && b.estatus === 'activo') return 1;
    return 0;
  });
  const filaCls = `border-b ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/20' : 'border-slate-100 hover:bg-slate-50'} transition-colors`;

  return (
    <div className="space-y-5">
      <button onClick={onVolver}
        className={`text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-600'} cursor-pointer`}>
        ← Volver a la búsqueda
      </button>

      <div className={`rounded-xl border p-5 ${modoOscuro ? 'bg-[#18223f] border-slate-700/60' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`text-xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{formatearNombre(alumno.nombre_completo)}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {alumno.correo_institucional}
              {alumno.matricula && <> · Matrícula <span className="font-mono">{alumno.matricula}</span></>}
            </p>
            <p className="text-sm text-slate-500">
              {alumno.licenciatura || 'Sin carrera registrada'}
              {alumno.cuatrimestre ? ` · Cuatrimestre ${alumno.cuatrimestre}` : ''}
            </p>
            <p className="text-sm text-slate-500">
              Club actual: <span className="font-medium">{clubActual || 'Sin club activo'}</span>
            </p>
            {alumno.fecha_nacimiento && (
              <p className="text-sm text-slate-500">
                Edad: {Math.floor((Date.now() - new Date(alumno.fecha_nacimiento + 'T00:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años
              </p>
            )}
          </div>
          {alumno.cuenta_desactivada && <Badge texto="Cuenta desactivada" color="red" size="md" />}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tarjeta titulo="Clubes" valor={resumen.clubes_distintos} detalle={`${resumen.membresias_activas} membresía(s) activa(s)`} />
        <Tarjeta titulo="Postulaciones" valor={resumen.total_postulaciones} />
        <Tarjeta titulo="Sesiones" valor={resumen.sesiones_registradas} detalle={`${resumen.sesiones_asistidas} con asistencia`} />
        <Tarjeta
          titulo="Asistencia"
          valor={resumen.porcentaje_asistencia === null ? '—' : `${resumen.porcentaje_asistencia}%`}
          detalle={resumen.primer_registro ? `Desde ${fechaCorta(resumen.primer_registro)}` : 'Sin registros'}
        />
        <Tarjeta titulo="Actividades" valor={resumen.actividades_asistidas ?? 0} detalle={`${resumen.actividades_registradas ?? 0} registro(s)`} />
      </div>

      <Bloque titulo="Membresías en clubes" descripcion="Clubes en los que ha sido o es miembro, con estatus y fechas.">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <Th>Club</Th><Th>Estatus</Th><Th>Ingreso</Th><Th>Baja</Th>
            </tr>
          </thead>
          <tbody>
            {membresiasOrdenadas.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-500">Sin membresías registradas</td></tr>
            )}
            {membresiasOrdenadas.map(m => (
              <tr key={m.id_inscripcion} className={m.estatus === 'activo' ? `border-b ${modoOscuro ? 'border-slate-800/50 bg-emerald-500/5' : 'border-slate-100 bg-emerald-50'} transition-colors` : filaCls}>
                <Td className="font-medium">{m.nombre_club}</Td>
                <Td><Badge texto={m.estatus} color={m.estatus === 'activo' ? 'emerald' : 'slate'} /></Td>
                <Td>{fechaCorta(m.fecha_inscripcion)}</Td>
                <Td>{m.fecha_baja ? fechaCorta(m.fecha_baja) : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>

      <Bloque titulo="Postulaciones" descripcion="Solicitudes de ingreso enviadas a clubes y su estado.">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <Th>Club</Th><Th>Estado</Th><Th>Bloque</Th><Th>Enviada</Th><Th>Observación</Th>
            </tr>
          </thead>
          <tbody>
            {postulaciones.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-slate-500">Sin postulaciones</td></tr>
            )}
            {postulaciones.map(p => (
              <tr key={p.id_formulario} className={filaCls}>
                <Td className="font-medium">{p.nombre_club}</Td>
                <Td><Badge texto={p.status} color={COLOR_ESTADO_POSTULACION[p.status] || 'slate'} /></Td>
                <Td>{p.bloque_asignado}</Td>
                <Td>{fechaCorta(p.fecha_envio)}</Td>
                <Td>{p.motivo_rechazo || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>

      <Bloque titulo="Asistencia por club" descripcion="Resumen de sesiones registradas por club.">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <Th>Club</Th><Th>Sesiones</Th><Th>Presente</Th><Th>Justificada</Th><Th>Ausente</Th><Th>Periodo</Th>
            </tr>
          </thead>
          <tbody>
            {asistencia_por_club.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-slate-500">Sin asistencias registradas</td></tr>
            )}
            {asistencia_por_club.map(a => (
              <tr key={a.id_club} className={filaCls}>
                <Td className="font-medium">{a.nombre_club}</Td>
                <Td>{a.sesiones_registradas}</Td>
                <Td>{a.presentes}</Td>
                <Td>{a.justificadas}</Td>
                <Td>{a.ausentes}</Td>
                <Td>{fechaEventoCorta(a.primera_sesion)} – {fechaEventoCorta(a.ultima_sesion)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>

      <Bloque titulo="Historial de sesiones" descripcion="Detalle de cada sesión registrada.">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <Th>Fecha</Th><Th>Horario</Th><Th>Club</Th><Th>Periodo</Th><Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {sesiones.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-slate-500">Sin sesiones registradas</td></tr>
            )}
            {sesiones.map(s => (
              <tr key={s.id_sesion} className={filaCls}>
                <Td>{fechaEventoCorta(s.fecha)}</Td>
                <Td>{String(s.hora_inicio).slice(0, 5)} – {String(s.hora_fin).slice(0, 5)}</Td>
                <Td>{s.nombre_club}</Td>
                <Td>{s.periodo}</Td>
                <Td>
                  <Badge texto={s.estado} color={COLOR_ASISTENCIA[s.estado] || 'slate'} />
                  {s.estado === 'justificado' && s.motivo_justificacion && (
                    <p className="text-xs text-slate-500 mt-1">{s.motivo_justificacion}</p>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>

      <Bloque titulo="Asistencia a actividades" descripcion="Registros y asistencia en actividades.">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <Th>Actividad</Th><Th>Edición</Th><Th>Fecha</Th><Th>Estado</Th><Th>Origen</Th>
            </tr>
          </thead>
          <tbody>
            {(actividades_asistencia || []).length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-slate-500">Sin asistencias a actividades</td></tr>
            )}
            {(actividades_asistencia || []).map(a => (
              <tr key={a.id_registro} className={filaCls}>
                <Td className="font-medium">{a.actividad}</Td>
                <Td>{a.edicion}</Td>
                <Td>{a.fecha_inicio ? fechaEventoCorta(a.fecha_inicio) : '—'}</Td>
                <Td>
                  <Badge texto={a.estado} color={a.estado === 'presente' ? 'emerald' : 'red'} />
                </Td>
                <Td>{a.origen}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>
    </div>
  );
}

export function SeccionExpediente() {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, selectCls } = useTheme();
  const d = useExpediente();
  const [entrada, setEntrada] = useState('');
  const [licenciaturas, setLicenciaturas] = useState([]);
  const [cargandoLicenciaturas, setCargandoLicenciaturas] = useState(false);

  useEffect(() => {
    d.buscar('', d.filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargandoLicenciaturas(true);
    api.getLicenciaturas()
      .then((data) => { if (!cancelado) setLicenciaturas(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelado) setLicenciaturas([]); })
      .finally(() => { if (!cancelado) setCargandoLicenciaturas(false); });
    return () => { cancelado = true; };
  }, []);

  function enviarBusqueda(e) {
    if (e) e.preventDefault();
    d.buscar(entrada, d.filtros);
  }

  function cambiarFiltro(cambios) {
    const siguientes = { ...d.filtros, ...cambios };
    d.actualizarFiltros(siguientes);
    if (entrada.trim().length === 0 || entrada.trim().length >= 3) {
      d.buscar(entrada, siguientes);
    }
  }

  if (d.cargandoExpediente) return <Spinner className="py-10" />;

  if (d.expediente) {
    return <VistaDetalle expediente={d.expediente} onVolver={d.volver} />;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={enviarBusqueda} className="flex flex-col sm:flex-row gap-3 mb-4">
        <BarraBusquedaUsuarios
          busqueda={entrada}
          onChange={setEntrada}
          placeholder="Buscar por nombre, matrícula o correo..."
        />
        <div className="flex-1 sm:flex-none">
          <select
            value={d.filtros.id_licenciatura}
            onChange={e => cambiarFiltro({ id_licenciatura: e.target.value })}
            disabled={false}
            aria-label="Filtrar por licenciatura"
            className={`w-full sm:w-72 px-1.5 py-0.5 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-amber-400/50 ${selectCls}`}
          >
            <option value="">Todas las licenciaturas</option>
            <optgroup label="Escolarizadas">
              {licenciaturas.filter((l) => l.modalidad === 'escolarizada').map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Ejecutivas">
              {licenciaturas.filter((l) => l.modalidad === 'ejecutiva').map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Duales">
              {licenciaturas.filter((l) => l.modalidad === 'dual').map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Maestrías">
              {licenciaturas.filter((l) => l.modalidad === 'maestria').map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="flex-1 sm:flex-none">
          <select
            value={d.filtros.orden || ''}
            onChange={e => cambiarFiltro({ orden: e.target.value })}
            aria-label="Ordenar resultados"
            className={`w-full sm:w-48 px-1.5 py-0.5 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-amber-400/50 ${selectCls}`}
          >
            <option value="">Nombre (A–Z)</option>
            <option value="registros_desc">Más registros primero</option>
          </select>
        </div>
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>

      {d.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400 font-medium">{d.error}</p>
        </div>
      )}

      {d.buscando ? (
        <Spinner className="py-10" />
      ) : d.resultados.length === 0 && d.termino.trim().length === 0 ? (
        <EmptyState icono="users" titulo="Sin alumnos con registros" descripcion="Aún no hay alumnos o responsables con datos en su expediente." />
      ) : d.resultados.length === 0 ? (
        <EmptyState icono="users" titulo="Sin resultados" descripcion="Revisa el texto escrito e intenta de nuevo." />
      ) : (
        <>
        <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
          <div className="overflow-x-auto">
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Matrícula</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Licenciatura</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Correo</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Registros</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Cuenta</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}></th>
              </tr>
            </thead>
            <tbody>
              {d.resultados.map(a => (
                <tr key={a.id_usuario} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-5 py-4 font-medium ${tdTitle}`}>{formatearNombre(a.nombre_completo)}</td>
                  <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{a.matricula || a.institutional_id || '—'}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{a.licenciatura || '—'}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{a.correo_institucional}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{a.total_registros ?? 0}</td>
                  <td className="px-5 py-4">{a.cuenta_desactivada ? <Badge texto="Desactivada" color="red" /> : <Badge texto="Activa" color="emerald" />}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => d.seleccionar(a.id_usuario)}
                      className="text-xs font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 cursor-pointer">
                      Ver expediente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="space-y-2 md:hidden">
          {d.resultados.map(a => (
            <div key={a.id_usuario} className={`${tableBg} rounded-xl border p-3`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className={`text-sm font-semibold ${tdTitle}`}>{formatearNombre(a.nombre_completo)}</p>
                {a.cuenta_desactivada ? <Badge texto="Desactivada" color="red" /> : <Badge texto="Activa" color="emerald" />}
              </div>
              <p className={`text-xs mb-2 ${tdCls}`}>{a.correo_institucional}</p>
              <div className={`grid grid-cols-2 gap-2 text-xs ${tdCls}`}>
                <span>Matrícula: <strong>{a.matricula || a.institutional_id || '—'}</strong></span>
                <span>Registros: <strong>{a.total_registros ?? 0}</strong></span>
                <span className="col-span-2">Licenciatura: <strong>{a.licenciatura || '—'}</strong></span>
              </div>
              <button onClick={() => d.seleccionar(a.id_usuario)} className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 cursor-pointer">
                Ver expediente
              </button>
            </div>
          ))}
        </div>
          <p className="text-xs text-slate-500 mt-2">{d.resultados.length} resultado(s), máximo 25. Afina la búsqueda si no aparece el alumno.</p>
        </>
      )}
    </div>
  );
}
