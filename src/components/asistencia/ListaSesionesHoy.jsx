/* Tarjetas de las sesiones de hoy del club (PBI-05 §26.1) — Mobile First.
   Cada sesión aparece individualmente; varias sesiones del día son independientes (§7). */
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Badge } from '../ui/Badge';
import { BotonAccion } from '../ui/BotonAccion';
import { fechaLarga, rangoHoras } from '../../utils/fechas';
import { ESTADOS_SESION } from './constantesAsistencia';

export function ListaSesionesHoy({ sesiones, club, onTomarAsistencia, onCancelarSesion, cargandoId }) {
  const { modoOscuro, tema } = useTheme();

  if (!sesiones || sesiones.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${modoOscuro ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <Icono nombre="calendar" className={`h-7 w-7 ${tema.iconColor}`} strokeWidth={1.5} />
        </div>
        <p className={`text-sm font-bold ${tema.title}`}>Sin sesiones hoy</p>
        <p className={`text-xs mt-1 ${tema.subtitle}`}>
          No hay sesiones programadas para hoy según el horario oficial del club.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sesiones.map((sesion) => {
        const info = ESTADOS_SESION[sesion.estado] || ESTADOS_SESION.pendiente;
        const registradas = parseInt(sesion.registradas, 10) || 0;
        const total = parseInt(sesion.total_integrantes, 10) || 0;
        const cargando = cargandoId === sesion.id_sesion;

        return (
          <div
            key={sesion.id_sesion}
            className={`rounded-2xl border p-5 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-base font-black ${tema.title}`}>{club?.nombre_club || 'Club'}</p>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  Hoy · {fechaLarga(sesion.fecha)}
                </p>
                <p className={`text-sm mt-1 ${tema.subtitle}`}>
                  {rangoHoras(sesion.hora_inicio, sesion.hora_fin)}
                </p>
                {sesion.lugar && (
                  <p className={`text-xs mt-0.5 ${tema.subtitle}`}>{sesion.lugar}</p>
                )}
              </div>
              <Badge texto={info.label} color={info.color} size="md" />
            </div>

            <p className={`text-xs mt-3 ${tema.subtitle}`}>
              {total} integrante{total !== 1 ? 's' : ''} en la lista
              {registradas > 0 ? ` · ${registradas} registrado(s)` : ''}
            </p>

            {sesion.estado === 'cancelada' && sesion.motivo_cancelacion && (
              <p className="text-xs text-red-400 mt-2">
                Motivo: {sesion.motivo_cancelacion}
              </p>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <BotonAccion
                className="flex-1"
                size="lg"
                disabled={sesion.estado === 'cancelada' || cargando}
                onClick={() => onTomarAsistencia(sesion)}
              >
                {sesion.estado === 'pendiente' ? (
                  <>
                    <Icono nombre="clipboard" className="h-4 w-4" strokeWidth={2} />
                    Tomar asistencia
                  </>
                ) : sesion.estado === 'en_progreso' ? (
                  <>
                    <Icono nombre="pencil" className="h-4 w-4" strokeWidth={2} />
                    Continuar asistencia
                  </>
                ) : (
                  <>
                    <Icono nombre="eye" className="h-4 w-4" strokeWidth={2} />
                    Ver / corregir
                  </>
                )}
              </BotonAccion>

              {sesion.estado === 'pendiente' && (
                <BotonAccion
                  variant="danger"
                  size="lg"
                  className="sm:w-auto"
                  onClick={() => onCancelarSesion(sesion)}
                >
                  <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
                  Cancelar sesión
                </BotonAccion>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
