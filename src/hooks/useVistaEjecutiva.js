/* Hook compartido para la vista ejecutiva de Administración y Rectoría. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useVistaEjecutiva() {
  const [stats, setStats] = useState(null);
  const [ocupacionClubes, setOcupacionClubes] = useState([]);
  const [topClubes, setTopClubes] = useState([]);
  const [clubesDetalle, setClubesDetalle] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [asistencia, setAsistencia] = useState(null);
  const [encuestas, setEncuestas] = useState(null);
  const [listaEncuestas, setListaEncuestas] = useState([]);
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState('');
  const [preguntaSeleccionada, setPreguntaSeleccionada] = useState('');
  const [resultadosEncuesta, setResultadosEncuesta] = useState(null);
  const [cargandoResultados, setCargandoResultados] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [licenciaturas, setLicenciaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [filtros, setFiltros] = useState({
    id_periodo: '',
    id_club: '',
    carrera: '',
    estado: '',
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const params = new URLSearchParams();
    if (filtros.id_club) params.set('id_club', filtros.id_club);
    if (filtros.id_periodo) params.set('id_periodo', filtros.id_periodo);
    if (filtros.carrera) params.set('carrera', filtros.carrera);
    if (filtros.estado) params.set('estado', filtros.estado);
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const [datosStats, ocupacion, top, clubes, dashboard, datosAsistencia, datosEncuestas, datosListaEncuestas, datosPeriodos, datosLicenciaturas] = await Promise.all([
        api.get('/estadisticas/dashboard'),
        api.get('/estadisticas/ocupacion-clubes'),
        api.get('/estadisticas/top-clubes'),
        api.get('/estadisticas/clubes-detalle'),
        api.get(`/admin/dashboard-data${qs ? `?${qs}` : ''}`),
        api.get(`/estadisticas/asistencia-ejecutiva${qs ? `?${qs}` : ''}`),
        api.get('/estadisticas/encuestas-ejecutivas'),
        api.get('/encuestas/admin'),
        api.get('/asistencia/periodos'),
        api.get('/catalogos/licenciaturas'),
      ]);
      setStats(datosStats);
      setOcupacionClubes(ocupacion);
      setTopClubes(top);
      setClubesDetalle(clubes);
      setDashboardData(dashboard);
      setAsistencia(datosAsistencia);
      setEncuestas(datosEncuestas);
      setListaEncuestas(Array.isArray(datosListaEncuestas) ? datosListaEncuestas : []);
      setPeriodos(Array.isArray(datosPeriodos) ? datosPeriodos : []);
      setLicenciaturas(Array.isArray(datosLicenciaturas) ? datosLicenciaturas : []);
    } catch (err) {
      console.error('Error al cargar vista ejecutiva:', err);
      setError('Error al cargar la vista ejecutiva');
    } finally {
      setCargando(false);
    }
  }, [filtros.id_club, filtros.id_periodo, filtros.carrera, filtros.estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!encuestaSeleccionada) {
      setResultadosEncuesta(null);
      setPreguntaSeleccionada('');
      return;
    }
    let cancelado = false;
    setCargandoResultados(true);
    api.get(`/encuestas/admin/${encuestaSeleccionada}/resultados`)
      .then((data) => {
        if (!cancelado) {
          setResultadosEncuesta(data);
          setPreguntaSeleccionada('');
        }
      })
      .catch((err) => {
        console.error('Error al cargar resultados de encuesta:', err);
        if (!cancelado) {
          setResultadosEncuesta(null);
          setPreguntaSeleccionada('');
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoResultados(false);
      });
    return () => { cancelado = true; };
  }, [encuestaSeleccionada]);

  function aplicarFiltros(nuevos) {
    setFiltros((prev) => ({ ...prev, ...nuevos }));
  }

  function seleccionarEncuesta(id) {
    setEncuestaSeleccionada(String(id));
  }

  function seleccionarPregunta(id) {
    setPreguntaSeleccionada(String(id));
  }

  return {
    stats,
    ocupacionClubes,
    topClubes,
    clubesDetalle,
    dashboardData,
    asistencia,
    encuestas,
    listaEncuestas,
    encuestaSeleccionada,
    preguntaSeleccionada,
    resultadosEncuesta,
    cargandoResultados,
    seleccionarEncuesta,
    seleccionarPregunta,
    periodos,
    licenciaturas,
    cargando,
    error,
    filtros,
    aplicarFiltros,
    recargar: cargar,
    actualizadoEn: dashboardData?.actualizado_en || null,
  };
}