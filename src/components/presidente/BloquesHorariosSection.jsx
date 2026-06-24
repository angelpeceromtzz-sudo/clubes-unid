import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PanelBloqueMejorado } from './BloquePanelMejorado';

export function SeccionBloquesHorarios({ club, tema, modoOscuro }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        if (montado) setSolicitudes(data);
      } catch {
        if (montado) setSolicitudes([]);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const bloqueA = solicitudes.filter((s) => s.bloque_asignado === 'A');
  const bloqueB = solicitudes.filter((s) => s.bloque_asignado === 'B');

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-6 ${tema.title}`}>
          Bloques y Horarios
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelBloqueMejorado
          titulo="Bloque A"
          alumnos={bloqueA}
          isDark={modoOscuro}
        />
        <PanelBloqueMejorado
          titulo="Bloque B"
          alumnos={bloqueB}
          isDark={modoOscuro}
        />
      </div>
    </div>
  );
}
