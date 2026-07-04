/* Hook del panel de presidente: carga datos del club, miembros y maneja navegación entre vistas. */
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export function usePanelPresidente(usuario) {
  const { esOscuro, tema } = useTheme();
  const [vistaActiva, setVistaActiva] = useState('mi-club');
  const [estado, setEstado] = useState({ club: null, miembros: [], loading: true, error: '' });

  useEffect(() => {
    let montado = true;

    async function cargar() {
      try {
        const perfil = await api.getMe();

        if (!montado) return;

        if (!perfil.id_club || perfil.id_presidente !== perfil.id_usuario) {
          setEstado({ club: null, miembros: [], loading: false, error: '' });
          return;
        }

        const clubCompleto = await api.getClub(perfil.id_club);

        if (!montado) return;

        let miembros = [];
        try {
          miembros = await api.getMiembros(perfil.id_club);
        } catch {
          miembros = [];
        }

        if (montado) {
          setEstado({ club: { ...clubCompleto, id_presidente: perfil.id_presidente }, miembros, loading: false, error: '' });
        }
      } catch (err) {
        if (montado) setEstado((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    }

    cargar();
    return () => { montado = false; };
  }, []);

  return {
    vistaActiva,
    setVistaActiva,
    ...estado,
    isDark: esOscuro,
    tema,
    user: usuario,
  };
}
