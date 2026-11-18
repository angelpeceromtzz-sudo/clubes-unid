/* Hook del expediente estudiantil: busca alumnos y carga su historial de participación. */
import { useState, useCallback } from 'react';
import { api } from '../services/api';

const MIN_BUSQUEDA = 3;

export function useExpediente() {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [expediente, setExpediente] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({ id_licenciatura: '', con_expediente: false });

  const buscar = useCallback(async (texto, filtrosOverride) => {
    const limpio = (texto ?? termino).trim();
    const filtrosActivos = filtrosOverride ?? filtros;
    setTermino(texto ?? termino);
    setError('');
    if (limpio.length < MIN_BUSQUEDA) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const params = new URLSearchParams({ q: limpio });
      if (filtrosActivos?.id_licenciatura) {
        params.set('id_licenciatura', filtrosActivos.id_licenciatura);
      }
      if (filtrosActivos?.con_expediente) {
        params.set('con_expediente', 'true');
      }
      const data = await api.get(`/expediente/buscar?${params.toString()}`);
      setResultados(data);
    } catch (err) {
      setResultados([]);
      setError(err?.message || 'Error al buscar alumnos');
    } finally {
      setBuscando(false);
    }
  }, [termino, filtros]);

  const actualizarFiltros = useCallback((nuevos) => {
    setFiltros((prev) => {
      const siguiente = { ...prev, ...nuevos };
      return siguiente;
    });
  }, []);

  const seleccionar = useCallback(async (idUsuario) => {
    setCargandoExpediente(true);
    setError('');
    try {
      const data = await api.get(`/expediente/${idUsuario}`);
      setExpediente(data);
    } catch (err) {
      setError(err?.message || 'Error al cargar el expediente');
    } finally {
      setCargandoExpediente(false);
    }
  }, []);

  const volver = useCallback(() => {
    setExpediente(null);
    setError('');
  }, []);

  return {
    termino,
    resultados,
    expediente,
    buscando,
    cargandoExpediente,
    error,
    filtros,
    buscar,
    actualizarFiltros,
    seleccionar,
    volver,
  };
}