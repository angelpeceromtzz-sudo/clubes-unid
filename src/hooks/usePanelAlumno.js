/* Hook del panel de alumno: carga el club del usuario y sus postulaciones activas. */
import { useState, useEffect, useCallback } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { api } from '../services/api';

export function usePanelAlumno() {
  const { usuario, obtenerDatosPanel } = useAutenticacion();
  const [datos, setDatos] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
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
  }, [obtenerDatosPanel]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    user: usuario,
    data: datos,
    club: datos?.club || null,
    miembros,
    postulaciones,
    loading: cargando,
    isDark: modoOscuro,
    tema,
    recargar: cargar,
  };
}
