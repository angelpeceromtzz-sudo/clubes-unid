/* Hook para cargar y filtrar clubes del catálogo por categoría y estado desde la API. */
import { useState, useEffect } from 'react';
import { api, getSession } from '../services/api';
import { useAutenticacion } from '../contexts/AuthContext';

const ESTADO_MAP = {
  Abiertos: ['abierto'],
  Proximos: ['proximo'],
  Llenos: ['lleno', 'cerrado'],
};

export function useClubes() {
  const { refrescarInscripcionActiva } = useAutenticacion();
  const [clubes, setClubes] = useState([]);
  const [clubesLoading, setClubesLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [estadoActivo, setEstadoActivo] = useState('Todos');

  useEffect(() => {
    async function loadClubes() {
      try {
        const data = await api.getClubes();
        setClubes(data);
      } catch {
        setClubes([]);
      } finally {
        setClubesLoading(false);
      }
    }
    loadClubes();
    const session = getSession();
    if (session?.user) {
      refrescarInscripcionActiva();
    }
  }, [refrescarInscripcionActiva]);

  const clubesFiltrados = clubes
    .filter((club) => club.id_estatus_club !== 3)
    .filter((club) => categoriaActiva === 'Todos' || club.categoria === categoriaActiva)
    .filter((club) => {
      if (estadoActivo === 'Todos') return true;
      if (club.id_estatus_club === 2) return false;
      const permitidos = ESTADO_MAP[estadoActivo] || [];
      return permitidos.includes(club.estado_calculado);
    });

  return { clubes, clubesLoading, clubesFiltrados, categoriaActiva, setCategoriaActiva, estadoActivo, setEstadoActivo };
}
