import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useDashboardPresidente(user, tema, modoOscuro) {
  const [vistaActiva, setVistaActiva] = useState('mi-club');
  const [state, setState] = useState({ club: null, miembros: [], loading: true, error: '' });

  const isDark = modoOscuro;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const perfil = await api.getMe();

        if (!mounted) return;

        if (!perfil.id_club) {
          setState({ club: null, miembros: [], loading: false, error: '' });
          return;
        }

        const clubCompleto = await api.getClub(perfil.id_club);

        if (!mounted) return;

        let miembros = [];
        try {
          miembros = await api.getMiembros(perfil.id_club);
        } catch {
          miembros = [];
        }

        if (mounted) {
          setState({ club: { ...clubCompleto, id_presidente: perfil.id_presidente }, miembros, loading: false, error: '' });
        }
      } catch (err) {
        if (mounted) setState((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return {
    vistaActiva,
    setVistaActiva,
    ...state,
    isDark,
    tema,
    user,
  };
}
