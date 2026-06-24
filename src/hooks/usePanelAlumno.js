import { useState, useEffect } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { api } from '../services/api';

export function usePanelAlumno(tema, modoOscuro) {
  const { usuario, obtenerDatosPanel } = useAutenticacion();
  const [datos, setDatos] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const d = await obtenerDatosPanel();
      setDatos(d);
      if (d?.club) {
        try {
          const m = await api.getMiembros(d.club.id_club);
          setMiembros(m);
        } catch {
          setMiembros([]);
        }
      }
      try {
        const p = await api.getMisPostulaciones();
        setPostulaciones(p);
      } catch {
        setPostulaciones([]);
      }
      setCargando(false);
    }
    cargar();
  }, [obtenerDatosPanel]);

  const esOscuro = modoOscuro;

  return {
    user: usuario,
    data: datos,
    club: datos?.club || null,
    esPresidente: datos?.esPresidente || false,
    miembros,
    postulaciones,
    loading: cargando,
    isDark: esOscuro,
    tema,
  };
}
