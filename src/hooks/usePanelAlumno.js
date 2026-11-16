/* Datos del panel: cada sección conserva su propio error de carga. */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { api } from '../services/api';

const SIN_ERRORES = { panel: '', miembros: '', postulaciones: '', preferencias: '', inscripciones: '', reconocimientos: '' };

export function usePanelAlumno() {
  const { usuario, obtenerDatosPanel } = useAutenticacion();
  const [datos, setDatos] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [preferencias, setPreferencias] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [reconocimientos, setReconocimientos] = useState([]);
  const [errores, setErrores] = useState(SIN_ERRORES);
  const [cargando, setCargando] = useState(true);
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    const actual = ++solicitud.current;
    setCargando(true);
    setErrores(SIN_ERRORES);
    try {
      const principales = await obtenerDatosPanel();
      if (actual !== solicitud.current) return;
      setDatos(principales);
      const alumno = usuario?.id_rol === 1;
      const tareas = [
        ['miembros', () => principales?.club ? api.getMiembros(principales.club.id_club) : Promise.resolve([]), setMiembros],
        ['postulaciones', () => alumno ? api.getMisPostulaciones() : Promise.resolve([]), setPostulaciones],
        ['preferencias', () => alumno ? api.getPreferenciasOnboarding() : Promise.resolve(null), setPreferencias],
        ['inscripciones', () => alumno ? api.getMisInscripciones() : Promise.resolve([]), setInscripciones],
        ['reconocimientos', () => alumno ? api.getMisReconocimientos() : Promise.resolve([]), setReconocimientos],
      ];
      const resultados = await Promise.allSettled(tareas.map(([, pedir]) => pedir()));
      if (actual !== solicitud.current) return;
      const fallos = { ...SIN_ERRORES };
      tareas.forEach(([clave, , guardar], indice) => {
        const resultado = resultados[indice];
        if (resultado.status === 'fulfilled') {
          guardar(clave === 'preferencias' ? resultado.value : (Array.isArray(resultado.value) ? resultado.value : []));
        } else {
          guardar(clave === 'preferencias' ? null : []);
          fallos[clave] = resultado.reason?.message || 'No se pudo cargar esta sección.';
        }
      });
      setErrores(fallos);
    } catch (error) {
      if (actual === solicitud.current) {
        setDatos(null);
        setErrores({ ...SIN_ERRORES, panel: error?.message || 'No se pudo cargar tu panel.' });
      }
    } finally {
      if (actual === solicitud.current) setCargando(false);
    }
  }, [obtenerDatosPanel, usuario]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]);

  return { user: usuario, data: datos, club: datos?.club || null, miembros, postulaciones,
    preferencias, inscripciones, reconocimientos, errores, loading: cargando, recargar: cargar };
}
