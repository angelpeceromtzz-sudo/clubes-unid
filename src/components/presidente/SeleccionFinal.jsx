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
  const [preseleccionados, setPreseleccionados] = useState([]);
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
        const presel = data.filter((s) => s.status === 'Preseleccionado');
        if (montado) {
          setConvocados(conv);
          setPreseleccionados(presel);
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

  const noHayConvocados = convocados.length === 0;
  const hayPreseleccionados = preseleccionados.length > 0;

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Selección Final"
        subtitulo="Marca a los alumnos que aprobaron la evaluación presencial. Al enviar, recibirán una oferta de ingreso."
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {noHayConvocados && hayPreseleccionados ? (
        <div className={`rounded-2xl border p-8 text-center ${
          modoOscuro ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
            Selección final bloqueada
          </h3>
          <p className={`text-sm max-w-md mx-auto ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            La selección final estará habilitada después de que generes las convocatorias y los alumnos sean evaluados presencialmente. Ve a la sección <strong>Convocatorias</strong> para continuar.
          </p>
        </div>
      ) : noHayConvocados ? (
        <div className={`rounded-2xl border p-8 text-center ${
          modoOscuro ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            modoOscuro ? 'bg-emerald-500/10' : 'bg-emerald-100'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${modoOscuro ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`text-lg font-bold mb-2 ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
            Proceso completado
          </h3>
          <p className={`text-sm max-w-md mx-auto ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            Todos los alumnos han sido evaluados y las ofertas han sido procesadas. No hay alumnos convocados pendientes de selección final.
          </p>
        </div>
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
