import { useState, useRef, useEffect } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { TarjetaPostulacionV2 } from '../../alumno/TarjetaPostulacionV2';

const STATUS_TERMINALES = ['Miembro oficial', 'Rechazado'];

export function SeccionPostulaciones({ postulaciones, onPostulacionesChange }) {
  const { tema } = useTheme();
  const [respondiendo, setRespondiendo] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  async function manejarRespuesta(id, decision) {
    setRespondiendo((prev) => ({ ...prev, [id]: decision }));
    try {
      await api.responderOferta(id, decision);
      if (onPostulacionesChange) onPostulacionesChange();
    } catch (err) {
      alert(err.message);
    } finally {
      if (mountedRef.current) {
        setRespondiendo((prev) => ({ ...prev, [id]: null }));
      }
    }
  }

  if (!postulaciones || postulaciones.length === 0) return null;

  const activas = postulaciones.filter((p) => !STATUS_TERMINALES.includes(p.status));
  const historial = postulaciones.filter((p) => STATUS_TERMINALES.includes(p.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Mis Postulaciones
          </h2>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            {activas.length} de 3 activas
          </p>
        </div>
      </div>

      {activas.length > 0 && (
        <div className="space-y-4">
          {activas.map((p, i) => {
            const cardKey = p.id_formulario ?? `idx-${i}`;
            return (
              <TarjetaPostulacionV2
                key={cardKey}
                postulacion={p}
                onRespuesta={manejarRespuesta}
                respondiendo={respondiendo}
              />
            );
          })}
        </div>
      )}

      {historial.length > 0 && (
        <div className="space-y-4">
          <h3 className={`text-sm font-bold uppercase tracking-wider ${tema.subtitle}`}>
            Historial
          </h3>
          {historial.map((p, i) => {
            const cardKey = p.id_formulario ?? `hist-${i}`;
            return (
              <TarjetaPostulacionV2
                key={cardKey}
                postulacion={p}
                onRespuesta={manejarRespuesta}
                respondiendo={respondiendo}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
