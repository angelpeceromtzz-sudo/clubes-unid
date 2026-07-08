import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Alerta } from '../ui/Alerta';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { Badge } from '../ui/Badge';
import { TimelinePostulacion } from '../alumno/TimelinePostulacion';

export function HistorialPostulaciones({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [forms, setForms] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setError('');
      try {
        const data = await api.getAllSolicitudes(club.id_club);
        if (montado) setForms(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  if (cargando) return <Spinner />;

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Historial de Postulaciones"
        subtitulo="Todas las solicitudes enviadas a tu club, incluyendo las realizadas antes de tu gestión."
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {forms.length === 0 ? (
        <EmptyState icono="file" titulo="No hay postulaciones" descripcion="Aún no se han recibido solicitudes para este club." />
      ) : (
        <div className="space-y-4">
          <p className={`text-sm ${tema.subtitle}`}>
            Total: {forms.length} postulación(es)
          </p>
          {forms.map((form) => (
            <div
              key={form.id_formulario}
              className={`rounded-xl p-5 transition-all ${
                modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className={`text-base font-bold ${tema.text}`}>{form.nombre_completo}</h3>
                  <p className="text-xs text-slate-500 font-mono">{form.matricula}</p>
                </div>
                <Badge
                  texto={form.status}
                  color={
                    form.status === 'En revisión' ? 'blue' :
                    form.status === 'Preseleccionado' ? 'purple' :
                    form.status === 'Convocado' ? 'indigo' :
                    form.status === 'Oferta enviada' ? 'emerald' :
                    form.status === 'Miembro oficial' ? 'amber' :
                    form.status === 'Rechazado' ? 'red' : 'slate'
                  }
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Carrera</p>
                  <p className={`text-sm ${tema.text}`}>{form.carrera}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cuatrimestre</p>
                  <p className={`text-sm ${tema.text}`}>{form.cuatrimestre}°</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Turno</p>
                  <p className={`text-sm ${tema.text}`}>{form.turno}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Bloque</p>
                  <p className={`text-sm font-bold ${tema.text}`}>{form.bloque_asignado || '-'}</p>
                </div>
              </div>

              {form.motivo_rechazo && (
                <div className="mb-4 rounded-lg p-3 bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">
                    <span className="font-bold">Motivo de rechazo:</span> {form.motivo_rechazo}
                  </p>
                </div>
              )}

              <div>
                <p className={`text-xs font-bold uppercase tracking-wider text-slate-500 mb-2`}>
                  Línea de tiempo
                </p>
                <TimelinePostulacion historial={form.historial} statusActual={form.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
