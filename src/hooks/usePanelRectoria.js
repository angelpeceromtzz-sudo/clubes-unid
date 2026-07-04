/* Hook del panel de rectoría: carga estadísticas, detalle de clubes, padrón y asistencia. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function usePanelRectoria() {
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
    turno: '',
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
      if (filtros.turno) params.set('turno', filtros.turno);
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
    if (vistaActiva === 'resumen') cargarStats();
  }, [vistaActiva, cargarStats]);

  useEffect(() => {
    if (vistaActiva === 'clubes') cargarClubes();
  }, [vistaActiva, cargarClubes]);

  useEffect(() => {
    if (vistaActiva === 'padron') cargarPadron(filtrosPadron);
  }, [vistaActiva]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
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
