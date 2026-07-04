import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { PreseleccionadosConBloque } from './bloques-horarios/PreseleccionadosConBloque';
import { PreseleccionadosSinBloque } from './bloques-horarios/PreseleccionadosSinBloque';
import { AlumnosConvocados } from './bloques-horarios/AlumnosConvocados';

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
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const sinAlumnos = convocados.length === 0 && preseleccionadosConBloque.length === 0 && preseleccionadosSinBloque.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Bloques y Horarios
        </h2>
        <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Gestiona la convocatoria a evaluación presencial y la selección final de alumnos.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {completado && (
        <div className={`rounded-xl p-4 border ${modoOscuro ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2">
            <Icono nombre="check-circle" className="h-5 w-5 text-emerald-500 shrink-0" strokeWidth={2.5} />
            <p className="text-sm font-medium text-emerald-500">
              Ofertas de ingreso enviadas exitosamente. Los alumnos seleccionados recibirán una notificación.
            </p>
          </div>
        </div>
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
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Icono nombre="users" className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay alumnos para gestionar</p>
          <p className="text-xs mt-0.5">
            Preselecciona alumnos desde la sección "Solicitudes" para que aparezcan aquí
          </p>
        </div>
      )}
    </div>
  );
}
