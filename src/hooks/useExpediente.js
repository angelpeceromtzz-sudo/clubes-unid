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

  const buscar = useCallback(async (texto) => {
    const limpio = texto.trim();
    setTermino(texto);
    setError('');
    if (limpio.length < MIN_BUSQUEDA) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const data = await api.get(`/expediente/buscar?q=${encodeURIComponent(limpio)}`);
      setResultados(data);
    } catch (err) {
      setResultados([]);
      setError(err?.message || 'Error al buscar alumnos');
    } finally {
      setBuscando(false);
    }
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
    buscar,
    seleccionar,
    volver,
  };
}
