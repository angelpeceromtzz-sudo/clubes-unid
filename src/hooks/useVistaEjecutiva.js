/* eslint-disable react-hooks/set-state-in-effect */
/* Hook compartido para la vista ejecutiva de Administración y Rectoría. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useVistaEjecutiva() {
  const [stats, setStats] = useState(null);
  const [ocupacionClubes, setOcupacionClubes] = useState([]);
  const [topClubes, setTopClubes] = useState([]);
  const [clubesDetalle, setClubesDetalle] = useState([]);
  const [panelData, setPanelData] = useState(null);
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
    const paramsPanel = new URLSearchParams();
    if (filtros.id_club) paramsPanel.set('id_club', filtros.id_club);

    const paramsOcupacion = new URLSearchParams();
    if (filtros.id_club) paramsOcupacion.set('id_club', filtros.id_club);

    const paramsTop = new URLSearchParams();
    if (filtros.id_club) paramsTop.set('id_club', filtros.id_club);

    const paramsPanelData = new URLSearchParams();
    if (filtros.id_club) paramsPanelData.set('id_club', filtros.id_club);
    if (filtros.id_periodo) paramsPanelData.set('id_periodo', filtros.id_periodo);
    if (filtros.carrera) paramsPanelData.set('carrera', filtros.carrera);
    if (filtros.estado) paramsPanelData.set('estado', filtros.estado);

    const paramsAsistencia = new URLSearchParams();
    if (filtros.id_club) paramsAsistencia.set('id_club', filtros.id_club);
    if (filtros.id_periodo) paramsAsistencia.set('id_periodo', filtros.id_periodo);

    const paramsEncuestas = new URLSearchParams();
    if (filtros.carrera) paramsEncuestas.set('carrera', filtros.carrera);

    const qs = (p) => p.toString() ? `?${p.toString()}` : '';

    try {
      const [datosStats, ocupacion, top, clubes, panel, datosAsistencia, datosEncuestas, datosListaEncuestas, datosPeriodos, datosLicenciaturas] = await Promise.all([
        api.get(`/estadisticas/panel${qs(paramsPanel)}`),
        api.get(`/estadisticas/ocupacion-clubes${qs(paramsOcupacion)}`),
        api.get(`/estadisticas/top-clubes${qs(paramsTop)}`),
        api.get('/estadisticas/clubes-detalle'),
        api.get(`/admin/panel-data${qs(paramsPanelData)}`),
        api.get(`/estadisticas/asistencia-ejecutiva${qs(paramsAsistencia)}`),
        api.get(`/estadisticas/encuestas-ejecutivas${qs(paramsEncuestas)}`),
        api.get('/encuestas/admin'),
        api.get('/asistencia/periodos'),
        api.get('/catalogos/licenciaturas'),
      ]);
      setStats(datosStats);
      setOcupacionClubes(ocupacion);
      setTopClubes(top);
      setClubesDetalle(clubes);
      setPanelData(panel);
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

  function aplicarFiltros(nuevos) {
    setFiltros((prev) => ({ ...prev, ...nuevos }));
  }

  const cargarResultadosEncuesta = useCallback((id) => {
    let cancelado = false;
    setCargandoResultados(true);
    const params = new URLSearchParams();
    if (filtros.carrera) params.set('carrera', filtros.carrera);
    const qs = params.toString() ? `?${params.toString()}` : '';
    api.get(`/encuestas/admin/${id}/resultados${qs}`)
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
  }, [filtros.carrera]);

  useEffect(() => {
    if (encuestaSeleccionada) {
      const cancelar = cargarResultadosEncuesta(encuestaSeleccionada);
      return cancelar;
    }
    return undefined;
  }, [cargarResultadosEncuesta, encuestaSeleccionada]);

  function seleccionarEncuesta(id) {
    const idStr = String(id);
    setEncuestaSeleccionada(idStr);
    setResultadosEncuesta(null);
    setPreguntaSeleccionada('');
    if (idStr) {
      cargarResultadosEncuesta(idStr);
    }
  }

  function seleccionarPregunta(id) {
    setPreguntaSeleccionada(String(id));
  }

  return {
    stats,
    ocupacionClubes,
    topClubes,
    clubesDetalle,
    panelData,
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
    actualizadoEn: panelData?.actualizado_en || null,
  };
}