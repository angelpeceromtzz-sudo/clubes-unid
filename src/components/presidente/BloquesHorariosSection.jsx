import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { PreseleccionadosConBloque } from './bloques-horarios/PreseleccionadosConBloque';
import { PreseleccionadosSinBloque } from './bloques-horarios/PreseleccionadosSinBloque';
import { AlumnosConvocados } from './bloques-horarios/AlumnosConvocados';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorAlerta } from '../ui/ErrorAlerta';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { Alerta } from '../ui/Alerta';

export function SeccionBloquesHorarios({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [convocando, setConvocando] = useState(false);
  const [error, setError] = useState('');
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        if (montado) {
          setSolicitudes(data);
          setCompletado(false);
          setError('');
        }
      } catch {
        if (montado) setSolicitudes([]);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  const preseleccionadosConBloque = solicitudes.filter(
    (s) => s.status === 'Preseleccionado' && s.bloque_asignado && s.bloque_asignado !== 'E'
  );
  const preseleccionadosSinBloque = solicitudes.filter(
    (s) => s.status === 'Preseleccionado' && (!s.bloque_asignado || s.bloque_asignado === 'E')
  );
  const convocados = solicitudes.filter((s) => s.status === 'Convocado');
  const bloqueA = convocados.filter((s) => s.bloque_asignado === 'A');
  const bloqueB = convocados.filter((s) => s.bloque_asignado === 'B');

  async function refreshData() {
    const data = await api.getSolicitudesPendientes(club.id_club);
    setSolicitudes(data);
  }

  async function convocarPreseleccionados() {
    setConvocando(true);
    setError('');
    try {
      for (const s of preseleccionadosConBloque) {
        await api.actualizarEstatusSolicitud(s.id_formulario, 'Convocado');
      }
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setConvocando(false);
    }
  }

  async function asignarBloqueYConvocar(id, bloque) {
    setError('');
    try {
      await api.asignarBloque(id, bloque);
      await api.actualizarEstatusSolicitud(id, 'Convocado');
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmarSeleccion(ids) {
    setError('');
    try {
      await api.seleccionarOfertas(club.id_club, ids);
      setCompletado(true);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  if (cargando) {
    return <Spinner />;
  }

  const sinAlumnos = convocados.length === 0 && preseleccionadosConBloque.length === 0 && preseleccionadosSinBloque.length === 0;

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Bloques y Horarios"
        subtitulo="Gestiona la convocatoria a evaluación presencial y la selección final de alumnos."
      />

      <ErrorAlerta mensaje={error} />

      {completado && (
        <Alerta tipo="success" mensaje="Ofertas de ingreso enviadas exitosamente. Los alumnos seleccionados recibirán una notificación." />
      )}

      <PreseleccionadosConBloque
        alumnos={preseleccionadosConBloque}
        onConvocarTodos={convocarPreseleccionados}
        convocando={convocando}
      />

      <PreseleccionadosSinBloque
        alumnos={preseleccionadosSinBloque}
        onAsignarBloque={asignarBloqueYConvocar}
      />

      <AlumnosConvocados
        bloqueA={bloqueA}
        bloqueB={bloqueB}
        onConfirmarSeleccion={handleConfirmarSeleccion}
        completado={completado}
      />

      {sinAlumnos && (
        <EmptyState icono="users" titulo="No hay alumnos para gestionar" descripcion="Preselecciona alumnos desde la sección &quot;Solicitudes&quot; para que aparezcan aquí" />
      )}
    </div>
  );
}
