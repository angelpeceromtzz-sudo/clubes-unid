/* Sección de convocatorias del presidente: gestiona bloques y horarios del club. */
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { BloqueCard } from './BloqueCard';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { Alerta } from '../ui/Alerta';

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
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Convocatorias"
        subtitulo="Gestiona los bloques de evaluación presencial: asigna fecha, hora y lugar, envía notificaciones e imprime listas de asistencia."
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {convocatorias.length === 0 ? (
        <EmptyState icono="calendar" titulo="No hay convocatorias activas" descripcion="Preselecciona alumnos desde la sección Formularios y genera las convocatorias para que aparezcan aquí" />
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
