import { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { TarjetaPostulacionV2 } from '../alumno/TarjetaPostulacionV2';

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Mis Postulaciones
          </h2>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            {postulaciones.length} de 3 postulaciones utilizadas
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {postulaciones.map((p, i) => {
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
    </div>
  );
}
