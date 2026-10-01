/* Hook del panel de rectoría: carga estadísticas, detalle de clubes, padrón y asistencia. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAutenticacion } from '../contexts/AuthContext';

export function usePanelRectoria() {
  // El usuario va al hook (y no se lee dentro de cada sección) porque
  // `SeccionEncuestas` decide qué botones de escritura mostrar comparando
  // `id_rol` contra `ROL_ADMIN`. Sin esto, `usuario` llegaría como `undefined` y
  // la sección saldría en sólo lectura por accidente y no porque sepa quién
  // eres: si mañana un admin entra a este panel, vería todo deshabilitado.
  const { usuario } = useAutenticacion();

  const [vistaActiva, setVistaActiva] = useState('resumen');
  const [stats, setStats] = useState(null);
  const [ocupacionClubes, setOcupacionClubes] = useState([]);
  const [topClubes, setTopClubes] = useState([]);
  const [clubesDetalle, setClubesDetalle] = useState([]);
  const [padron, setPadron] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Filtros para padrón
  const [filtrosPadron, setFiltrosPadron] = useState({
    id_club: '',
    busqueda: '',
    carrera: '',

  });

  // Filtros para asistencia
  const [clubAsistenciaId, setClubAsistenciaId] = useState('');

  const cargarStats = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [datosStats, ocupacion, top] = await Promise.all([
        api.get('/estadisticas/dashboard'),
        api.get('/estadisticas/ocupacion-clubes'),
        api.get('/estadisticas/top-clubes'),
      ]);
      setStats(datosStats);
      setOcupacionClubes(ocupacion);
      setTopClubes(top);
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarClubes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await api.get('/estadisticas/clubes-detalle');
      setClubesDetalle(data);
    } catch {
      setError('Error al cargar clubes');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarPadron = useCallback(async (filtros) => {
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filtros.id_club) params.set('id_club', filtros.id_club);
      if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
      if (filtros.carrera) params.set('carrera', filtros.carrera);
const qs = params.toString();
      const data = await api.get(`/estadisticas/padron${qs ? `?${qs}` : ''}`);
      setPadron(data);
    } catch {
      setError('Error al cargar padrón');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarAsistencia = useCallback(async (idClub) => {
    if (!idClub) return;
    setCargando(true);
    setError('');
    try {
      const data = await api.get(`/estadisticas/asistencia/${idClub}`);
      setAsistencia(data);
    } catch {
      setError('Error al cargar lista de asistencia');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (vistaActiva === 'resumen') cargarStats();
  }, [vistaActiva, cargarStats]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (vistaActiva === 'clubes') cargarClubes();
  }, [vistaActiva, cargarClubes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (vistaActiva === 'padron') cargarPadron(filtrosPadron);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaActiva]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (vistaActiva === 'asistencia' && clubAsistenciaId) cargarAsistencia(clubAsistenciaId);
  }, [vistaActiva, clubAsistenciaId, cargarAsistencia]);

  function aplicarFiltrosPadron(nuevosFiltros) {
    const merged = { ...filtrosPadron, ...nuevosFiltros };
    setFiltrosPadron(merged);
    cargarPadron(merged);
  }

  function seleccionarClubAsistencia(idClub) {
    setClubAsistenciaId(idClub);
    if (idClub) cargarAsistencia(idClub);
  }

  return {
    vistaActiva,
    setVistaActiva,
    // Lo consumen las secciones que necesitan saber el rol para esconder lo que
    // no sea de lectura. Es el mismo `user` que expone `usePanelAdmin`.
    user: usuario,
    stats,
    ocupacionClubes,
    topClubes,
    clubesDetalle,
    padron,
    asistencia,
    cargando,
    error,
    filtrosPadron,
    aplicarFiltrosPadron,
    clubAsistenciaId,
    seleccionarClubAsistencia,
  };
}
