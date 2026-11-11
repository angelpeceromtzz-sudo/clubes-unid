/* Expediente estudiantil: búsqueda de alumnos y consulta de su historial completo de participación en clubes. */
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useExpediente } from '../../hooks/useExpediente';
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

function Bloque({ titulo, children }) {
  const { modoOscuro } = useTheme();
  return (
    <section className={`rounded-xl border p-4 ${modoOscuro ? 'bg-[#18223f]/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
      <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-800'}`}>{titulo}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function VistaDetalle({ expediente, onVolver }) {
  const { modoOscuro } = useTheme();
  const { alumno, resumen, membresias, postulaciones, asistencia_por_club, sesiones } = expediente;
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
          </div>
          {alumno.cuenta_desactivada && <Badge texto="Cuenta desactivada" color="red" size="md" />}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta titulo="Clubes" valor={resumen.clubes_distintos} detalle={`${resumen.membresias_activas} membresía(s) activa(s)`} />
        <Tarjeta titulo="Postulaciones" valor={resumen.total_postulaciones} />
        <Tarjeta titulo="Sesiones" valor={resumen.sesiones_registradas} detalle={`${resumen.sesiones_asistidas} con asistencia`} />
        <Tarjeta
          titulo="Asistencia"
          valor={resumen.porcentaje_asistencia === null ? '—' : `${resumen.porcentaje_asistencia}%`}
          detalle={resumen.primer_registro ? `Desde ${fechaCorta(resumen.primer_registro)}` : 'Sin registros'}
        />
      </div>

      <Bloque titulo="Membresías en clubes">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <Th>Club</Th><Th>Estatus</Th><Th>Ingreso</Th><Th>Baja</Th>
            </tr>
          </thead>
          <tbody>
            {membresias.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-500">Sin membresías registradas</td></tr>
            )}
            {membresias.map(m => (
              <tr key={m.id_inscripcion} className={filaCls}>
                <Td className="font-medium">{m.nombre_club}</Td>
                <Td><Badge texto={m.estatus} color={m.estatus === 'activo' ? 'emerald' : 'slate'} /></Td>
                <Td>{fechaCorta(m.fecha_inscripcion)}</Td>
                <Td>{m.fecha_baja ? fechaCorta(m.fecha_baja) : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>

      <Bloque titulo="Postulaciones">
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

      <Bloque titulo="Asistencia por club">
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

      <Bloque titulo="Historial de sesiones">
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
    </div>
  );
}

export function SeccionExpediente() {
  const { modoOscuro } = useTheme();
  const d = useExpediente();
  const [entrada, setEntrada] = useState('');

  function enviarBusqueda(e) {
    e.preventDefault();
    d.buscar(entrada);
  }

  if (d.cargandoExpediente) return <Spinner className="py-10" />;

  if (d.expediente) {
    return <VistaDetalle expediente={d.expediente} onVolver={d.volver} />;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={enviarBusqueda} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Buscar alumno</label>
          <input type="text" value={entrada} onChange={e => setEntrada(e.target.value)}
            placeholder="Nombre, matrícula o correo (mín. 3 caracteres)"
            className={`${modoOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 w-80`} />
        </div>
        <button type="submit" disabled={d.buscando}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer">
          Buscar
        </button>
      </form>

      {d.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400 font-medium">{d.error}</p>
        </div>
      )}

      {d.buscando ? (
        <Spinner className="py-10" />
      ) : d.termino.trim().length < 3 ? (
        <EmptyState icono="users" titulo="Busca un alumno" descripcion="Escribe su nombre, matrícula o correo institucional para ver su trayectoria." />
      ) : d.resultados.length === 0 ? (
        <EmptyState icono="users" titulo="Sin resultados" descripcion="Revisa el texto escrito e intenta de nuevo." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <Th>Nombre</Th><Th>Matrícula</Th><Th>Correo</Th><Th>Cuenta</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {d.resultados.map(a => (
                <tr key={a.id_usuario} className={`border-b ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/20' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <Td className="font-medium">{formatearNombre(a.nombre_completo)}</Td>
                  <Td className="font-mono text-xs">{a.matricula || a.institutional_id || '—'}</Td>
                  <Td>{a.correo_institucional}</Td>
                  <Td>{a.cuenta_desactivada ? <Badge texto="Desactivada" color="red" /> : <Badge texto="Activa" color="emerald" />}</Td>
                  <Td>
                    <button onClick={() => d.seleccionar(a.id_usuario)}
                      className="text-xs font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 cursor-pointer">
                      Ver expediente
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">{d.resultados.length} resultado(s), máximo 25. Afina la búsqueda si no aparece el alumno.</p>
        </div>
      )}
    </div>
  );
}
