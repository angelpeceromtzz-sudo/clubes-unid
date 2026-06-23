import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export function useDashboardAlumno(tema, modoOscuro) {
  const { user, fetchDashboardData } = useAuth();
  const [data, setData] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const d = await fetchDashboardData();
      setData(d);
      if (d?.club) {
        try {
          const m = await api.getMiembros(d.club.id_club);
          setMiembros(m);
        } catch {
          setMiembros([]);
        }
      }
      setLoading(false);
    }
    load();
  }, [fetchDashboardData]);

  const isDark = modoOscuro;

  return {
    user,
    data,
    club: data?.club || null,
    esPresidente: data?.esPresidente || false,
    miembros,
    loading,
    isDark,
    tema,
  };
}
