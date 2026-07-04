/* Vista de selección final del presidente: ofertar cupo a alumnos preseleccionados. */
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Alerta } from '../ui/Alerta';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { PantallaCompletado } from '../ui/PantallaCompletado';
import { AlumnoSeleccionCard } from './AlumnoSeleccionCard';
import { BotonEnviarOfertas } from './BotonEnviarOfertas';

export function SeleccionFinal({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [convocados, setConvocados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [decisiones, setDecisiones] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        const conv = data.filter((s) => s.status === 'Convocado');
        if (montado) {
          setConvocados(conv);
          setDecisiones({});
        }
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  function toggleDecision(id) {
    setDecisiones((prev) => {
      if (prev[id] === 'aprobado') {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: 'aprobado' };
    });
  }

  const aprobados = Object.entries(decisiones)
    .filter((entry) => entry[1] === 'aprobado')
    .map((entry) => parseInt(entry[0], 10));
  const rechazados = convocados.filter((c) => !decisiones[c.id_formulario]);

  async function enviarOfertas() {
    setEnviando(true);
    setError('');
    try {
      await api.enviarOfertas(club.id_club, aprobados);
      setCompletado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return <Spinner />;
  }

  if (completado) {
    const descripcion = `${aprobados.length} alumno${aprobados.length !== 1 ? 's' : ''} recibirá${aprobados.length === 1 ? '' : 'n'} oferta${aprobados.length !== 1 ? 's' : ''} de ingreso.${rechazados.length > 0 ? ` ${rechazados.length} alumno${rechazados.length !== 1 ? 's' : ''} notificado${rechazados.length !== 1 ? 's' : ''} como no seleccionado${rechazados.length !== 1 ? 's' : ''}.` : ''}`;
    return <PantallaCompletado icono="check-circle" titulo="Ofertas enviadas" descripcion={descripcion} />;
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Selección Final"
        subtitulo="Marca a los alumnos que aprobaron la evaluación presencial. Al enviar, recibirán una oferta de ingreso."
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {convocados.length === 0 ? (
        <EmptyState icono="users" titulo="No hay alumnos convocados" descripcion="Los alumnos aparecerán aquí una vez que hayan sido convocados a evaluación presencial." />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                {convocados.length} alumno{convocados.length !== 1 ? 's' : ''} convocado{convocados.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-slate-500">
                · {aprobados.length} aprobado{aprobados.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {convocados.map((alumno) => (
              <AlumnoSeleccionCard
                key={alumno.id_formulario}
                alumno={alumno}
                esAprobado={decisiones[alumno.id_formulario] === 'aprobado'}
                modoOscuro={modoOscuro}
                onToggle={() => toggleDecision(alumno.id_formulario)}
              />
            ))}
          </div>

          <BotonEnviarOfertas
            aprobados={aprobados}
            enviando={enviando}
            onEnviar={enviarOfertas}
          />
        </>
      )}
    </div>
  );
}
