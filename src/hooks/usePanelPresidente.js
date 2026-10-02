/* Hook del panel de presidente: carga datos del club, miembros y maneja navegación entre vistas. */
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export function usePanelPresidente(usuario) {
  const { esOscuro, tema } = useTheme();
  const [vistaActiva, setVistaActiva] = useState('principal');
  const [estado, setEstado] = useState({ club: null, miembros: [], loading: true, error: '' });

  useEffect(() => {
    let montado = true;

    async function cargar() {
      try {
        const perfil = await api.getMe();

        if (!montado) return;

        if (!perfil.id_club || (Number(perfil.id_presidente) !== Number(perfil.id_usuario) && Number(perfil.id_vicepresidente) !== Number(perfil.id_usuario))) {
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
          const esPresidente = Number(perfil.id_presidente) === Number(perfil.id_usuario);
          setEstado({
            club: { ...clubCompleto, id_presidente: perfil.id_presidente, id_vicepresidente: perfil.id_vicepresidente },
            miembros, loading: false, error: '',
            esPresidente,
          });
        }
      } catch (err) {
        if (montado) setEstado((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    }

    cargar();
    return () => { montado = false; };
  }, []);

  function actualizarClub(cambios) {
    setEstado(prev => ({ ...prev, club: { ...prev.club, ...cambios } }));
  }

  return {
    vistaActiva,
    setVistaActiva,
    ...estado,
    actualizarClub,
    isDark: esOscuro,
    tema,
    user: usuario,
  };
}
