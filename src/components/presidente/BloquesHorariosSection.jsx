import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BloquePanelMejorado } from './BloquePanelMejorado';

export function BloquesHorariosSection({ club, tema, modoOscuro }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        if (mounted) setSolicitudes(data);
      } catch {
        if (mounted) setSolicitudes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [club.id_club]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const bloqueA = solicitudes.filter((s) => s.status === 'Aceptado' && s.bloque_asignado === 'A');
  const bloqueB = solicitudes.filter((s) => s.status === 'Aceptado' && s.bloque_asignado === 'B');

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-6 ${tema.title}`}>
          Bloques y Horarios
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BloquePanelMejorado
          titulo="Bloque A — Vespertino"
          turno="Vespertino"
          alumnos={bloqueA}
          isDark={modoOscuro}
        />
        <BloquePanelMejorado
          titulo="Bloque B — Matutino"
          turno="Matutino"
          alumnos={bloqueB}
          isDark={modoOscuro}
        />
      </div>
    </div>
  );
}
