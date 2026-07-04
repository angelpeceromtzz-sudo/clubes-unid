import { useState, useEffect } from 'react';
import { api, getSession } from '../services/api';
import { useAutenticacion } from '../contexts/AuthContext';

export function useClubes() {
  const { refrescarInscripcionActiva } = useAutenticacion();
  const [clubes, setClubes] = useState([]);
  const [clubesLoading, setClubesLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');

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
    .filter((club) => categoriaActiva === 'Todos' || club.categoria === categoriaActiva);

  return { clubes, clubesLoading, clubesFiltrados, categoriaActiva, setCategoriaActiva };
}
