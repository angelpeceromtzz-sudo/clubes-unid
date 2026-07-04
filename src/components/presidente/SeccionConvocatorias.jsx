import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { BloqueCard } from './BloqueCard';

export function SeccionConvocatorias({ club }) {
  const { tema } = useTheme();
  const [convocatorias, setConvocatorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const data = await api.getConvocatorias(club.id_club);
      setConvocatorias(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [club.id_club]);

  async function manejarActualizar(id, data) {
    await api.actualizarConvocatoria(id, data);
    setConvocatorias((prev) =>
      prev.map((c) => c.id_convocatoria === id ? { ...c, ...data } : c)
    );
  }

  async function manejarEnviar(id) {
    await api.enviarConvocatoria(id);
    setConvocatorias((prev) =>
      prev.map((c) => c.id_convocatoria === id ? { ...c, enviada: true } : c)
    );
  }

  function manejarImprimir(id) {
    const token = (() => {
      try {
        const raw = localStorage.getItem('unid_session');
        if (raw) {
          const session = JSON.parse(raw);
          return session.token || null;
        }
        return null;
      } catch {
        return null;
      }
    })();
    const base = import.meta.env.MODE === 'production'
      ? 'https://clubes-unid.onrender.com/api'
      : '/api';
    window.open(`${base}/convocatorias/${id}/asistencia?token=${token}`, '_blank');
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Convocatorias
        </h2>
        <p className={`text-sm ${tema.subtitle}`}>
          Gestiona los bloques de evaluación presencial: asigna fecha, hora y lugar, envía notificaciones e imprime listas de asistencia.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {convocatorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Icono nombre="calendar" className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay convocatorias activas</p>
          <p className="text-xs mt-0.5">Preselecciona alumnos desde la sección "Formularios" y genera las convocatorias para que aparezcan aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {convocatorias.map((c) => (
            <BloqueCard
              key={c.id_convocatoria}
              convocatoria={c}
              onActualizar={manejarActualizar}
              onEnviar={manejarEnviar}
              onImprimir={manejarImprimir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
